export interface NoteEvent {
  id: string;
  pitch: number; // MIDI number 21 (A0) - 108 (C8)
  name: string; // e.g. "C4", "F#5", "Bb3"
  startBeat: number; // floating point beat position (1.0 = one quarter note in standard 4/4)
  durationBeats: number; // length in beats
  velocity: number; // 1-127
  clef?: 'treble' | 'bass';
  rawStartBeat?: number;
  rawDurationBeats?: number;
}

export interface TimeSignature {
  numerator: number; // e.g. 4, 3, 6, 2
  denominator: number; // e.g. 4, 8
}

export type QuantizeGrid = 'off' | '1/4' | '1/8' | '1/8T' | '1/16' | '1/16T' | '1/32';

export interface QuantizeSetting {
  grid: QuantizeGrid;
  strength: number; // 0 to 100 (%)
  quantizeDuration: boolean;
  swing: number; // -50 to 50 (%)
}

export type InstrumentSound = 'grand-piano' | 'rhodes' | 'warm-synth' | 'organ';

export interface ProjectData {
  id: string;
  title: string;
  createdAt: string;
  bpm: number;
  timeSignature: TimeSignature;
  instrument: InstrumentSound;
  reverb: number; // 0 to 1
  quantize: QuantizeSetting;
  notes: NoteEvent[];
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  connection: string;
  type: 'input' | 'output';
}

export interface MidiMessageLog {
  id: string;
  timestamp: number;
  status: number;
  type: 'note-on' | 'note-off' | 'cc' | 'pitch-bend' | 'other';
  data1: number;
  data2: number;
  description: string;
}

export type TransportState = 'stopped' | 'recording' | 'playing' | 'paused' | 'counting-in';

export interface MeasureNoteSlot {
  measureIndex: number;
  clef: 'treble' | 'bass';
  notes: NoteEvent[];
}
