// Device Bridge Types for Eisei Communication

export interface DeviceParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'enum';
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // for enum types
  unit?: string;
  description?: string;
}

export interface DeviceConnection {
  id: string;
  type: 'bluetooth' | 'serial';
  name: string;
  isConnected: boolean;
  lastSeen?: Date;
  signal?: number; // signal strength for bluetooth
}

export interface DeviceInfo {
  name: string;
  version: string;
  capabilities: string[];
  parameters: DeviceParameter[];
}

export interface RealTimeData {
  timestamp: number;
  spectralData?: number[]; // 20-band spectral data
  envelopes?: number[];
  cpuUsage?: number;
  latency?: number;
  customData?: Record<string, number>;
}

export interface DeviceMessage {
  type: 'parameter_update' | 'data_stream' | 'info_request' | 'info_response';
  payload: any;
  timestamp: number;
}

export interface ParameterUpdate {
  parameterId: string;
  value: number | boolean | string;
}

export interface ConnectionOptions {
  autoReconnect: boolean;
  reconnectDelay: number; // milliseconds
  timeout: number; // milliseconds
  bufferSize: number;
}

export interface BluetoothOptions extends ConnectionOptions {
  serviceUUID: string;
  characteristicUUIDs: {
    parameters: string;
    dataStream: string;
    info: string;
  };
}

export interface SerialOptions extends ConnectionOptions {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware';
}

export type DeviceEvent = 
  | { type: 'DEVICE_CONNECTED'; payload: { connection: DeviceConnection } }
  | { type: 'DEVICE_DISCONNECTED'; payload: { connectionId: string } }
  | { type: 'PARAMETER_CHANGED'; payload: { parameterId: string; value: any } }
  | { type: 'DATA_RECEIVED'; payload: { data: RealTimeData } }
  | { type: 'CONNECTION_ERROR'; payload: { error: string; connectionId?: string } }
  | { type: 'DEVICE_INFO_RECEIVED'; payload: { info: DeviceInfo } }
  | { type: 'TEXT_RECEIVED'; payload: { line: string } };

export type DeviceEventHandler<T extends DeviceEvent> = (event: T) => void;