import { DaisyFlasher } from './dfu';
import { Esp32Flasher } from './esp';
import type { LogSink } from './dfu';

export interface CombinedProgress {
  onDaisy: (done: number, total: number) => void;
  onEsp: (done: number, total: number) => void;
}

export interface CombinedLoggers {
  onInfo?: LogSink;
  onWarn?: LogSink;
  onError?: LogSink;
}

export interface CombinedFlashInput {
  daisyBin: Blob;
  espApp: Blob;
  /** LittleFS image carries the Daisy firmware payload for ESP→Daisy forwarding. */
  littlefs?: Blob | null;
}

/**
 * Sequences Daisy (DFU) then ESP32 (app + littlefs) flashing in a
 * single user-confirmed run. Each side has its own connect step so the
 * user can plug each interface in turn.
 */
export class CombinedFlasher {
  readonly daisy = new DaisyFlasher();
  readonly esp = new Esp32Flasher();

  bothConnected(): boolean {
    return this.daisy.isConnected() && this.esp.isConnected();
  }

  async flash(
    input: CombinedFlashInput,
    progress: CombinedProgress,
    loggers: CombinedLoggers = {},
  ): Promise<void> {
    if (!this.daisy.isConnected()) throw new Error('daisy not connected');
    if (!this.esp.isConnected()) throw new Error('esp32 not connected');

    loggers.onInfo?.('flashing daisy via dfu');
    await this.daisy.flash(input.daisyBin, progress.onDaisy, loggers);
    loggers.onInfo?.('daisy flash complete');

    loggers.onInfo?.('flashing esp32 (app + littlefs)');
    await this.esp.flash(
      { app: input.espApp, littlefs: input.littlefs ?? null },
      progress.onEsp,
      loggers,
    );
    loggers.onInfo?.('esp32 flash complete');
  }

  async disconnect(): Promise<void> {
    await Promise.allSettled([
      this.daisy.disconnect(),
      this.esp.disconnect(),
    ]);
  }
}
