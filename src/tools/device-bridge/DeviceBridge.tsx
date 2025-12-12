import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceConnectionPanel, ParameterControl } from '../../components/DeviceBridge';
import { DeviceService } from '../../services/DeviceBridge/DeviceService';
import type { DeviceInfo } from '../../services/DeviceBridge/types';

// Import design system components
import {
  ToolLayout,
  Card,
  CardHeader,
  CardBody,
  Button
} from '../../design-system';

import './DeviceBridge.css';

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
  const [statusMessage, setStatusMessage] = useState<string>('No devices connected');

  // Parameter states
  const [blurAttack, setBlurAttack] = useState(0.3);
  const [blurDecay, setBlurDecay] = useState(0.1);
  const [oscGain, setOscGain] = useState(0.9);
  const [resonance, setResonance] = useState(1.0);
  const [tapeDrive, setTapeDrive] = useState(0.5);
  const [tapeHyst, setTapeHyst] = useState(0.5);
  const [bandwidth, setBandwidth] = useState(1.0);
  const [oscShape, setOscShape] = useState('square');
  const [windowFalloff, setWindowFalloff] = useState(0.5);
  const [interpolation, setInterpolation] = useState('linear');
  const [terminalLog, setTerminalLog] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  const appendLog = useCallback((line: string) => {
    setTerminalLog((prev) => {
      const next = [...prev, line];
      const maxLines = 200;
      if (next.length > maxLines) {
        return next.slice(next.length - maxLines);
      }
      return next;
    });
  }, []);

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
        case 'resonance':
          setResonance(value);
          break;
        case 'tape-drive':
          setTapeDrive(value);
          break;
        case 'tape-hyst':
          setTapeHyst(value);
          break;
        case 'bandwidth':
          setBandwidth(value);
          break;
        case 'interpolation':
          // Convert numeric value to string representation
          {
            if (typeof value === 'string') {
              setInterpolation(value);
            } else {
              const interpolationTypes = ['linear', 'cosine', 'cubic'];
              const interpIndex = Math.round(value);
              setInterpolation(interpolationTypes[interpIndex] || 'linear');
            }
          }
          break;
        case 'osc-shape':
          setOscShape(typeof value === 'string' ? value : (value === 0 ? 'square' : 'saw'));
          break;
        case 'window-falloff':
          setWindowFalloff(value);
          break;
      }
    };

    // Register event listeners
    deviceService.addEventListener('DEVICE_CONNECTED', handleDeviceConnected);
    deviceService.addEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
    deviceService.addEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
    deviceService.addEventListener('CONNECTION_ERROR', handleConnectionError);
    deviceService.addEventListener('PARAMETER_CHANGED', handleParameterChanged);

    // Initial status update
    updateStatus();

    return () => {
      deviceService.removeEventListener('DEVICE_CONNECTED', handleDeviceConnected);
      deviceService.removeEventListener('DEVICE_DISCONNECTED', handleDeviceDisconnected);
      deviceService.removeEventListener('DEVICE_INFO_RECEIVED', handleDeviceInfo);
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

  useEffect(() => {
    const handleTextReceived = (event: any) => {
      appendLog(event.payload.line);
    };

    deviceService.addEventListener('TEXT_RECEIVED', handleTextReceived);

    return () => {
      deviceService.removeEventListener('TEXT_RECEIVED', handleTextReceived);
    };
  }, [deviceService, appendLog]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLog]);

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

  const debouncedSetResonance = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setResonance(value);
    }, [deviceService]),
    50
  );

  const debouncedSetTapeDrive = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setTapeDrive(value);
    }, [deviceService]),
    50
  );

  const debouncedSetTapeHyst = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setTapeHyst(value);
    }, [deviceService]),
    50
  );

  const debouncedSetBandwidth = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setBandwidth(value);
    }, [deviceService]),
    50
  );

  const debouncedSetInterpolation = useDebouncedCallback(
    useCallback((value: string) => {
      deviceService.setInterpolation(value);
    }, [deviceService]),
    50
  );

  const debouncedSetOscShape = useDebouncedCallback(
    useCallback((value: string) => {
      deviceService.setOscillatorShape(value);
    }, [deviceService]),
    50
  );

  const debouncedSetWindowFalloff = useDebouncedCallback(
    useCallback((value: number) => {
      deviceService.setWindowFalloff(value);
    }, [deviceService]),
    50
  );

  // Parameter change handlers
  const handleBlurAttackChange = useCallback((value: number) => {
    setBlurAttack(value);
    debouncedSetBlurAttack(value);
  }, [debouncedSetBlurAttack]);

  const handleBlurDecayChange = useCallback((value: number) => {
    setBlurDecay(value);
    debouncedSetBlurDecay(value);
  }, [debouncedSetBlurDecay]);

  const handleOscGainChange = useCallback((value: number) => {
    setOscGain(value);
    debouncedSetOscGain(value);
  }, [debouncedSetOscGain]);

  const handleResonanceChange = useCallback((value: number) => {
    setResonance(value);
    debouncedSetResonance(value);
  }, [debouncedSetResonance]);

  const handleTapeDriveChange = useCallback((value: number) => {
    setTapeDrive(value);
    debouncedSetTapeDrive(value);
  }, [debouncedSetTapeDrive]);

  const handleTapeHystChange = useCallback((value: number) => {
    setTapeHyst(value);
    debouncedSetTapeHyst(value);
  }, [debouncedSetTapeHyst]);

  const handleBandwidthChange = useCallback((value: number) => {
    setBandwidth(value);
    debouncedSetBandwidth(value);
  }, [debouncedSetBandwidth]);

  const handleInterpolationChange = useCallback((value: string) => {
    setInterpolation(value);
    debouncedSetInterpolation(value);
  }, [debouncedSetInterpolation]);

  const handleOscShapeChange = useCallback((value: string) => {
    setOscShape(value);
    debouncedSetOscShape(value);
  }, [debouncedSetOscShape]);

  const handleWindowFalloffChange = useCallback((value: number) => {
    setWindowFalloff(value);
    debouncedSetWindowFalloff(value);
  }, [debouncedSetWindowFalloff]);

  const handleGetCalibration = useCallback(() => {
    appendLog('> get calibration');
    deviceService.sendTextCommand('get calibration');
  }, [deviceService, appendLog]);

  const handleGetAnalog = useCallback(() => {
    appendLog('> get analog');
    deviceService.sendTextCommand('get analog');
  }, [deviceService, appendLog]);

  const handleGetLens = useCallback(() => {
    appendLog('> get lens');
    deviceService.sendTextCommand('get lens');
  }, [deviceService, appendLog]);

  const handleGetFreq = useCallback(() => {
    appendLog('> get freq');
    deviceService.sendTextCommand('get freq');
  }, [deviceService, appendLog]);

  const isConnected = connectionCount > 0;

  // Main panel (Device Connection + Parameter Controls in column flow)
  const mainPanel = (
    <div className="device-bridge-columns">

      <Card className="device-connection-card">
        <CardHeader>Device Connection</CardHeader>
        <CardBody>
          <DeviceConnectionPanel deviceService={deviceService} />
        </CardBody>
      </Card>
      <Card className="device-bridge-serial-card">
        <CardHeader>GET</CardHeader>
        <CardBody>
          <div className="device-bridge-serial-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={handleGetCalibration}
              disabled={!isConnected}
            >
              Calibration
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGetAnalog}
              disabled={!isConnected}
            >
              Analog
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGetLens}
              disabled={!isConnected}
            >
              Lens
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGetFreq}
              disabled={!isConnected}
            >
              Freq
            </Button>
          </div>
          <div className="device-bridge-terminal" ref={terminalRef}>
            {terminalLog.length === 0 ? (
              <div className="device-bridge-terminal-placeholder">No data yet</div>
            ) : (
              terminalLog.map((line, idx) => (
                <div key={`${idx}-${line}`} className="device-bridge-terminal-line">
                  {line}
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Blur Attack</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'blur-attack',
              name: 'Blur Attack',
              type: 'float',
              value: blurAttack,
              min: 0,
              max: 1,
              step: 0.001,
              description: "Controls the attack time of the blur effect envelope"
            }}
            onChange={(val) => handleBlurAttackChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Blur Decay</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'blur-decay',
              name: 'Blur Decay',
              type: 'float',
              value: blurDecay,
              min: 0,
              max: 1,
              step: 0.001,
              description: "Sets the decay rate for the blur effect over time"
            }}
            onChange={(val) => handleBlurDecayChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Resonance</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'resonance',
              name: 'Resonance',
              type: 'float',
              value: resonance,
              min: 0.1,
              max: 4.0,
              step: 0.001,
              description: "Adjusts the resonant frequency emphasis of the filter"
            }}
            onChange={(val) => handleResonanceChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Oscillator Gain</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'osc-gain',
              name: 'Oscillator Gain',
              type: 'float',
              value: oscGain,
              min: 0,
              max: 1,
              step: 0.001,
              description: "Master output level for the oscillator module"
            }}
            onChange={(val) => handleOscGainChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>



      <Card className={`device-bridge-parameters ${!isConnected ? 'interpolation-disabled' : ''}`}>
        <CardHeader>Oscillator Shape</CardHeader>
        <CardBody>
          <div className="interpolation-button-group">
            <Button
              variant={oscShape === 'square' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleOscShapeChange('square')}
              disabled={!isConnected}
              className={oscShape === 'square' ? 'interpolation-button-active' : ''}
            >
              Square
            </Button>
            <Button
              variant={oscShape === 'saw' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleOscShapeChange('saw')}
              disabled={!isConnected}
              className={oscShape === 'saw' ? 'interpolation-button-active' : ''}
            >
              Saw
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Tape Drive</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'tape-drive',
              name: 'Tape Drive',
              type: 'float',
              value: tapeDrive,
              min: 0.1,
              max: 10.0,
              step: 0.001,
              description: "Controls the tape saturation drive amount"
            }}
            onChange={(val) => handleTapeDriveChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Window Falloff</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'window-falloff',
              name: 'Window Falloff',
              type: 'float',
              value: windowFalloff,
              min: 0,
              max: 1,
              step: 0.001,
              description: "Controls spectral window falloff/shape"
            }}
            onChange={(val) => handleWindowFalloffChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Tape Hysteresis</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'tape-hyst',
              name: 'Tape Hysteresis',
              type: 'float',
              value: tapeHyst,
              min: 0,
              max: 1,
              step: 0.001,
              description: "Adjusts the tape hysteresis effect for analog warmth"
            }}
            onChange={(val) => handleTapeHystChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className="device-bridge-parameters">
        <CardHeader>Bandwidth</CardHeader>
        <CardBody>
          <ParameterControl
            parameter={{
              id: 'bandwidth',
              name: 'Bandwidth',
              type: 'float',
              value: bandwidth,
              min: 0.1,
              max: 2.0,
              step: 0.001,
              description: "Sets the filter bandwidth for frequency response"
            }}
            onChange={(val) => handleBandwidthChange(val as number)}
            disabled={!isConnected}
            precision={3}
            hideLabel={true}
          />
        </CardBody>
      </Card>

      <Card className={`device-bridge-parameters ${!isConnected ? 'interpolation-disabled' : ''}`}>
        <CardHeader>Interpolation</CardHeader>
        <CardBody>
          <div className="interpolation-button-group">
            <Button
              variant={interpolation === 'linear' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleInterpolationChange('linear')}
              disabled={!isConnected}
              className={interpolation === 'linear' ? 'interpolation-button-active' : ''}
            >
              Linear
            </Button>
            <Button
              variant={interpolation === 'cosine' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleInterpolationChange('cosine')}
              disabled={!isConnected}
              className={interpolation === 'cosine' ? 'interpolation-button-active' : ''}
            >
              Cosine
            </Button>
            <Button
              variant={interpolation === 'cubic' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleInterpolationChange('cubic')}
              disabled={!isConnected}
              className={interpolation === 'cubic' ? 'interpolation-button-active' : ''}
            >
              Cubic
            </Button>
          </div>
          <p className="interpolation-helper">Controls the interpolation type for smooth transitions</p>
        </CardBody>
      </Card>
    </div >
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
      </div>
      <div>
        <span>{connectionCount > 0 ? 'Connected' : 'Ready'}</span>
      </div>
    </div>
  );

  return (
    <ToolLayout
      panels={{
        single: mainPanel
      }}
      statusBar={statusBar}
    />
  );
};