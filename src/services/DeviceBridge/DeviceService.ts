// Device Bridge Service for ESP32/Daisy Communication
import type { 
  DeviceConnection, 
  DeviceInfo, 
  DeviceParameter, 
  RealTimeData, 
  DeviceEvent, 
  DeviceEventHandler,
  BluetoothOptions,
  SerialOptions,
  ParameterUpdate,
  DeviceMessage
} from './types';

export class DeviceService {
  private connections: Map<string, DeviceConnection> = new Map();
  private eventHandlers: Map<string, DeviceEventHandler<any>[]> = new Map();
  private parameters: Map<string, DeviceParameter> = new Map();
  private deviceInfo: DeviceInfo | null = null;
  
  // Serial port references for text command sending
  private serialPorts: Map<string, any> = new Map();
  private serialWriters: Map<string, WritableStreamDefaultWriter<Uint8Array>> = new Map();
  private serialReaders: Map<string, ReadableStreamDefaultReader<Uint8Array>> = new Map();
  
  // Text response buffer for parsing line-based responses
  private textResponseBuffer: string = '';
  
  // Track active read loops for cancellation
  private readLoopActive: Map<string, boolean> = new Map();
  
  // Default configuration
  private defaultBluetoothOptions: BluetoothOptions = {
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
    characteristicUUIDs: {
      parameters: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
      dataStream: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
      info: '6e400004-b5a3-f393-e0a9-e50e24dcca9e'
    },
    autoReconnect: true,
    reconnectDelay: 2000,
    timeout: 10000,
    bufferSize: 512
  };

  private defaultSerialOptions: SerialOptions = {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
    autoReconnect: true,
    reconnectDelay: 2000,
    timeout: 5000,
    bufferSize: 1024
  };

  constructor() {
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    // Initialize empty handler arrays for each event type
    const eventTypes = [
      'DEVICE_CONNECTED', 'DEVICE_DISCONNECTED', 'PARAMETER_CHANGED',
      'DATA_RECEIVED', 'CONNECTION_ERROR', 'DEVICE_INFO_RECEIVED'
    ];
    
    eventTypes.forEach(type => {
      this.eventHandlers.set(type, []);
    });
  }

