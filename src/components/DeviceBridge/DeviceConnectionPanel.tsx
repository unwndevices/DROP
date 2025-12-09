import React, { useState, useEffect } from 'react';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceConnection } from '../../services/DeviceBridge/types';
import { ConnectionStatus } from './ConnectionStatus';
import { Button, useToast } from '../../design-system';
import './DeviceConnectionPanel.css';

interface DeviceConnectionPanelProps {
  deviceService: DeviceService;
}

export const DeviceConnectionPanel: React.FC<DeviceConnectionPanelProps> = ({
  deviceService
}) => {
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { error: showError } = useToast();

  useEffect(() => {
    const handleDeviceConnected = () => {
      setConnections(deviceService.getConnections());
      setIsConnecting(false);
    };

    const handleDeviceDisconnected = () => {
      setConnections(deviceService.getConnections());
    };

    const handleConnectionError = (event: any) => {
      showError(event.payload.error, 'Connection Error');
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
  }, [deviceService, showError]);

  const handleSerialConnect = async () => {
    setIsConnecting(true);

    try {
      await deviceService.connectSerial();
    } catch (error) {
      // Reset connecting state if error wasn't handled by event
      setIsConnecting(false);
      if (error instanceof Error) {
        showError(error.message, 'Connection Failed');
      }
    }
  };

  const handleBluetoothConnect = async () => {
    setIsConnecting(true);

    try {
      await deviceService.connectBluetooth();
    } catch (error) {
      // Reset connecting state if error wasn't handled by event
      setIsConnecting(false);
      if (error instanceof Error) {
        // User cancelled is not an error worth showing
        if (!error.message.includes('cancelled') && !error.message.includes('canceled')) {
          showError(error.message, 'Connection Failed');
        }
      }
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await deviceService.disconnect(connectionId);
  };

  return (
    <div className="device-connection-content">
      {connections.length === 0 ? (
        <div className="connection-buttons">
          <Button
            variant="primary"
            onClick={handleSerialConnect}
            disabled={isConnecting}
            loading={isConnecting}
            title="Connect via USB Serial"
            className="connection-btn"
          >
            USB SERIAL
          </Button>
          <Button
            variant="primary"
            onClick={handleBluetoothConnect}
            disabled={isConnecting}
            loading={isConnecting}
            title="Connect via Bluetooth (ESP32)"
            className="connection-btn"
          >
            BLUETOOTH
          </Button>
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
    </div>
  );
};
