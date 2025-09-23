import React, { useState, useCallback, useEffect } from 'react';
import { DeviceConnectionPanel, RealTimeDataChart } from '../../components/DeviceBridge';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceInfo, RealTimeData } from '../../services/DeviceBridge/types';

// Import design system components
import { 
  ToolLayout, 
  Card, 
  CardHeader, 
  CardBody
} from '../../design-system';

// Singleton DeviceService instance
let deviceServiceInstance: DeviceService | null = null;
const getDeviceService = (): DeviceService => {
  if (!deviceServiceInstance) {
    deviceServiceInstance = new DeviceService();
  }
  return deviceServiceInstance;
};

export const DeviceBridge: React.FC = () => {
  const [deviceService] = useState(() => getDeviceService());
  const [connectionCount, setConnectionCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('No devices connected');

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      const connections = deviceService.getConnections();
      const connectedCount = connections.filter(conn => conn.isConnected).length;
      setConnectionCount(connectedCount);
      
      if (connectedCount === 0) {
        setStatusMessage('No devices connected');
      } else if (connectedCount === 1) {
        setStatusMessage(`1 device connected`);
      } else {
        setStatusMessage(`${connectedCount} devices connected`);
      }
    };

    const handleDeviceConnected = () => {
      updateStatus();
      console.log('DROP Device Bridge: Device connected');
    };

    const handleDeviceDisconnected = () => {
      updateStatus();
      console.log('DROP Device Bridge: Device disconnected');
    };

    const handleDeviceInfo = (event: any) => {
      const info: DeviceInfo = event.payload.info;
      setDeviceInfo(info);
      console.log('DROP Device Bridge: Device info received:', info);
    };

    const handleDataReceived = (event: any) => {
      // Extract data for timestamp tracking (processing handled by RealTimeDataChart)
      event.payload.data as RealTimeData;
      setLastDataUpdate(new Date());
    };

    const handleConnectionError = (event: any) => {
      console.error('DROP Device Bridge: Connection error:', event.payload.error);
      setStatusMessage(`Connection error: ${event.payload.error}`);
    };

    // Register event listeners
    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
    deviceService.addEventListener('DATA_RECEIVED', handleDataReceived);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);

    // Initial status update
    updateStatus();

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
      deviceService.removeEventListener('DATA_RECEIVED', handleDataReceived);
      deviceService.removeEventListener('CONNECTION_ERROR', handleConnectionError);
    };
  }, [deviceService]);

  // Check browser compatibility
  const checkBrowserSupport = useCallback(() => {
    const support = {
      bluetooth: 'bluetooth' in navigator,
      serial: 'serial' in navigator,
    };
    
    if (!support.bluetooth && !support.serial) {
      setStatusMessage('Browser does not support Web Bluetooth or Web Serial APIs');
    }
    
    return support;
  }, []);

  useEffect(() => {
    checkBrowserSupport();
  }, [checkBrowserSupport]);

  const formatLastUpdate = () => {
    if (!lastDataUpdate) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastDataUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return 'Over 1h ago';
  };

  // Create left panel (Device Connection)
  const leftPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader>Device Connection</CardHeader>
        <CardBody style={{ flex: 1 }}>
          <DeviceConnectionPanel deviceService={deviceService} />
        </CardBody>
      </Card>
    </div>
  );

  // Create right panel (Real-Time Data)
  const rightPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardHeader>Real-Time Data</CardHeader>
        <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {connectionCount === 0 ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              padding: 'var(--ds-spacing-xl)'
            }}>
              <div>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--ds-spacing-md)' }}>📡</div>
                <h3 style={{ marginBottom: 'var(--ds-spacing-sm)' }}>No Device Connected</h3>
                <p style={{ 
                  color: 'var(--ds-color-text-secondary)', 
                  marginBottom: 'var(--ds-spacing-lg)',
                  maxWidth: '400px'
                }}>
                  Connect your Eisei device to see real-time spectral data, 
                  performance metrics, and interactive parameter controls.
                </p>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ marginBottom: 'var(--ds-spacing-sm)' }}>Supported Devices:</h4>
                  <ul style={{ 
                    color: 'var(--ds-color-text-secondary)',
                    paddingLeft: 'var(--ds-spacing-lg)'
                  }}>
                    <li>Eisei ESP32-S3 Audio Processor</li>
                    <li>Eisei Daisy Seed Audio Engine</li>
                    <li>Custom hardware with compatible protocol</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <RealTimeDataChart 
                deviceService={deviceService}
                className="main-chart"
              />
            </div>
          )}
        </CardBody>
      </Card>

      {deviceInfo && (
        <Card>
          <CardHeader>Device Capabilities</CardHeader>
          <CardBody>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 'var(--ds-spacing-xs)' 
            }}>
              {deviceInfo.capabilities.map((capability, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: 'var(--ds-spacing-xs) var(--ds-spacing-sm)',
                    backgroundColor: 'var(--ds-color-background-tertiary)',
                    border: '1px solid var(--ds-color-border-muted)',
                    borderRadius: 'var(--ds-border-radius-sm)',
                    fontSize: 'var(--ds-font-size-xs)',
                    color: 'var(--ds-color-text-secondary)'
                  }}
                >
                  {capability}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
        <span>Device Bridge</span>
        {connectionCount > 0 && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Status: {statusMessage}
          </span>
        )}
        {deviceInfo && (
          <span style={{ color: 'var(--ds-color-success)' }}>
            Device: {deviceInfo.name} v{deviceInfo.version}
          </span>
        )}
        {lastDataUpdate && (
          <span style={{ color: 'var(--ds-color-info)' }}>
            Data: {formatLastUpdate()}
          </span>
        )}
      </div>
      <div>
        <span>{connectionCount > 0 ? 'Connected' : 'Ready'}</span>
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