  // Event Management
  addEventListener<T extends DeviceEvent>(
    eventType: T['type'], 
    handler: DeviceEventHandler<T>
  ): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  removeEventListener<T extends DeviceEvent>(
    eventType: T['type'], 
    handler: DeviceEventHandler<T>
  ): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  private emit<T extends DeviceEvent>(event: T): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));
  }

  // Connection Management
  async connectBluetooth(options?: Partial<BluetoothOptions>): Promise<string> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Web Bluetooth API not supported in this browser');
    }

    const config = { ...this.defaultBluetoothOptions, ...options };
    
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [config.serviceUUID] }],
        optionalServices: Object.values(config.characteristicUUIDs)
      });

      if (!device.gatt) {
        throw new Error('GATT not available on device');
      }

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(config.serviceUUID);
      
      const connection: DeviceConnection = {
        id: device.id || crypto.randomUUID(),
        type: 'bluetooth',
        name: device.name || 'Unknown Bluetooth Device',
        isConnected: true,
        lastSeen: new Date()
      };

      this.connections.set(connection.id, connection);
      
      // Setup characteristics for communication
      await this.setupBluetoothCommunication(service, config);
      
      this.emit({
        type: 'DEVICE_CONNECTED',
        payload: { connection }
      });

      return connection.id;
    } catch (error) {
      this.emit({
        type: 'CONNECTION_ERROR',
        payload: { error: `Bluetooth connection failed: ${error}` }
      });
      throw error;
    }
  }

  async connectSerial(options?: Partial<SerialOptions>): Promise<string> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser');
    }

    const config = { ...this.defaultSerialOptions, ...options };
    
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        flowControl: config.flowControl
      });

      const connection: DeviceConnection = {
        id: crypto.randomUUID(),
        type: 'serial',
        name: 'USB Serial Device',
        isConnected: true,
        lastSeen: new Date()
      };

      this.connections.set(connection.id, connection);
      
      // Store port reference for text commands
      this.serialPorts.set(connection.id, port);
      
      // Setup writer for sending commands
      const writer = port.writable.getWriter();
      this.serialWriters.set(connection.id, writer);
      
      // Setup serial communication
      await this.setupSerialCommunication(port, config, connection.id);
      
      this.emit({
        type: 'DEVICE_CONNECTED',
        payload: { connection }
      });
      
      // Sync parameter values from device
      await this.syncParametersFromDevice(connection.id);

      return connection.id;
    } catch (error) {
      this.emit({
        type: 'CONNECTION_ERROR',
        payload: { error: `Serial connection failed: ${error}` }
      });
      throw error;
    }
  }

  private async setupBluetoothCommunication(
    service: any, 
    config: BluetoothOptions
  ): Promise<void> {
    // Setup data stream characteristic for real-time data
    const dataCharacteristic = await service.getCharacteristic(
      config.characteristicUUIDs.dataStream
    );
    
    await dataCharacteristic.startNotifications();
    dataCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      const value = event.target.value;
      if (value) {
        this.handleIncomingData(new Uint8Array(value.buffer));
      }
    });

    // Setup parameter characteristic (for future parameter updates)
    await service.getCharacteristic(config.characteristicUUIDs.parameters);
    
    // Request device info
    await this.requestDeviceInfo();
  }

  private async setupSerialCommunication(
    port: any, 
    _config: SerialOptions,
    connectionId: string
  ): Promise<void> {
    const reader = port.readable.getReader();
    this.serialReaders.set(connectionId, reader);
    this.readLoopActive.set(connectionId, true);
    
    // Start reading loop
    this.startSerialReadLoop(reader, connectionId);
  }

  private async startSerialReadLoop(reader: any, connectionId: string): Promise<void> {
    const decoder = new TextDecoder();
    
    try {
      while (this.readLoopActive.get(connectionId)) {
        const { value, done } = await reader.read();
        if (done || !this.readLoopActive.get(connectionId)) break;
        
        // Handle as text response (line-based protocol)
        const text = decoder.decode(value, { stream: true });
        this.handleTextResponse(text, connectionId);
      }
    } catch (error: any) {
      // Only log if not a cancellation
      if (error?.name !== 'AbortError' && this.readLoopActive.get(connectionId)) {
        console.error('Serial read error:', error);
        // Handle disconnection
        const connection = this.connections.get(connectionId);
        if (connection?.isConnected) {
          connection.isConnected = false;
          this.emit({
            type: 'DEVICE_DISCONNECTED',
            payload: { connectionId }
          });
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // Reader may already be released
      }
      this.serialReaders.delete(connectionId);
    }
  }
  
  private handleTextResponse(text: string, _connectionId: string): void {
    // Accumulate text in buffer
    this.textResponseBuffer += text;
    
    // Process complete lines
    const lines = this.textResponseBuffer.split('\n');
    
    // Keep incomplete line in buffer
    this.textResponseBuffer = lines.pop() || '';
    
    // Process complete lines
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) continue;
      
      // Parse parameter responses (format: "param-name value")
      this.parseParameterResponse(trimmedLine);
    }
  }
  
  private parseParameterResponse(line: string): void {
    // Expected format: "param-name value" (e.g., "blur-attack 0.3000")
    const match = line.match(/^(blur-attack|blur-decay|osc-gain)\s+([\d.]+)/);
    if (match) {
      const [, paramId, valueStr] = match;
      const value = parseFloat(valueStr);
      
      if (!isNaN(value)) {
        // Update local parameter cache
        const param = this.parameters.get(paramId);
        if (param) {
          param.value = value;
        }
        
        // Emit parameter change event
        this.emit({
          type: 'PARAMETER_CHANGED',
          payload: { parameterId: paramId, value }
        });
      }
    }
  }

  private handleIncomingData(data: Uint8Array): void {
    try {
      // Parse the incoming binary data
      const message = this.parseBinaryMessage(data);
      
      switch (message.type) {
        case 'data_stream':
          this.emit({
            type: 'DATA_RECEIVED',
            payload: { data: message.payload as RealTimeData }
          });
          break;
          
        case 'info_response':
          this.deviceInfo = message.payload as DeviceInfo;
          this.updateParameters(this.deviceInfo.parameters);
          this.emit({
            type: 'DEVICE_INFO_RECEIVED',
            payload: { info: this.deviceInfo }
          });
          break;
          
        case 'parameter_update':
          const update = message.payload as ParameterUpdate;
          this.updateParameter(update.parameterId, update.value);
          this.emit({
            type: 'PARAMETER_CHANGED',
            payload: { parameterId: update.parameterId, value: update.value }
          });
          break;
      }
    } catch (error) {
      console.error('Error parsing incoming data:', error);
    }
  }

  private parseBinaryMessage(data: Uint8Array): DeviceMessage {
    // Simple binary protocol parsing
    // Format: [type:1][length:2][payload:length][checksum:1]
    const type = data[0];
    const length = (data[1] << 8) | data[2];
    const payload = data.slice(3, 3 + length);
    
    let messageType: DeviceMessage['type'];
    switch (type) {
      case 0x01: messageType = 'data_stream'; break;
      case 0x02: messageType = 'info_response'; break;
      case 0x03: messageType = 'parameter_update'; break;
      default: throw new Error(`Unknown message type: ${type}`);
    }
    
    return {
      type: messageType,
      payload: this.deserializePayload(messageType, payload),
      timestamp: Date.now()
    };
  }

  private deserializePayload(type: DeviceMessage['type'], data: Uint8Array): any {
    // Convert binary data to appropriate payload format
    switch (type) {
      case 'data_stream':
        // Parse real-time data (spectral data, envelopes, etc.)
        return this.parseRealTimeData(data);
      case 'info_response':
        // Parse device info
        return this.parseDeviceInfo(data);
      case 'parameter_update':
        // Parse parameter update
        return this.parseParameterUpdate(data);
      default:
        return data;
    }
  }

  private parseRealTimeData(data: Uint8Array): RealTimeData {
    // Parse 20-band spectral data + additional metrics
    const view = new DataView(data.buffer);
    let offset = 0;
    
    const timestamp = view.getUint32(offset, true);
    offset += 4;
    
    const spectralData: number[] = [];
    for (let i = 0; i < 20; i++) {
      spectralData.push(view.getFloat32(offset, true));
      offset += 4;
    }
    
    const cpuUsage = view.getFloat32(offset, true);
    offset += 4;
    
    const latency = view.getFloat32(offset, true);
    offset += 4;
    
    return {
      timestamp,
      spectralData,
      cpuUsage,
      latency
    };
  }

  private parseDeviceInfo(data: Uint8Array): DeviceInfo {
    // Parse device info from binary data
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(data);
    return JSON.parse(jsonStr);
  }

  private parseParameterUpdate(data: Uint8Array): ParameterUpdate {
    const view = new DataView(data.buffer);
    const paramIdLength = view.getUint8(0);
    const paramId = new TextDecoder().decode(data.slice(1, 1 + paramIdLength));
    const value = view.getFloat32(1 + paramIdLength, true);
    
    return { parameterId: paramId, value };
  }

  // Parameter Management
  async updateParameter(parameterId: string, value: number | boolean | string): Promise<void> {
    const parameter = this.parameters.get(parameterId);
    if (!parameter) {
      throw new Error(`Parameter ${parameterId} not found`);
    }
    
    // Validate value
    if (typeof value === 'number' && parameter.min !== undefined && value < parameter.min) {
      throw new Error(`Value ${value} below minimum ${parameter.min}`);
    }
    if (typeof value === 'number' && parameter.max !== undefined && value > parameter.max) {
      throw new Error(`Value ${value} above maximum ${parameter.max}`);
    }
    
    // Update local parameter
    parameter.value = value;
    this.parameters.set(parameterId, parameter);
    
    // Send to device
    await this.sendParameterUpdate(parameterId, value);
  }

  private async sendParameterUpdate(parameterId: string, value: number | boolean | string): Promise<void> {
    const message = this.createParameterMessage(parameterId, value);
    
    // Send via all connected devices
    for (const connection of this.connections.values()) {
      if (connection.isConnected) {
        await this.sendMessage(connection.id, message);
      }
    }
  }

  private createParameterMessage(parameterId: string, value: number | boolean | string): Uint8Array {
    const paramIdBytes = new TextEncoder().encode(parameterId);
    const valueBytes = new Float32Array([typeof value === 'number' ? value : value ? 1 : 0]);
    
    const message = new Uint8Array(1 + 1 + paramIdBytes.length + 4);
    message[0] = 0x10; // Parameter update message type
    message[1] = paramIdBytes.length;
    message.set(paramIdBytes, 2);
    message.set(new Uint8Array(valueBytes.buffer), 2 + paramIdBytes.length);
    
    return message;
  }

  private async sendMessage(connectionId: string, _data: Uint8Array): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Connection ${connectionId} not available`);
    }
    
    // Implementation depends on connection type
    // This would need to be completed with actual BLE/Serial sending logic
  }

  private async requestDeviceInfo(): Promise<void> {
    const message = new Uint8Array([0x20]); // Info request message type
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected) {
        await this.sendMessage(connection.id, message);
      }
    }
  }

  private updateParameters(parameters: DeviceParameter[]): void {
    parameters.forEach(param => {
      this.parameters.set(param.id, param);
    });
  }

  // Public API
  getConnections(): DeviceConnection[] {
    return Array.from(this.connections.values());
  }

  getParameters(): DeviceParameter[] {
    return Array.from(this.parameters.values());
  }

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = false;
      
      // Stop the read loop first
      this.readLoopActive.set(connectionId, false);
      
      // Cancel the reader to break out of the read loop
      const reader = this.serialReaders.get(connectionId);
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          // Reader may already be cancelled
        }
        this.serialReaders.delete(connectionId);
      }
      
      // Clean up writer
      const writer = this.serialWriters.get(connectionId);
      if (writer) {
        try {
          writer.releaseLock();
        } catch (e) {
          // Writer may already be released
        }
        this.serialWriters.delete(connectionId);
      }
      
      // Close the port
      const port = this.serialPorts.get(connectionId);
      if (port) {
        try {
          await port.close();
        } catch (e) {
          // Port may already be closed
        }
        this.serialPorts.delete(connectionId);
      }
      
      // Clean up read loop tracking
      this.readLoopActive.delete(connectionId);
      
      // Clear text buffer
      this.textResponseBuffer = '';
      
      this.connections.delete(connectionId);
      
      this.emit({
        type: 'DEVICE_DISCONNECTED',
        payload: { connectionId }
      });
    }
  }

  isConnected(): boolean {
    return Array.from(this.connections.values()).some(conn => conn.isConnected);
  }
  
  // ============================================
  // Text Command Interface for Serial Devices
  // ============================================
  
  /**
   * Send a text command to all connected serial devices
   * @param command The command string (without newline)
   */
  async sendTextCommand(command: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\n');
    
    for (const [connectionId, writer] of this.serialWriters.entries()) {
      const connection = this.connections.get(connectionId);
      if (connection?.isConnected) {
        try {
          await writer.write(data);
        } catch (error) {
          console.error(`Failed to send command to ${connectionId}:`, error);
        }
      }
    }
  }
  
  /**
   * Sync parameter values from the device (called on connect)
   */
  private async syncParametersFromDevice(connectionId: string): Promise<void> {
    // Initialize default parameters
    this.parameters.set('blur-attack', {
      id: 'blur-attack',
      name: 'Blur Attack',
      type: 'float',
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Blur attack time'
    });
    
    this.parameters.set('blur-decay', {
      id: 'blur-decay',
      name: 'Blur Decay',
      type: 'float',
      value: 0.1,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Blur decay time'
    });
    
    this.parameters.set('osc-gain', {
      id: 'osc-gain',
      name: 'Oscillator Gain',
      type: 'float',
      value: 0.9,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Base oscillator amplitude'
    });
    
    // Query current values from device
    const writer = this.serialWriters.get(connectionId);
    if (writer) {
      const encoder = new TextEncoder();
      // Send GET commands (no argument = get current value)
      await writer.write(encoder.encode('blur-attack\n'));
      await writer.write(encoder.encode('blur-decay\n'));
      await writer.write(encoder.encode('osc-gain\n'));
    }
  }
  
  // ============================================
  // High-Level Parameter Control Methods
  // ============================================
  
  /**
   * Set blur attack value (0-1)
   */
  async setBlurAttack(value: number): Promise<void> {
    const clampedValue = Math.max(0, Math.min(1, value));
    await this.sendTextCommand(`blur-attack ${clampedValue.toFixed(4)}`);
  }
  
  /**
   * Set blur decay value (0-1)
   */
  async setBlurDecay(value: number): Promise<void> {
    const clampedValue = Math.max(0, Math.min(1, value));
    await this.sendTextCommand(`blur-decay ${clampedValue.toFixed(4)}`);
  }
  
  /**
   * Set oscillator base gain (0-1)
   */
  async setOscillatorGain(value: number): Promise<void> {
    const clampedValue = Math.max(0, Math.min(1, value));
    await this.sendTextCommand(`osc-gain ${clampedValue.toFixed(4)}`);
  }
  
  /**
   * Get current parameter value from cache
   */
  getParameterValue(parameterId: string): number | null {
    const param = this.parameters.get(parameterId);
    if (param && typeof param.value === 'number') {
      return param.value;
    }
    return null;
  }
}