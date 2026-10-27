import { NoteEvent, QuantizeGrid, QuantizeSetting } from '../types/music';

// Note names map
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert MIDI note number (0-127) to standard scientific pitch notation (e.g. 60 -> "C4")
 */
export function midiToNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const noteIndex = pitch % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Determine default clef based on pitch (Middle C = 60).
 * Pitches 60 and above default to treble staff; pitches below 60 to bass staff.
 */
export function getClefForPitch(pitch: number): 'treble' | 'bass' {
  return pitch >= 60 ? 'treble' : 'bass';
}

/**
 * Returns grid step size in quarter-note beat units
 */
export function getGridStep(grid: QuantizeGrid): number {
  switch (grid) {
    case '1/4':
      return 1.0;
    case '1/8':
      return 0.5;
    case '1/8T':
      return 1 / 3; // 0.3333333333333333
    case '1/16':
      return 0.25;
    case '1/16T':
      return 1 / 6; // 0.16666666666666666
    case '1/32':
      return 0.125;
    case 'off':
    default:
      return 0;
  }
}

/**
 * Mathematical Quantization Engine:
 * Snaps raw beat timestamp to nearest harmonic division, interpolating by strength factor
 * and optionally applying swing offset to weak subdivisions.
 */
export function quantizeBeat(
  rawBeat: number,
  grid: QuantizeGrid,
  strengthPct: number = 100,
  swingPct: number = 0
): number {
  if (grid === 'off' || strengthPct <= 0) {
    return Math.max(0, rawBeat);
  }

  const step = getGridStep(grid);
  if (step <= 0) return Math.max(0, rawBeat);

  // 1. Calculate nearest target grid point
  let targetBeat = Math.round(rawBeat / step) * step;

  // 2. Calculate optional swing (applies to off-beat subdivisions, i.e., odd grid index)
  if (swingPct !== 0 && (grid === '1/8' || grid === '1/16')) {
    const gridIndex = Math.round(targetBeat / step);
    if (gridIndex % 2 !== 0) {
      // Swing pushes the off-beat note later in time (triplet swing feeling is ~+33%)
      const maxSwingOffset = step * 0.3333;
      const swingOffset = maxSwingOffset * (swingPct / 100);
      targetBeat += swingOffset;
    }
  }

  // 3. Linear interpolation based on strength parameter (0 to 100%)
  const alpha = Math.min(1, Math.max(0, strengthPct / 100));
  const quantizedBeat = rawBeat + (targetBeat - rawBeat) * alpha;

  // Round to 4 decimal places to prevent floating point drift
  return Math.max(0, Math.round(quantizedBeat * 10000) / 10000);
}

/**
 * Mathematical Duration Quantization:
 * Clamps note duration to standard rhythmic divisions (min 1/32 note)
 */
export function quantizeDuration(
  rawDuration: number,
  grid: QuantizeGrid,
  strengthPct: number = 100
): number {
  if (grid === 'off' || strengthPct <= 0) {
    return Math.max(0.125, rawDuration);
  }

  const step = getGridStep(grid);
  if (step <= 0) return Math.max(0.125, rawDuration);

  // Snap to nearest grid multiple, but keep at least one step or minimum 1/16 note
  const minDuration = Math.min(0.25, step);
  const targetDuration = Math.max(minDuration, Math.round(rawDuration / step) * step);

  const alpha = Math.min(1, Math.max(0, strengthPct / 100));
  const quantizedDuration = rawDuration + (targetDuration - rawDuration) * alpha;

  return Math.max(minDuration, Math.round(quantizedDuration * 10000) / 10000);
}

/**
 * Quantize a collection of notes non-destructively, preserving original raw performance data
 */
export function quantizeNoteEvents(
  notes: NoteEvent[],
  setting: QuantizeSetting
): NoteEvent[] {
  return notes.map((note) => {
    const rawStart = note.rawStartBeat ?? note.startBeat;
    const rawDur = note.rawDurationBeats ?? note.durationBeats;

    const startBeat = quantizeBeat(rawStart, setting.grid, setting.strength, setting.swing);
    const durationBeats = setting.quantizeDuration
      ? quantizeDuration(rawDur, setting.grid, setting.strength)
      : rawDur;

    return {
      ...note,
      rawStartBeat: rawStart,
      rawDurationBeats: rawDur,
      startBeat,
      durationBeats,
      clef: note.clef || getClefForPitch(note.pitch),
    };
  });
}
