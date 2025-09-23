import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FirmwareSelector } from '../../components/FirmwareSelector';
import { ESPLoader, Transport } from 'esptool-js';

// Import design system components
import { 
  ToolLayout, 
  Button, 
  Card, 
  CardHeader, 
  CardBody,
  Input,
  Select,
  StatusIndicator
} from '../../design-system';

interface SerialMessage {
  timestamp: Date;
  direction: 'in' | 'out';
  data: string;
  type: 'data' | 'info' | 'error';
}

export const ESP32Flasher: React.FC = () => {
  // Flashing state
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashStatus, setFlashStatus] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // Serial monitoring state
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const serialBufferRef = useRef<string>('');

  // Firmware handling
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Refs
  const portRef = useRef<SerialPort | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const espLoaderRef = useRef<ESPLoader | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [serialMessages, scrollToBottom]);

  // Add serial message
  const addSerialMessage = useCallback((direction: 'in' | 'out', data: string, type: 'data' | 'info' | 'error' = 'data') => {
    const message: SerialMessage = {
      timestamp: new Date(),
      direction,
      data: data.trim(),
      type
    };
    setSerialMessages(prev => [...prev, message]);
  }, []);

  // Connect to device for flashing
  const connectForFlashing = useCallback(async () => {
    if (!('serial' in navigator)) {
      setFlashStatus('Web Serial API not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request port but don't open it yet - let Transport handle the opening
      const port = await (navigator as any).serial.requestPort();
      
      // Create transport (it will handle the connection internally)
      const transport = new Transport(port);
      
      // Store references immediately
      portRef.current = port;
      transportRef.current = transport;
      setIsConnected(true);
      setFlashStatus('Connected successfully. Detecting chip...');

      // Try to get device info using esptool-js
      try {
        const esploader = new ESPLoader({
          transport: transport,
          baudrate: 115200,
          romBaudrate: 115200
        });

        const chip = await esploader.main();
        setDeviceInfo(`${chip} detected`);
        setFlashStatus('Device detected successfully. Ready to flash.');
        
        // Store the ESPLoader instance for reuse
        espLoaderRef.current = esploader;
        
        // Reset the chip to get back to normal state
        await esploader.after('hard_reset');
      } catch (error) {
        console.warn('Chip detection failed:', error);
        setDeviceInfo('ESP32 device connected (detection failed)');
        setFlashStatus('Connected successfully. Ready to flash.');
        
        // Create a basic ESPLoader instance for flashing even if detection failed
        const esploader = new ESPLoader({
          transport: transport,
          baudrate: 115200,
          romBaudrate: 115200
        });
        espLoaderRef.current = esploader;
      }
    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      portRef.current = null;
      transportRef.current = null;
      espLoaderRef.current = null;
    }
  }, []);

  // Connect for serial monitoring
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      addSerialMessage('out', 'Web Serial API not supported. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      let port: SerialPort;
      
      // If we already have a connected port from flashing, reuse it
      if (portRef.current && isConnected) {
        port = portRef.current;
        addSerialMessage('out', `Reusing existing connection at ${baudRate} baud`, 'info');
      } else {
        // Request new port and open it
        port = await (navigator as any).serial.requestPort();
        await port.open({
          baudRate: baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          flowControl: 'none'
        });
        portRef.current = port;
        addSerialMessage('out', `Connected at ${baudRate} baud`, 'info');
      }

      setSerialConnected(true);

      // Start reading
      const reader = port.readable.getReader();
      readerRef.current = reader;

      const writer = port.writable.getWriter();
      writerRef.current = writer;

      // Read loop
      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            
            // Add to buffer
            serialBufferRef.current += text;
            
            // Process complete lines
            const lines = serialBufferRef.current.split(/\r?\n/);
            serialBufferRef.current = lines.pop() || ''; // Keep incomplete line in buffer
            
            // Display each complete line
            for (const line of lines) {
              if (line.trim()) {
                addSerialMessage('in', line);
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'NetworkError') {
            addSerialMessage('in', `Read error: ${error.message}`, 'error');
          }
        }
      };

      readLoop();
    } catch (error) {
      addSerialMessage('out', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [baudRate, addSerialMessage, serialConnected]);

  // Disconnect serial
  const disconnectSerial = useCallback(async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }

      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }

      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }

      setSerialConnected(false);
      addSerialMessage('out', 'Disconnected', 'info');
    } catch (error) {
      addSerialMessage('out', `Disconnect error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [addSerialMessage]);

  // Send serial data
  const sendSerial = useCallback(async () => {
    if (!writerRef.current || !serialInput.trim()) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(serialInput + '\r\n');
      await writerRef.current.write(data);
      addSerialMessage('out', serialInput);
      setSerialInput('');
    } catch (error) {
      addSerialMessage('out', `Send error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [serialInput, addSerialMessage]);

  // Handle firmware from selector
  const handleFirmwareFromSelector = useCallback((binary: Blob, version: string) => {
    setFirmwareBlob(binary);
    setFirmwareVersion(version);
    setFirmwareFile(null);
    setFirmwareSource('selector');
    setFlashStatus(`Loaded firmware ${version} from repository. Ready to flash.`);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    setFirmwareFile(file);
    setFirmwareBlob(null);
    setFirmwareVersion('');
    setFirmwareSource('file');
  }, []);


  // Flash firmware
  const flashFirmware = useCallback(async () => {
    if (!isConnected || !espLoaderRef.current) {
      setFlashStatus('Please connect to device first.');
      return;
    }

    const hasFirmware = firmwareSource === 'file' ? !!firmwareFile : !!firmwareBlob;
    if (!hasFirmware) {
      setFlashStatus('Please load firmware first (either from repository or file).');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting ESP32 flash process...');

    try {
      // Get the firmware data
      let firmwareData: ArrayBuffer;
      const firmwareName = firmwareSource === 'file' 
        ? firmwareFile!.name 
        : `firmware ${firmwareVersion}`;

      if (firmwareSource === 'file' && firmwareFile) {
        firmwareData = await firmwareFile.arrayBuffer();
      } else if (firmwareBlob) {
        firmwareData = await firmwareBlob.arrayBuffer();
      } else {
        throw new Error('No firmware data available');
      }

      setFlashStatus('Preparing ESP32 for flashing...');
      setFlashProgress(5);

      // Disconnect the old transport cleanly
      setFlashStatus('Preparing connection for flashing...');
      if (transportRef.current) {
        try {
          await transportRef.current.disconnect();
        } catch (e) {
          console.warn('Transport disconnect warning:', e);
        }
      }

      // Create a fresh transport and loader for flashing  
      const port = portRef.current!;
      const transport = new Transport(port);
      const esploader = new ESPLoader({
        transport: transport,
        baudrate: 115200,
        romBaudrate: 115200
      });

      // Connect and sync with the chip for flashing
      setFlashStatus('Connecting to chip for flashing...');
      await esploader.main();
      setFlashProgress(15);
      
      // Update references
      transportRef.current = transport;
      
      // Change baud rate for faster flashing
      setFlashStatus('Changing baudrate for faster flashing...');
      await esploader.changeBaud();
      setFlashProgress(25);

      // Flash the firmware using writeFlash
      setFlashStatus(`Flashing ${firmwareName} (${(firmwareData.byteLength / 1024).toFixed(1)} KB)...`);
      
      // Convert ArrayBuffer to string for esptool-js
      const uint8Array = new Uint8Array(firmwareData);
      let dataString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        dataString += String.fromCharCode(uint8Array[i]);
      }

      // For simplicity and compatibility with other flashers, always flash at 0x0
      // This matches the behavior of most ESP32 web flashers
      const flashAddress = 0x0;

      const fileArray = [{
        data: dataString,
        address: flashAddress
      }];

      setFlashStatus(`Flashing ${firmwareName} at 0x${flashAddress.toString(16).toUpperCase()}...`);

      // For ESP32-S3, we know it has 8MB flash from the detection logs
      // Let's be explicit about this to match what esptool detected
      const detectedFlashSize = '8MB';
      setFlashStatus(`Using ${detectedFlashSize} flash size, starting write...`);

      await esploader.writeFlash({
        fileArray: fileArray,
        flashSize: detectedFlashSize,
        flashMode: 'dio',
        flashFreq: '40m',  // More conservative frequency
        eraseAll: true,    // Erase all flash before writing - matches other flashers
        compress: true,
        // Progress callback
        reportProgress: (_fileIndex, written, total) => {
          const progress = 25 + (written / total) * 65; // 25% to 90%
          setFlashProgress(progress);
        }
      });

      setFlashProgress(90);
      setFlashStatus('Resetting chip...');
      
      // Reset the chip
      await esploader.after('hard_reset');
      setFlashProgress(100);
      
      setFlashStatus('Flash completed successfully! Device is resetting...');

    } catch (error) {
      console.error('Flash error:', error);
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
      // Don't disconnect here - user might want to use serial monitor
    }
  }, [isConnected, firmwareFile, firmwareBlob, firmwareSource, firmwareVersion]);

  // Clear serial messages
  const clearMessages = useCallback(() => {
    setSerialMessages([]);
  }, []);

  // Create left panel (ESP32 Flasher)
  const leftPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
      <Card>
        <CardHeader>Device Connection</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <Button
              onClick={connectForFlashing}
              variant={isConnected ? "success" : "primary"}
              disabled={isFlashing}
            >
              {isConnected ? 'Connected' : 'Connect Device'}
            </Button>
            {deviceInfo && (
              <StatusIndicator variant="success">
                {deviceInfo}
              </StatusIndicator>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Firmware Selection</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <FirmwareSelector
              platform="esp32"
              onFirmwareLoad={handleFirmwareFromSelector}
              disabled={isFlashing}
            />
            
            <div>
              <h4 style={{ marginBottom: 'var(--ds-spacing-sm)' }}>Or upload custom firmware:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)' }}>
                  <span>ESP32 Firmware @ 0x0</span>
                </div>
                <input
                  type="file"
                  accept=".bin"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  disabled={isFlashing}
                  style={{ padding: 'var(--ds-spacing-sm)' }}
                />
                {firmwareFile && (
                  <StatusIndicator variant="info">
                    {firmwareFile.name} ({(firmwareFile.size / 1024).toFixed(1)} KB)
                  </StatusIndicator>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Flash Process</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <Button
              onClick={flashFirmware}
              variant="primary"
              disabled={!isConnected || (!firmwareFile && !firmwareBlob) || isFlashing}
            >
              {isFlashing ? 'Flashing...' : 'Flash Firmware'}
            </Button>

            {isFlashing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-xs)' }}>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: 'var(--ds-color-background-tertiary)', 
                  borderRadius: 'var(--ds-border-radius-sm)',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{ 
                      width: `${flashProgress}%`, 
                      height: '100%', 
                      backgroundColor: 'var(--ds-color-primary)',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: 'var(--ds-font-size-sm)', textAlign: 'center' }}>
                  {flashProgress.toFixed(0)}%
                </span>
              </div>
            )}

            {flashStatus && (
              <StatusIndicator 
                variant={
                  flashStatus.includes('failed') || flashStatus.includes('error') ? 'error' : 
                  flashStatus.includes('success') ? 'success' : 'info'
                }
              >
                {flashStatus}
              </StatusIndicator>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );

  // Create right panel (Serial Monitor)
  const rightPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <CardHeader>Serial Monitor</CardHeader>
        <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--ds-spacing-md)', alignItems: 'flex-end' }}>
            <Select
              label="Baud Rate"
              value={baudRate.toString()}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={serialConnected}
              options={[
                { value: '9600', label: '9600' },
                { value: '19200', label: '19200' },
                { value: '38400', label: '38400' },
                { value: '57600', label: '57600' },
                { value: '115200', label: '115200' },
                { value: '230400', label: '230400' },
                { value: '460800', label: '460800' },
                { value: '921600', label: '921600' }
              ]}
            />
            <Button
              onClick={serialConnected ? disconnectSerial : connectSerial}
              variant={serialConnected ? "secondary" : "primary"}
            >
              {serialConnected ? 'Disconnect' : 'Connect'}
            </Button>
            <Button onClick={clearMessages} variant="secondary">
              Clear
            </Button>
          </div>

          <div style={{ 
            flex: 1, 
            border: '1px solid var(--ds-color-border-muted)', 
            borderRadius: 'var(--ds-border-radius-md)',
            backgroundColor: 'var(--ds-color-background-secondary)',
            padding: 'var(--ds-spacing-sm)',
            overflow: 'auto',
            fontFamily: 'var(--ds-font-mono)',
            fontSize: 'var(--ds-font-size-sm)'
          }}>
            {serialMessages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 'var(--ds-spacing-sm)',
                  marginBottom: 'var(--ds-spacing-xs)',
                  color: message.type === 'error' ? 'var(--ds-color-error)' : 
                         message.type === 'info' ? 'var(--ds-color-info)' : 
                         message.direction === 'out' ? 'var(--ds-color-text-secondary)' : 'var(--ds-color-text-primary)'
                }}
              >
                <span style={{ color: 'var(--ds-color-text-muted)', fontSize: 'var(--ds-font-size-xs)' }}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
                <span style={{ color: 'var(--ds-color-primary)' }}>
                  {message.direction === 'in' ? '←' : '→'}
                </span>
                <span>{message.data}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--ds-spacing-sm)' }}>
            <Input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendSerial()}
              placeholder="Enter command..."
              disabled={!serialConnected}
              style={{ flex: 1 }}
            />
            <Button
              onClick={sendSerial}
              disabled={!serialConnected || !serialInput.trim()}
              variant="primary"
            >
              Send
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
        <span>ESP32 Flasher</span>
        {isConnected && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Device: {deviceInfo || 'Connected'}
          </span>
        )}
        {serialConnected && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Serial: {baudRate} baud
          </span>
        )}
        {isFlashing && (
          <span style={{ color: 'var(--ds-color-warning)' }}>
            Flashing: {flashProgress.toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <span>{isFlashing ? 'Flashing' : isConnected || serialConnected ? 'Connected' : 'Ready'}</span>
      </div>
    </div>
  );

  return (
    <ToolLayout
      panels={{
        left: leftPanel,
        right: rightPanel
      }}
      statusBar={statusBar}
    />
  );
};