import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FirmwareSelector } from '../../components/FirmwareSelector';
import { DFUDevice, findDfuInterfaces } from './dfu-webdfu';

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

import '../ToolLayout.css';

interface SerialMessage {
  timestamp: Date;
  direction: 'in' | 'out';
  data: string;
  type: 'data' | 'info' | 'error';
}

export const DaisyFlasher: React.FC = () => {
  // Connection state
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

  // Full erase option
  const [fullErase, setFullErase] = useState(false);

  // DFU device ref
  const dfuDeviceRef = useRef<DFUDevice | null>(null);
  const serialPortRef = useRef<SerialPort | null>(null);
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

  // Connect to Daisy device via WebUSB
  const connectForFlashing = useCallback(async () => {
    if (!('usb' in navigator)) {
      setFlashStatus('WebUSB API not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request USB device with STM32 vendor ID
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0483 }, // STMicroelectronics
        ]
      });

      // Find DFU interface
      const interfaces = findDfuInterfaces(device);
      if (interfaces.length === 0) {
        throw new Error('No DFU interface found. Make sure device is in DFU mode.');
      }

      console.log('Found DFU interfaces:', interfaces);

      // List all interfaces for debugging
      interfaces.forEach((iface, index) => {
        console.log(`Interface ${index}: ${iface.name}, alt=${iface.alternate.alternateSetting}`);
      });

      // Use the first DFU interface (typically Flash interface)
      const dfuInterface = interfaces[0];
      const dfuDevice = new DFUDevice(device, dfuInterface);

      await dfuDevice.open();

      dfuDeviceRef.current = dfuDevice;
      setIsConnected(true);

      // Get device info
      const state = await dfuDevice.getState();
      console.log('DFU State:', state);

      setDeviceInfo(`Daisy Seed - ${dfuInterface.name || 'DFU Mode'}`);
      setFlashStatus('Connected to Daisy Seed. Ready to flash.');

    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      dfuDeviceRef.current = null;
    }
  }, []);

  // Connect for serial monitoring
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      addSerialMessage('out', 'Web Serial API not supported. Please use Chrome or Edge.', 'error');
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      serialPortRef.current = port;
      setSerialConnected(true);
      addSerialMessage('out', `Connected at ${baudRate} baud`, 'info');

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

      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
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

  // Flash firmware via DFU
  const flashFirmware = useCallback(async () => {
    if (!isConnected || !dfuDeviceRef.current) {
      setFlashStatus('Please connect to device first.');
      return;
    }

    const hasFirmware = firmwareSource === 'file' ? !!firmwareFile : !!firmwareBlob;
    if (!hasFirmware) {
      setFlashStatus('Please load firmware first.');
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting Daisy flash process...');

    try {
      const device = dfuDeviceRef.current;

      // Get firmware data
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

      console.log(`Flashing ${firmwareName}: ${firmwareData.byteLength} bytes`);

      // Clear any error status
      try {
        await device.clearStatus();
      } catch (e) {
        console.warn('Clear status failed, continuing...', e);
      }

      // Set up progress monitoring
      device.logProgress = (done: number, total: number) => {
        const percent = Math.round((done / total) * 100);
        setFlashProgress(percent);
        setFlashStatus(`Downloading... ${percent}% (${done} / ${total} bytes)`);
      };

      device.logInfo = (msg: string) => {
        console.log('DFU:', msg);
        setFlashStatus(msg);
      };

      device.logWarning = (msg: string) => {
        console.warn('DFU:', msg);
        setFlashStatus(`Warning: ${msg}`);
      };

      device.logError = (msg: string) => {
        console.error('DFU:', msg);
        setFlashStatus(`Error: ${msg}`);
      };

      device.logDebug = (msg: string) => {
        console.debug('DFU:', msg);
      };

      // Download firmware using the webdfu-compatible method
      await device.do_download(device.transferSize, firmwareData, true, fullErase);

      setFlashProgress(100);
      setFlashStatus('File downloaded successfully. Daisy will restart with new firmware.');

    } catch (error) {
      console.error('Flash error:', error);
      setFlashStatus(`Flash failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFlashing(false);
    }
  }, [isConnected, firmwareFile, firmwareBlob, firmwareSource, firmwareVersion, fullErase]);

  // Disconnect DFU
  const disconnectDFU = useCallback(async () => {
    if (dfuDeviceRef.current) {
      try {
        await dfuDeviceRef.current.close();
      } catch (e) {
        console.warn('DFU disconnect error:', e);
      }
      dfuDeviceRef.current = null;
      setIsConnected(false);
      setDeviceInfo('');
      setFlashStatus('Disconnected');
    }
  }, []);

  // Clear serial messages
  const clearMessages = useCallback(() => {
    setSerialMessages([]);
  }, []);

  // Main content using masonry layout
  const mainContent = (
    <div className="tool-columns">
      {/* Device Connection Card */}
      <Card>
        <CardHeader>Device Connection</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <Button
              onClick={isConnected ? disconnectDFU : connectForFlashing}
              variant={isConnected ? "secondary" : "primary"}
              disabled={isFlashing}
            >
              {isConnected ? 'Disconnect' : 'Connect Device'}
            </Button>
            <div style={{
              backgroundColor: 'var(--ds-color-background-tertiary)',
              padding: 'var(--ds-spacing-sm)',
              borderRadius: 'var(--ds-border-radius-md)',
              fontSize: 'var(--ds-font-size-sm)'
            }}>
              <p style={{ margin: '0 0 var(--ds-spacing-xs) 0', fontWeight: 'var(--ds-font-weight-medium)' }}>
                To enter Bootloader mode:
              </p>
              <ol style={{
                listStylePosition: 'inside',
                paddingLeft: 'var(--ds-spacing-md)',
                margin: 'var(--ds-spacing-xs) 0'
              }}>
                <li>RESET + BOOT</li>
                <li>Release RESET</li>
                <li>Release BOOT</li>
              </ol>
            </div>
            {deviceInfo && (
              <StatusIndicator variant="success">
                {deviceInfo}
              </StatusIndicator>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Firmware Selection Card */}
      <Card>
        <CardHeader>Firmware Selection</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <FirmwareSelector
              platform="daisy"
              onFirmwareLoad={handleFirmwareFromSelector}
              disabled={isFlashing}
            />

            <div>
              <h4 style={{ marginBottom: 'var(--ds-spacing-sm)' }}>Or upload custom firmware:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)' }}>
                  <span>Daisy Firmware (.bin)</span>
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".bin"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    disabled={isFlashing}
                  />
                </div>
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

      {/* Flash Process Card */}
      <Card>
        <CardHeader>Flash Process</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)' }}>
              <input
                type="checkbox"
                checked={fullErase}
                onChange={(e) => setFullErase(e.target.checked)}
                disabled={isFlashing}
              />
              Full erase (slower)
            </label>

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

      {/* Serial Monitor Card */}
      <Card>
        <CardHeader>Serial Monitor</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--ds-spacing-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <Select
                  label="Baud Rate"
                  value={baudRate.toString()}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  disabled={serialConnected}
                  options={[
                    { value: '9600', label: '9600' },
                    { value: '115200', label: '115200' },
                    { value: '230400', label: '230400' },
                    { value: '460800', label: '460800' },
                    { value: '921600', label: '921600' }
                  ]}
                />
              </div>
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

            <div className="tool-terminal">
              {serialMessages.length === 0 ? (
                <div className="tool-terminal-placeholder">No data received</div>
              ) : (
                serialMessages.map((message, index) => (
                  <div
                    key={index}
                    className="tool-terminal-line"
                    style={{
                      marginBottom: '2px',
                      color: message.type === 'error' ? 'var(--ds-color-error)' :
                        message.type === 'info' ? 'var(--ds-color-info)' :
                          message.direction === 'out' ? 'var(--ds-color-text-secondary)' : 'var(--ds-color-text-primary)'
                    }}
                  >
                    <span style={{ color: 'var(--ds-color-text-muted)', marginRight: '8px' }}>
                      {message.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span style={{ color: 'var(--ds-color-primary)', marginRight: '8px' }}>
                      {message.direction === 'in' ? '←' : '→'}
                    </span>
                    <span>{message.data}</span>
                  </div>
                ))
              )}
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
          </div>
        </CardBody>
      </Card>
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
        <span>Daisy Seed Flasher</span>
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
        single: mainContent
      }}
      statusBar={statusBar}
    />
  );
};