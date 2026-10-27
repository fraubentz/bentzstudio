import { NoteEvent, ProjectData } from '../types/music';

/**
 * Demo 1: Ludwig van Beethoven - Für Elise (Theme)
 * BPM: 130, 3/4 Time
 */
export const DEMO_FUR_ELISE: ProjectData = {
  id: 'demo-fur-elise',
  title: 'Für Elise (Theme) - L. v. Beethoven',
  createdAt: 'Classical Canon',
  bpm: 130,
  timeSignature: { numerator: 3, denominator: 4 },
  instrument: 'grand-piano',
  reverb: 0.25,
  quantize: { grid: '1/8', strength: 100, quantizeDuration: true, swing: 0 },
  notes: [
    // Measure 1 pickup & notes
    { id: 'fe-1', pitch: 76, name: 'E5', startBeat: 0.0, durationBeats: 0.5, velocity: 90, clef: 'treble' },
    { id: 'fe-2', pitch: 75, name: 'D#5', startBeat: 0.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-3', pitch: 76, name: 'E5', startBeat: 1.0, durationBeats: 0.5, velocity: 90, clef: 'treble' },
    { id: 'fe-4', pitch: 75, name: 'D#5', startBeat: 1.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-5', pitch: 76, name: 'E5', startBeat: 2.0, durationBeats: 0.5, velocity: 90, clef: 'treble' },
    { id: 'fe-6', pitch: 71, name: 'B4', startBeat: 2.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },

    // Measure 2
    { id: 'fe-7', pitch: 74, name: 'D5', startBeat: 3.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-8', pitch: 72, name: 'C5', startBeat: 3.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-9', pitch: 69, name: 'A4', startBeat: 4.0, durationBeats: 1.0, velocity: 95, clef: 'treble' },
    // Bass arpeggio
    { id: 'fe-10', pitch: 45, name: 'A2', startBeat: 4.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-11', pitch: 52, name: 'E3', startBeat: 4.5, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-12', pitch: 57, name: 'A3', startBeat: 5.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },

    // Measure 3
    { id: 'fe-13', pitch: 60, name: 'C4', startBeat: 6.0, durationBeats: 0.5, velocity: 80, clef: 'treble' },
    { id: 'fe-14', pitch: 64, name: 'E4', startBeat: 6.5, durationBeats: 0.5, velocity: 80, clef: 'treble' },
    { id: 'fe-15', pitch: 69, name: 'A4', startBeat: 7.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-16', pitch: 71, name: 'B4', startBeat: 7.5, durationBeats: 1.0, velocity: 90, clef: 'treble' },
    // Bass arpeggio
    { id: 'fe-17', pitch: 40, name: 'E2', startBeat: 7.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-18', pitch: 47, name: 'B2', startBeat: 7.5, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-19', pitch: 52, name: 'E3', startBeat: 8.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },

    // Measure 4
    { id: 'fe-20', pitch: 64, name: 'E4', startBeat: 9.0, durationBeats: 0.5, velocity: 80, clef: 'treble' },
    { id: 'fe-21', pitch: 68, name: 'G#4', startBeat: 9.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-22', pitch: 71, name: 'B4', startBeat: 10.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'fe-23', pitch: 72, name: 'C5', startBeat: 10.5, durationBeats: 1.0, velocity: 90, clef: 'treble' },
    // Bass arpeggio
    { id: 'fe-24', pitch: 45, name: 'A2', startBeat: 10.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-25', pitch: 52, name: 'E3', startBeat: 10.5, durationBeats: 0.5, velocity: 80, clef: 'bass' },
    { id: 'fe-26', pitch: 57, name: 'A3', startBeat: 11.0, durationBeats: 0.5, velocity: 80, clef: 'bass' },
  ],
};

/**
 * Demo 2: J.S. Bach - Minuet in G Major (BWV Anh. 114)
 * BPM: 116, 3/4 Time
 */
export const DEMO_BACH_MINUET: ProjectData = {
  id: 'demo-bach-minuet',
  title: 'Minuet in G Major - J.S. Bach',
  createdAt: 'Baroque Masterwork',
  bpm: 116,
  timeSignature: { numerator: 3, denominator: 4 },
  instrument: 'organ',
  reverb: 0.35,
  quantize: { grid: '1/8', strength: 100, quantizeDuration: true, swing: 0 },
  notes: [
    // Measure 1
    { id: 'bm-1', pitch: 74, name: 'D5', startBeat: 0.0, durationBeats: 1.0, velocity: 95, clef: 'treble' },
    { id: 'bm-2', pitch: 67, name: 'G4', startBeat: 1.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-3', pitch: 69, name: 'A4', startBeat: 1.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-4', pitch: 71, name: 'B4', startBeat: 2.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-5', pitch: 72, name: 'C5', startBeat: 2.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-6', pitch: 55, name: 'G3', startBeat: 0.0, durationBeats: 2.5, velocity: 90, clef: 'bass' },

    // Measure 2
    { id: 'bm-7', pitch: 74, name: 'D5', startBeat: 3.0, durationBeats: 1.0, velocity: 95, clef: 'treble' },
    { id: 'bm-8', pitch: 67, name: 'G4', startBeat: 4.0, durationBeats: 1.0, velocity: 85, clef: 'treble' },
    { id: 'bm-9', pitch: 67, name: 'G4', startBeat: 5.0, durationBeats: 1.0, velocity: 85, clef: 'treble' },
    { id: 'bm-10', pitch: 59, name: 'B3', startBeat: 3.0, durationBeats: 2.5, velocity: 85, clef: 'bass' },

    // Measure 3
    { id: 'bm-11', pitch: 76, name: 'E5', startBeat: 6.0, durationBeats: 1.0, velocity: 95, clef: 'treble' },
    { id: 'bm-12', pitch: 72, name: 'C5', startBeat: 7.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-13', pitch: 74, name: 'D5', startBeat: 7.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-14', pitch: 76, name: 'E5', startBeat: 8.0, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-15', pitch: 77, name: 'F#5', startBeat: 8.5, durationBeats: 0.5, velocity: 85, clef: 'treble' },
    { id: 'bm-16', pitch: 60, name: 'C4', startBeat: 6.0, durationBeats: 2.5, velocity: 85, clef: 'bass' },

    // Measure 4
    { id: 'bm-17', pitch: 79, name: 'G5', startBeat: 9.0, durationBeats: 1.0, velocity: 95, clef: 'treble' },
    { id: 'bm-18', pitch: 67, name: 'G4', startBeat: 10.0, durationBeats: 1.0, velocity: 85, clef: 'treble' },
    { id: 'bm-19', pitch: 67, name: 'G4', startBeat: 11.0, durationBeats: 1.0, velocity: 85, clef: 'treble' },
    { id: 'bm-20', pitch: 59, name: 'B3', startBeat: 9.0, durationBeats: 2.5, velocity: 85, clef: 'bass' },
  ],
};

/**
 * Demo 3: Neo-Soul Jazz Chord Progression
 * Dm9 -> G13 -> Cmaj9 -> A7alt
 * BPM: 84, 4/4 Time with +20% Swing
 */
export const DEMO_NEO_SOUL: ProjectData = {
  id: 'demo-neo-soul',
  title: 'Midnight Neo-Soul Progression',
  createdAt: 'Modern Jazz Harmony',
  bpm: 84,
  timeSignature: { numerator: 4, denominator: 4 },
  instrument: 'rhodes',
  reverb: 0.3,
  quantize: { grid: '1/8', strength: 80, quantizeDuration: true, swing: 25 },
  notes: [
    // Measure 1: Dm9 (Bass: D2, Chord: F4, A4, C5, E5)
    { id: 'ns-1', pitch: 38, name: 'D2', startBeat: 0.0, durationBeats: 3.5, velocity: 85, clef: 'bass' },
    { id: 'ns-2', pitch: 65, name: 'F4', startBeat: 0.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-3', pitch: 69, name: 'A4', startBeat: 0.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-4', pitch: 72, name: 'C5', startBeat: 0.0, durationBeats: 3.5, velocity: 85, clef: 'treble' },
    { id: 'ns-5', pitch: 76, name: 'E5', startBeat: 0.0, durationBeats: 3.5, velocity: 90, clef: 'treble' },

    // Measure 2: G13 (Bass: G2, Chord: F4, B4, E5)
    { id: 'ns-6', pitch: 43, name: 'G2', startBeat: 4.0, durationBeats: 3.5, velocity: 85, clef: 'bass' },
    { id: 'ns-7', pitch: 65, name: 'F4', startBeat: 4.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-8', pitch: 71, name: 'B4', startBeat: 4.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-9', pitch: 76, name: 'E5', startBeat: 4.0, durationBeats: 3.5, velocity: 85, clef: 'treble' },

    // Measure 3: Cmaj9 (Bass: C2, Chord: E4, G4, B4, D5)
    { id: 'ns-10', pitch: 36, name: 'C2', startBeat: 8.0, durationBeats: 3.5, velocity: 85, clef: 'bass' },
    { id: 'ns-11', pitch: 64, name: 'E4', startBeat: 8.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-12', pitch: 67, name: 'G4', startBeat: 8.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-13', pitch: 71, name: 'B4', startBeat: 8.0, durationBeats: 3.5, velocity: 85, clef: 'treble' },
    { id: 'ns-14', pitch: 74, name: 'D5', startBeat: 8.0, durationBeats: 3.5, velocity: 90, clef: 'treble' },

    // Measure 4: A7(#9) (Bass: A2, Chord: G4, C#5, C5)
    { id: 'ns-15', pitch: 45, name: 'A2', startBeat: 12.0, durationBeats: 3.5, velocity: 85, clef: 'bass' },
    { id: 'ns-16', pitch: 67, name: 'G4', startBeat: 12.0, durationBeats: 3.5, velocity: 80, clef: 'treble' },
    { id: 'ns-17', pitch: 73, name: 'C#5', startBeat: 12.0, durationBeats: 3.5, velocity: 85, clef: 'treble' },
    { id: 'ns-18', pitch: 72, name: 'C5', startBeat: 12.0, durationBeats: 3.5, velocity: 90, clef: 'treble' },
  ],
};

/**
 * Demo 4: 80s Synth Arpeggio
 * BPM: 124, 4/4 Time
 */
export const DEMO_SYNTH_GROOVE: ProjectData = {
  id: 'demo-synth-groove',
  title: 'Neon Odyssey - Synth Arp',
  createdAt: 'Electronic Wave',
  bpm: 124,
  timeSignature: { numerator: 4, denominator: 4 },
  instrument: 'warm-synth',
  reverb: 0.28,
  quantize: { grid: '1/16', strength: 100, quantizeDuration: true, swing: 0 },
  notes: [
    // 16th note arp on Am
    { id: 'sg-1', pitch: 45, name: 'A2', startBeat: 0.0, durationBeats: 0.25, velocity: 100, clef: 'bass' },
    { id: 'sg-2', pitch: 57, name: 'A3', startBeat: 0.25, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-3', pitch: 60, name: 'C4', startBeat: 0.5, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-4', pitch: 64, name: 'E4', startBeat: 0.75, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-5', pitch: 69, name: 'A4', startBeat: 1.0, durationBeats: 0.25, velocity: 95, clef: 'treble' },
    { id: 'sg-6', pitch: 64, name: 'E4', startBeat: 1.25, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-7', pitch: 60, name: 'C4', startBeat: 1.5, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-8', pitch: 57, name: 'A3', startBeat: 1.75, durationBeats: 0.25, velocity: 85, clef: 'bass' },

    { id: 'sg-9', pitch: 45, name: 'A2', startBeat: 2.0, durationBeats: 0.25, velocity: 100, clef: 'bass' },
    { id: 'sg-10', pitch: 57, name: 'A3', startBeat: 2.25, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-11', pitch: 60, name: 'C4', startBeat: 2.5, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-12', pitch: 64, name: 'E4', startBeat: 2.75, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-13', pitch: 71, name: 'B4', startBeat: 3.0, durationBeats: 0.25, velocity: 95, clef: 'treble' },
    { id: 'sg-14', pitch: 64, name: 'E4', startBeat: 3.25, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-15', pitch: 60, name: 'C4', startBeat: 3.5, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-16', pitch: 57, name: 'A3', startBeat: 3.75, durationBeats: 0.25, velocity: 85, clef: 'bass' },

    // F Major Measure 2
    { id: 'sg-17', pitch: 41, name: 'F2', startBeat: 4.0, durationBeats: 0.25, velocity: 100, clef: 'bass' },
    { id: 'sg-18', pitch: 53, name: 'F3', startBeat: 4.25, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-19', pitch: 57, name: 'A3', startBeat: 4.5, durationBeats: 0.25, velocity: 90, clef: 'bass' },
    { id: 'sg-20', pitch: 60, name: 'C4', startBeat: 4.75, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-21', pitch: 65, name: 'F4', startBeat: 5.0, durationBeats: 0.25, velocity: 95, clef: 'treble' },
    { id: 'sg-22', pitch: 60, name: 'C4', startBeat: 5.25, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-23', pitch: 57, name: 'A3', startBeat: 5.5, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-24', pitch: 53, name: 'F3', startBeat: 5.75, durationBeats: 0.25, velocity: 85, clef: 'bass' },

    { id: 'sg-25', pitch: 41, name: 'F2', startBeat: 6.0, durationBeats: 0.25, velocity: 100, clef: 'bass' },
    { id: 'sg-26', pitch: 53, name: 'F3', startBeat: 6.25, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-27', pitch: 57, name: 'A3', startBeat: 6.5, durationBeats: 0.25, velocity: 90, clef: 'bass' },
    { id: 'sg-28', pitch: 60, name: 'C4', startBeat: 6.75, durationBeats: 0.25, velocity: 90, clef: 'treble' },
    { id: 'sg-29', pitch: 69, name: 'A4', startBeat: 7.0, durationBeats: 0.25, velocity: 95, clef: 'treble' },
    { id: 'sg-30', pitch: 60, name: 'C4', startBeat: 7.25, durationBeats: 0.25, velocity: 85, clef: 'treble' },
    { id: 'sg-31', pitch: 57, name: 'A3', startBeat: 7.5, durationBeats: 0.25, velocity: 85, clef: 'bass' },
    { id: 'sg-32', pitch: 53, name: 'F3', startBeat: 7.75, durationBeats: 0.25, velocity: 85, clef: 'bass' },
  ],
};

export const ALL_DEMOS: ProjectData[] = [
  DEMO_FUR_ELISE,
  DEMO_BACH_MINUET,
  DEMO_NEO_SOUL,
  DEMO_SYNTH_GROOVE,
];
