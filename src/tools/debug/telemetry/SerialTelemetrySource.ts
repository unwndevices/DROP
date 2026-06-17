// Reads NDJSON telemetry from eisei over Web Serial.
//
// Unlike the firmware flasher (which drives the ESP32 into its bootloader via
// esptool-js), this source just opens the running device's serial port and
// reads whatever it prints — it never toggles DTR/RTS, so it won't reset the
// board into the bootloader.

import { parseLine } from './protocol';
import type { SourceHandlers, TelemetrySource } from './types';

const DEFAULT_BAUD = 115200;
const MAX_LINE_BUFFER = 64 * 1024;

export class SerialTelemetrySource implements TelemetrySource {
  readonly kind = 'serial';

  private baud: number;
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private loop: Promise<void> | null = null;
  private stopped = false;

  constructor(baud: number = DEFAULT_BAUD) {
    this.baud = baud;
  }

  async start(handlers: SourceHandlers): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported. Use Chrome or Edge.');
    }
    handlers.onStatus('connecting');

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: this.baud });

    this.port = port;
    this.stopped = false;
    handlers.onStatus('connected', portLabel(port));
    this.loop = this.readLoop(handlers);
  }

  private async readLoop(handlers: SourceHandlers): Promise<void> {
    const readable = this.port?.readable;
    if (!readable) return;

    const reader = readable.getReader();
    this.reader = reader;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (!this.stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const frame = parseLine(line);
          if (frame) handlers.onFrame(frame);
        }

        // Guard against a device that never emits newlines.
        if (buffer.length > MAX_LINE_BUFFER) buffer = '';
      }
    } catch (err) {
      if (!this.stopped) {
        handlers.onStatus('error', (err as Error).message ?? 'serial read failed');
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // already released
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    try {
      await this.reader?.cancel();
    } catch {
      // reader may already be closed
    }
    try {
      await this.loop;
    } catch {
      // loop rejection is handled inside readLoop
    }
    this.reader = null;
    try {
      await this.port?.close();
    } catch {
      // port may already be closed
    }
    this.port = null;
  }
}

function portLabel(port: SerialPort): string {
  try {
    const info = port.getInfo();
    if (info.usbVendorId != null && info.usbProductId != null) {
      const hex = (n: number) => n.toString(16).padStart(4, '0');
      return `usb ${hex(info.usbVendorId)}:${hex(info.usbProductId)}`;
    }
  } catch {
    // getInfo unavailable
  }
  return 'serial port';
}
