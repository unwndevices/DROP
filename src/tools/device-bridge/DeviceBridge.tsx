import React, { useState, useCallback, useEffect, useRef } from 'react';
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

// Debounce helper
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

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
  
  // Parameter states
  const [blurAttack, setBlurAttack] = useState(0.3);
  const [blurDecay, setBlurDecay] = useState(0.1);
  const [oscGain, setOscGain] = useState(0.9);
  
  // Track confirmed state for visual feedback
  const [confirmedParams, setConfirmedParams] = useState<Record<string, number | null>>({
    'blur-attack': null,
    'blur-decay': null,
    'osc-gain': null
  });

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
    
    const handleParameterChanged = (event: any) => {
      const { parameterId, value } = event.payload;
      
      // Update value
      switch (parameterId) {
        case 'blur-attack':
          setBlurAttack(value);
          break;
        case 'blur-decay':
          setBlurDecay(value);
          break;
        case 'osc-gain':
          setOscGain(value);
          break;
      }
      
      // Set confirmed state for visual feedback
      setConfirmedParams(prev => ({ ...prev, [parameterId]: value }));
      
      // Clear confirmed state after animation
      setTimeout(() => {
        setConfirmedParams(prev => ({ ...prev, [parameterId]: null }));
      }, 800);
    };

    // Register event listeners
    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
    deviceService.addEventListener('DATA_RECEIVED', handleDataReceived);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);
    deviceService.addEventListener('PARAMETER_CHANGED', handleParameterChanged);

    // Initial status update
    updateStatus();

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
      deviceService.removeEventListener('DATA_RECEIVED', handleDataReceived);
      deviceService.removeEventListener('CONNECTION_ERROR', handleConnectionError);
      deviceService.removeEventListener('PARAMETER_CHANGED', handleParameterChanged);
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

  // Debounced parameter update functions
  const debouncedSetBlurAttack = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setBlurAttack(value);
    }, [deviceService]),
    50
  );
  
  const debouncedSetBlurDecay = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setBlurDecay(value);
    }, [deviceService]),
    50
  );
  
  const debouncedSetOscGain = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setOscillatorGain(value);
    }, [deviceService]),
    50
  );

  // Parameter change handlers
  const handleBlurAttackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBlurAttack(value);
    debouncedSetBlurAttack(value);
  }, [debouncedSetBlurAttack]);
  
  const handleBlurDecayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBlurDecay(value);
    debouncedSetBlurDecay(value);
  }, [debouncedSetBlurDecay]);
  
  const handleOscGainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setOscGain(value);
    debouncedSetOscGain(value);
  }, [debouncedSetOscGain]);

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

  const isConnected = connectionCount > 0;
  
  // Parameter control component with amber styling
  const ParameterSlider: React.FC<{
    label: string;
    paramId: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled: boolean;
    confirmed: number | null;
  }> = ({ label, paramId, value, onChange, disabled, confirmed }) => {
    const isConfirmed = confirmed !== null;
    
    return (
      <div style={{ 
        marginBottom: '16px',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.2s'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}>
          <label style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </label>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: isConfirmed ? 'var(--color-amber)' : (disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)'),
            minWidth: '45px',
            textAlign: 'right',
            transition: 'color 0.2s',
            fontWeight: isConfirmed ? 600 : 400
          }}>
            {value.toFixed(2)}
            {isConfirmed && ' ✓'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            height: '6px',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: disabled ? 'var(--color-background-secondary)' : 'var(--color-background-tertiary)',
            borderRadius: '3px',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            accentColor: 'var(--color-amber)'
          }}
        />
      </div>
    );
  };

  // Create left panel (Device Connection + Parameter Controls)
  const leftPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
      <Card style={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader>Device Connection</CardHeader>
        <CardBody>
          <DeviceConnectionPanel deviceService={deviceService} />
        </CardBody>
      </Card>
      
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>Parameter Controls</span>
            {!isConnected && (
              <span style={{ 
                fontSize: '0.65rem', 
                color: 'var(--color-text-muted)',
                fontWeight: 400,
                textTransform: 'none',
                letterSpacing: 'normal'
              }}>
                Connect device to enable
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <ParameterSlider
            label="Blur Attack"
            paramId="blur-attack"
            value={blurAttack}
            onChange={handleBlurAttackChange}
            disabled={!isConnected}
            confirmed={confirmedParams['blur-attack']}
          />
          
          <ParameterSlider
            label="Blur Decay"
            paramId="blur-decay"
            value={blurDecay}
            onChange={handleBlurDecayChange}
            disabled={!isConnected}
            confirmed={confirmedParams['blur-decay']}
          />
          
          <ParameterSlider
            label="Oscillator Gain"
            paramId="osc-gain"
            value={oscGain}
            onChange={handleOscGainChange}
            disabled={!isConnected}
            confirmed={confirmedParams['osc-gain']}
          />
          
          {!isConnected && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'var(--color-background-secondary)',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-border-muted)'
            }}>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                margin: 0,
                lineHeight: 1.5
              }}>
                These controls will become active when a Daisy device is connected via USB serial.
              </p>
            </div>
          )}
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