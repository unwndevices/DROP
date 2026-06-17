// Shared telemetry types for the eisei debug tool.

/**
 * One decoded telemetry frame. Fields are optional so the protocol can grow
 * card-by-card — a consumer reads the field it needs and ignores the rest.
 */
export interface TelemetryFrame {
  /** Arrival timestamp from `performance.now()` (ms). Always present. */
  at: number;
  /** Device uptime in ms, if the firmware reports it. */
  ms?: number;
  /** Potentiometer values, normalized to [0, 1] — one entry per pot. */
  pots?: number[];
  /** Oscillator frequencies in Hz — one entry per oscillator. */
  osc?: number[];
}

export type SourceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface SourceHandlers {
  onFrame: (frame: TelemetryFrame) => void;
  onStatus: (status: SourceStatus, detail?: string) => void;
}

/**
 * A telemetry source feeds frames to the UI. Two implementations exist:
 * `SerialTelemetrySource` (real device over Web Serial) and
 * `MockTelemetrySource` (synthetic frames for development without hardware).
 */
export interface TelemetrySource {
  readonly kind: 'serial' | 'mock';
  start(handlers: SourceHandlers): Promise<void>;
  stop(): Promise<void>;
}
