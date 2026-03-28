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
  Select,
  StatusIndicator
} from '../../design-system';

import '../ToolLayout.css';

type FlashMode = 'firmware' | 'bootloader';

export const DaisyFlasher: React.FC = () => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashStatus, setFlashStatus] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // Flash mode
  const [flashMode, setFlashMode] = useState<FlashMode>('firmware');

  // Firmware handling
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareBlob, setFirmwareBlob] = useState<Blob | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [firmwareSource, setFirmwareSource] = useState<'file' | 'selector'>('selector');

  // Bootloader binary
  const [bootloaderBlob, setBootloaderBlob] = useState<Blob | null>(null);
  const [bootloaderLoading, setBootloaderLoading] = useState(false);

  // Full erase option
  const [fullErase, setFullErase] = useState(false);

  // DFU device ref
  const dfuDeviceRef = useRef<DFUDevice | null>(null);

  // Fetch bootloader binary when switching to bootloader mode
  useEffect(() => {
    if (flashMode === 'bootloader' && !bootloaderBlob) {
      setBootloaderLoading(true);
      fetch(`${import.meta.env.BASE_URL}firmware/dsy_bootloader_v6_4.bin`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch bootloader: ${res.status}`);
          return res.blob();
        })
        .then(blob => {
          setBootloaderBlob(blob);
          setFlashStatus(`Loaded bootloader (${(blob.size / 1024).toFixed(1)} KB). Ready to flash.`);
        })
        .catch(err => {
          setFlashStatus(`Failed to load bootloader: ${err.message}`);
        })
        .finally(() => setBootloaderLoading(false));
    }
  }, [flashMode, bootloaderBlob]);

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

      // Select interface based on flash mode
      let dfuInterface;
      if (flashMode === 'bootloader') {
        // Pick internal flash interface
        dfuInterface = interfaces.find(iface =>
          iface.name?.includes('Internal Flash') ||
          iface.name?.includes('0x08')
        ) || interfaces[0];
      } else {
        // Pick external (QSPI) flash interface
        dfuInterface = interfaces.find(iface =>
          iface.name?.includes('External Flash') ||
          iface.name?.includes('0x90')
        ) || interfaces[0];
      }

      const dfuDevice = new DFUDevice(device, dfuInterface);

      // Set start address based on flash mode
      if (flashMode === 'bootloader') {
        dfuDevice.startAddress = 0x08000000;
      } else {
        dfuDevice.startAddress = 0x90040000;
      }

      await dfuDevice.open();

      dfuDeviceRef.current = dfuDevice;
      setIsConnected(true);

      // Get device info
      const state = await dfuDevice.getState();
      console.log('DFU State:', state);

      const modeLabel = flashMode === 'bootloader' ? 'Internal Flash' : 'QSPI Flash';
      setDeviceInfo(`Daisy Seed - ${dfuInterface.name || 'DFU Mode'} (${modeLabel})`);
      setFlashStatus('Connected to Daisy Seed. Ready to flash.');

    } catch (error) {
      setFlashStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      dfuDeviceRef.current = null;
    }
  }, [flashMode]);

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

    // Determine what binary to flash
    let firmwareData: ArrayBuffer;
    let firmwareName: string;

    if (flashMode === 'bootloader') {
      if (!bootloaderBlob) {
        setFlashStatus('Bootloader binary not loaded yet.');
        return;
      }
      firmwareData = await bootloaderBlob.arrayBuffer();
      firmwareName = 'bootloader v6.4';
    } else {
      const hasFirmware = firmwareSource === 'file' ? !!firmwareFile : !!firmwareBlob;
      if (!hasFirmware) {
        setFlashStatus('Please load firmware first.');
        return;
      }
      if (firmwareSource === 'file' && firmwareFile) {
        firmwareData = await firmwareFile.arrayBuffer();
        firmwareName = firmwareFile.name;
      } else if (firmwareBlob) {
        firmwareData = await firmwareBlob.arrayBuffer();
        firmwareName = `firmware ${firmwareVersion}`;
      } else {
        throw new Error('No firmware data available');
      }
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Starting Daisy flash process...');

    try {
      const device = dfuDeviceRef.current;

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
  }, [isConnected, flashMode, bootloaderBlob, firmwareFile, firmwareBlob, firmwareSource, firmwareVersion, fullErase]);

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

  // Determine if flash button should be enabled
  const canFlash = isConnected && !isFlashing && (
    flashMode === 'bootloader'
      ? !!bootloaderBlob
      : !!(firmwareFile || firmwareBlob)
  );

  // Main content using masonry layout
  const mainContent = (
    <div className="tool-columns">
      {/* Device Connection Card */}
      <Card>
        <CardHeader>Device Connection</CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            <Select
              label="Flash Mode"
              value={flashMode}
              onChange={(e) => {
                setFlashMode(e.target.value as FlashMode);
                // Disconnect if connected, since interface selection changes
                if (isConnected) disconnectDFU();
              }}
              disabled={isFlashing}
              options={[
                { value: 'firmware', label: 'Firmware (QSPI)' },
                { value: 'bootloader', label: 'Bootloader (Internal Flash)' }
              ]}
            />
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
                To enter DFU mode:
              </p>
              <ol style={{
                listStylePosition: 'inside',
                paddingLeft: 'var(--ds-spacing-md)',
                margin: 'var(--ds-spacing-xs) 0'
              }}>
                <li>Press RESET</li>
                <li>Press BOOT</li>
                <li>The LED should pulse</li>
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

      {/* Firmware Selection Card - only shown in firmware mode */}
      {flashMode === 'firmware' && (
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
      )}

      {/* Bootloader info - only shown in bootloader mode */}
      {flashMode === 'bootloader' && (
        <Card>
          <CardHeader>Bootloader</CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-sm)' }}>
              <span>Daisy Bootloader v6.4</span>
              {bootloaderLoading && (
                <StatusIndicator variant="info">Loading bootloader binary...</StatusIndicator>
              )}
              {bootloaderBlob && (
                <StatusIndicator variant="success">
                  Bootloader ready ({(bootloaderBlob.size / 1024).toFixed(1)} KB)
                </StatusIndicator>
              )}
            </div>
          </CardBody>
        </Card>
      )}

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
              disabled={!canFlash}
            >
              {isFlashing ? 'Flashing...' : flashMode === 'bootloader' ? 'Flash Bootloader' : 'Flash Firmware'}
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
        {isFlashing && (
          <span style={{ color: 'var(--ds-color-warning)' }}>
            Flashing: {flashProgress.toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <span>{isFlashing ? 'Flashing' : isConnected ? 'Connected' : 'Ready'}</span>
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
