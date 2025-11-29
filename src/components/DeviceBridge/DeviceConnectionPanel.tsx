import React, { useState, useEffect } from 'react';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceConnection } from '../../services/DeviceBridge/types';
import { ConnectionStatus } from './ConnectionStatus';
import './DeviceConnectionPanel.css';

interface DeviceConnectionPanelProps {
  deviceService: DeviceService;
}

export const DeviceConnectionPanel: React.FC<DeviceConnectionPanelProps> = ({ 
  deviceService 
}) => {
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const handleDeviceConnected = () => {
      setConnections(deviceService.getConnections());
      setConnectionError(null);
      setIsConnecting(false);
    };

    const handleDeviceDisconnected = () => {
      setConnections(deviceService.getConnections());
    };

    const handleConnectionError = (event: any) => {
      setConnectionError(event.payload.error);
      setIsConnecting(false);
    };

    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);

    setConnections(deviceService.getConnections());

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('CONNECTION_ERROR', handleConnectionError);
    };
  }, [deviceService]);

  const handleSerialConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await deviceService.connectSerial();
    } catch {
      // Error handled by event listener
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await deviceService.disconnect(connectionId);
  };

  return (
    <div className="device-connection-panel">
      <div className="panel-header">
        <h3 className="panel-title">EISEI DEVICE BRIDGE</h3>
      </div>

      <div className="connection-section">
        <h4 className="section-title">CONNECTION</h4>
        
        {connections.length === 0 ? (
          <div className="connection-buttons">
            <button
              className="btn btn-primary connection-btn"
              onClick={handleSerialConnect}
              disabled={isConnecting}
              title="Connect via USB Serial"
            >
              {isConnecting ? 'CONNECTING...' : 'USB SERIAL'}
            </button>
          </div>
        ) : (
          <div className="active-connections">
            {connections.map(connection => (
              <ConnectionStatus
                key={connection.id}
                connection={connection}
                onDisconnect={() => handleDisconnect(connection.id)}
              />
            ))}
          </div>
        )}

        {connectionError && (
          <div className="connection-error">
            <p className="error-message">{connectionError}</p>
            <button 
              className="btn btn-ghost btn-small"
              onClick={() => setConnectionError(null)}
            >
              DISMISS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
