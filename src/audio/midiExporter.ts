import { NoteEvent, TimeSignature } from '../types/music';

/**
 * Encodes an integer into standard MIDI variable-length quantity (VLQ) bytes.
 * Each byte holds 7 bits; the 8th bit is set on all bytes except the last.
 */
function encodeVariableLength(value: number): number[] {
  const bytes: number[] = [];
  let buffer = Math.max(0, Math.round(value));

  bytes.push(buffer & 0x7f);
  buffer >>= 7;

  while (buffer > 0) {
    bytes.unshift((buffer & 0x7f) | 0x80);
    buffer >>= 7;
  }

  return bytes;
}

/**
 * 100% Client-side Standard MIDI File (SMF Format 0) Binary Generator
 */
export function generateMidiFile(
  notes: NoteEvent[],
  bpm: number = 120,
  timeSignature: TimeSignature = { numerator: 4, denominator: 4 },
  trackName: string = 'Bentz Score'
): Uint8Array {
  const TICKS_PER_BEAT = 480; // Standard resolution (PPQ)

  // 1. Gather all MIDI events (Note On and Note Off) with absolute tick timestamps
  interface RawMidiEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
  }

  const events: RawMidiEvent[] = [];

  notes.forEach((note) => {
    const onTick = Math.max(0, Math.round(note.startBeat * TICKS_PER_BEAT));
    const offTick = Math.max(
      onTick + 1,
      Math.round((note.startBeat + note.durationBeats) * TICKS_PER_BEAT)
    );

    events.push({
      tick: onTick,
      type: 'on',
      pitch: note.pitch,
      velocity: Math.max(1, Math.min(127, note.velocity || 90)),
    });

    events.push({
      tick: offTick,
      type: 'off',
      pitch: note.pitch,
      velocity: 0,
    });
  });

  // Sort events chronologically. On collision, Note Off occurs before Note On of same tick
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // 2. Build Track Chunk data
  const trackBytes: number[] = [];

  // Delta time 0
  trackBytes.push(0x00);
  // Track Name Meta Event (0xFF 0x03 len text)
  const nameBytes = Array.from(new TextEncoder().encode(trackName));
  trackBytes.push(0xff, 0x03, nameBytes.length, ...nameBytes);

  // Delta time 0
  trackBytes.push(0x00);
  // Set Tempo Meta Event (0xFF 0x51 0x03 tt tt tt)
  // microseconds per quarter note = 60,000,000 / BPM
  const microPerBeat = Math.round(60000000 / bpm);
  trackBytes.push(
    0xff,
    0x51,
    0x03,
    (microPerBeat >> 16) & 0xff,
    (microPerBeat >> 8) & 0xff,
    microPerBeat & 0xff
  );

  // Delta time 0
  trackBytes.push(0x00);
  // Time Signature Meta Event (0xFF 0x58 0x04 nn dd cc bb)
  // dd is expressed as log2(denominator), e.g. 4 -> 2, 8 -> 3
  const denomPower = Math.round(Math.log2(timeSignature.denominator || 4));
  trackBytes.push(0xff, 0x58, 0x04, timeSignature.numerator, denomPower, 24, 8);

  // Note events with delta times
  let lastTick = 0;
  events.forEach((ev) => {
    const deltaTicks = ev.tick - lastTick;
    lastTick = ev.tick;

    const vlq = encodeVariableLength(deltaTicks);
    trackBytes.push(...vlq);

    if (ev.type === 'on') {
      trackBytes.push(0x90, ev.pitch & 0x7f, ev.velocity & 0x7f);
    } else {
      trackBytes.push(0x80, ev.pitch & 0x7f, 0x00);
    }
  });

  // End of Track Meta Event (delta 0, 0xFF 0x2F 0x00)
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // 3. Assemble complete Standard MIDI File (Format 0)
  const headerBytes = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length 6
    0x00, 0x00,             // Format 0 (single track)
    0x00, 0x01,             // 1 track
    (TICKS_PER_BEAT >> 8) & 0xff, TICKS_PER_BEAT & 0xff, // 480 PPQ
  ];

  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackBytes.length >> 24) & 0xff,
    (trackBytes.length >> 16) & 0xff,
    (trackBytes.length >> 8) & 0xff,
    trackBytes.length & 0xff,
  ];

  const totalLength = headerBytes.length + trackHeader.length + trackBytes.length;
  const fileBuffer = new Uint8Array(totalLength);

  fileBuffer.set(headerBytes, 0);
  fileBuffer.set(trackHeader, headerBytes.length);
  fileBuffer.set(trackBytes, headerBytes.length + trackHeader.length);

  return fileBuffer;
}

/**
 * Triggers browser download of generated MIDI binary
 */
export function downloadMidiFile(
  notes: NoteEvent[],
  bpm: number,
  timeSignature: TimeSignature,
  filename: string = 'bentz_composition.mid'
) {
  const binary = generateMidiFile(notes, bpm, timeSignature);
  const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
