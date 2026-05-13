import { DFUDevice, findDfuInterfaces, type DFUInterface } from './dfu-webdfu';

export type FlashProgress = (done: number, total: number) => void;
export type LogSink = (msg: string) => void;

export interface DaisyFlasherLoggers {
  onInfo?: LogSink;
  onWarn?: LogSink;
  onError?: LogSink;
}

/**
 * High-level wrapper around the Daisy WebUSB DFU device.
 *
 * Lifecycle: `connect()` → `flash(blob, onProgress)` → `disconnect()`.
 *
 * Erases QSPI sectors before write — already handled inside
 * `DFUDevice.do_download` (see daisy-flasher legacy fix commit 4fc0ec2).
 */
export class DaisyFlasher {
  private device: DFUDevice | null = null;
  private usbDevice: USBDevice | null = null;
  private interfaceName = '';

  /** Open WebUSB device picker, find the DFU interface, and open it. */
  async connect(loggers: DaisyFlasherLoggers = {}): Promise<{ name: string }> {
    if (!('usb' in navigator)) {
      throw new Error('WebUSB API not supported. Use Chrome or Edge.');
    }

    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x0483 }], // STMicroelectronics
    });

    const interfaces = findDfuInterfaces(device);
    if (interfaces.length === 0) {
      throw new Error('No DFU interface found. Make sure device is in DFU mode.');
    }
    const iface: DFUInterface = interfaces[0];

    const dfu = new DFUDevice(device, iface);
    dfu.logInfo = loggers.onInfo;
    dfu.logWarning = loggers.onWarn;
    dfu.logError = loggers.onError;
    await dfu.open();

    this.device = dfu;
    this.usbDevice = device;
    this.interfaceName = iface.name ?? 'DFU Mode';

    // Best-effort: clear any stale error status from prior session.
    try {
      await dfu.clearStatus();
    } catch {
      // some DFU implementations reject when state is already idle
    }

    return { name: `Daisy Seed - ${this.interfaceName}` };
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  deviceName(): string {
    return this.usbDevice
      ? `Daisy Seed - ${this.interfaceName}`
      : '';
  }

  /**
   * Flash a binary blob via DFU. QSPI sectors are erased inside
   * `do_download` before write. Resolves once the manifestation phase
   * completes; the device then resets onto the new firmware.
   */
  async flash(
    binary: Blob,
    onProgress: FlashProgress,
    loggers: DaisyFlasherLoggers = {},
  ): Promise<void> {
    if (!this.device) throw new Error('not connected');
    const dfu = this.device;
    const buf = await binary.arrayBuffer();

    dfu.logProgress = onProgress;
    if (loggers.onInfo) dfu.logInfo = loggers.onInfo;
    if (loggers.onWarn) dfu.logWarning = loggers.onWarn;
    if (loggers.onError) dfu.logError = loggers.onError;

    await dfu.do_download(dfu.transferSize, buf, true);
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    try {
      await this.device.close();
    } catch {
      // ignore — device may already be reset onto new firmware
    } finally {
      this.device = null;
      this.usbDevice = null;
      this.interfaceName = '';
    }
  }
}
