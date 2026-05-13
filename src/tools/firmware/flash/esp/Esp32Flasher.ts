import { ESPLoader, Transport } from 'esptool-js';

/**
 * ESP32-S3 (eisei) flash layout. Bootloader + partitions + app are merged
 * into one binary at 0x0000; the LittleFS partition (which carries the
 * Daisy firmware) sits at 0x670000. See legacy esp32-flasher commit
 * history for the original derivation.
 */
const ESP_APP_ADDRESS = 0x0000;
const ESP_LITTLEFS_ADDRESS = 0x670000;
const ESP_FLASH_SIZE = '8MB';

export type FlashProgress = (done: number, total: number) => void;
export type LogSink = (msg: string) => void;

export interface Esp32FlasherLoggers {
  onInfo?: LogSink;
  onWarn?: LogSink;
  onError?: LogSink;
}

export interface Esp32FlashInput {
  app: Blob;
  /** Optional LittleFS image (carries the Daisy firmware). */
  littlefs?: Blob | null;
}

function blobToLatin1(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

/**
 * High-level wrapper around esptool-js for the eisei ESP32-S3 module.
 *
 * Lifecycle: `connect()` → `flash({ app, littlefs }, onProgress)` →
 * `disconnect()`. Designed to mirror DaisyFlasher's surface.
 */
export class Esp32Flasher {
  private port: SerialPort | null = null;
  private transport: Transport | null = null;
  private loader: ESPLoader | null = null;
  private chipName = '';

  async connect(loggers: Esp32FlasherLoggers = {}): Promise<{ name: string }> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported. Use Chrome or Edge.');
    }

    const port: SerialPort = await (navigator as unknown as {
      serial: { requestPort: () => Promise<SerialPort> };
    }).serial.requestPort();

    const transport = new Transport(port);
    const loader = new ESPLoader({
      transport,
      baudrate: 115200,
      romBaudrate: 115200,
    });

    try {
      const chip = await loader.main();
      this.chipName = chip;
      loggers.onInfo?.(`detected ${chip}`);
      // Return chip to normal state — flash() opens its own session.
      await loader.after('hard_reset');
    } catch (e) {
      loggers.onWarn?.(`chip detection failed: ${(e as Error).message}`);
      this.chipName = 'ESP32';
    }

    this.port = port;
    this.transport = transport;
    this.loader = loader;
    return { name: `${this.chipName} connected` };
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  chip(): string {
    return this.chipName;
  }

  /**
   * Flash the app binary (merged bootloader+partitions+app @ 0x0000)
   * and optionally the LittleFS image (@ 0x670000) that carries the
   * Daisy firmware payload.
   */
  async flash(
    input: Esp32FlashInput,
    onProgress: FlashProgress,
    loggers: Esp32FlasherLoggers = {},
  ): Promise<void> {
    if (!this.port) throw new Error('not connected');

    // The detection transport must be closed before opening a fresh
    // flashing session, matching the legacy tool's behaviour.
    if (this.transport) {
      try {
        await this.transport.disconnect();
      } catch (e) {
        loggers.onWarn?.(`transport disconnect: ${(e as Error).message}`);
      }
    }

    const transport = new Transport(this.port);
    const loader = new ESPLoader({
      transport,
      baudrate: 115200,
      romBaudrate: 115200,
    });

    loggers.onInfo?.('connecting to chip for flashing');
    await loader.main();
    loggers.onInfo?.('switching to faster baudrate');
    await loader.changeBaud();

    const appBuf = await input.app.arrayBuffer();
    const fileArray: { data: string; address: number }[] = [
      { data: blobToLatin1(appBuf), address: ESP_APP_ADDRESS },
    ];
    if (input.littlefs) {
      const lfsBuf = await input.littlefs.arrayBuffer();
      fileArray.push({
        data: blobToLatin1(lfsBuf),
        address: ESP_LITTLEFS_ADDRESS,
      });
    }

    // Total bytes across files — esptool-js reports per-file written/total
    // but we want one normalised progress stream.
    const totals = fileArray.map((f) => f.data.length);
    const totalBytes = totals.reduce((a, b) => a + b, 0);

    await loader.writeFlash({
      fileArray,
      flashSize: ESP_FLASH_SIZE,
      flashMode: 'dio',
      flashFreq: '40m',
      eraseAll: true,
      compress: true,
      reportProgress: (fileIndex, written, _total) => {
        const before = totals.slice(0, fileIndex).reduce((a, b) => a + b, 0);
        const done = before + written;
        onProgress(done, totalBytes);
      },
    });

    loggers.onInfo?.('resetting chip');
    await loader.after('hard_reset');

    this.transport = transport;
    this.loader = loader;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.transport) await this.transport.disconnect();
    } catch {
      // ignore
    } finally {
      try {
        if (this.port && (this.port as SerialPort).readable) {
          await (this.port as SerialPort).close();
        }
      } catch {
        // ignore
      }
      this.port = null;
      this.transport = null;
      this.loader = null;
      this.chipName = '';
    }
  }
}

export { ESP_APP_ADDRESS, ESP_LITTLEFS_ADDRESS, ESP_FLASH_SIZE };
