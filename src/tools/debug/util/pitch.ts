// Frequency → musical note conversion for the oscillator pitch card.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface NoteInfo {
  /** Note name without octave, e.g. "A" or "F#". */
  note: string;
  /** Octave number using scientific pitch notation (A4 = 440 Hz). */
  octave: number;
  /** Deviation from the nearest equal-tempered note, in cents (-50..+50). */
  cents: number;
  /** Combined label, e.g. "A4". */
  label: string;
}

/** Nearest equal-tempered note for a frequency, or null for invalid input. */
export function hzToNote(hz: number): NoteInfo | null {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { note, octave, cents, label: `${note}${octave}` };
}

/** Human-readable frequency with sensible precision per range. */
export function formatHz(hz: number): string {
  if (!Number.isFinite(hz)) return '—';
  if (hz >= 1000) return `${(hz / 1000).toFixed(3)} kHz`;
  if (hz >= 100) return `${hz.toFixed(1)} Hz`;
  return `${hz.toFixed(2)} Hz`;
}
