import React, { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from 'vexflow';
import { NoteEvent, TimeSignature } from '../types/music';

interface ScoreViewerProps {
  notes: NoteEvent[];
  bpm: number;
  timeSignature: TimeSignature;
  currentBeat: number;
  isPlaying: boolean;
  onNoteClick?: (note: NoteEvent) => void;
  interactive?: boolean;
}

interface ParsedVexNote {
  keys: string[];
  duration: string;
  clef: 'treble' | 'bass';
  isRest: boolean;
  accidentals: string[];
  isDotted: boolean;
  beatDuration: number;
  originalNotes: NoteEvent[];
}

/**
 * Convert pitch number (0-127) to VexFlow key format: e.g. 60 (C4) -> "c/4", 61 (C#4) -> "c#/4"
 */
function pitchToVexKey(pitch: number): { key: string; accidental: string | null } {
  const noteLetters = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const octave = Math.floor(pitch / 12) - 1;
  const idx = pitch % 12;
  const rawName = noteLetters[idx];

  const accidental = rawName.includes('#') ? '#' : null;
  return {
    key: `${rawName}/${octave}`,
    accidental,
  };
}

/**
 * Converts a duration in beats to nearest VexFlow duration code & dotted flag
 */
function beatDurationToVex(beats: number): { duration: string; isDotted: boolean; beats: number } {
  if (beats >= 3.5) return { duration: 'w', isDotted: false, beats: 4 };
  if (beats >= 2.7) return { duration: 'hd', isDotted: true, beats: 3 };
  if (beats >= 1.8) return { duration: 'h', isDotted: false, beats: 2 };
  if (beats >= 1.3) return { duration: 'qd', isDotted: true, beats: 1.5 };
  if (beats >= 0.8) return { duration: 'q', isDotted: false, beats: 1 };
  if (beats >= 0.4) return { duration: '8', isDotted: false, beats: 0.5 };
  return { duration: '16', isDotted: false, beats: 0.25 };
}

export const ScoreViewer: React.FC<ScoreViewerProps> = ({
  notes,
  timeSignature,
  currentBeat,
  isPlaying,
  onNoteClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [svgWidth, setSvgWidth] = useState<number>(880);

  // Measure measure counts
  const beatsPerMeasure = (timeSignature.numerator / timeSignature.denominator) * 4;
  
  // Calculate total measures needed (at least 4 measures)
  let maxBeat = 0;
  notes.forEach((n) => {
    const end = n.startBeat + n.durationBeats;
    if (end > maxBeat) maxBeat = end;
  });
  const totalMeasures = Math.max(4, Math.ceil((maxBeat + 0.1) / beatsPerMeasure));

  // Handle responsive resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth;
        setSvgWidth(Math.max(600, clientWidth - 32));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Main VexFlow Engraving Render Pass
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous SVG contents
    containerRef.current.innerHTML = '';
    setRenderError(null);

    try {
      const measuresPerRow = svgWidth > 900 ? 3 : 2;
      const measureWidth = Math.floor(svgWidth / measuresPerRow);
      const rowHeight = 250; // Grand staff height
      const totalRows = Math.ceil(totalMeasures / measuresPerRow);
      const totalHeight = totalRows * rowHeight + 40;

      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(svgWidth, totalHeight);
      const context = renderer.getContext();

      // Style SVG for dark studio theme: white notation on dark background
      context.setFillStyle('#F1F5F9');
      context.setStrokeStyle('#F1F5F9');

      for (let m = 0; m < totalMeasures; m++) {
        const rowIndex = Math.floor(m / measuresPerRow);
        const colIndex = m % measuresPerRow;
        const x = colIndex * measureWidth + 10;
        const yTreble = rowIndex * rowHeight + 25;
        const yBass = yTreble + 90;

        // Create Treble Stave
        const trebleStave = new Stave(x, yTreble, measureWidth - 15);
        if (colIndex === 0) {
          trebleStave.addClef('treble');
          if (rowIndex === 0) {
            trebleStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
          }
        }
        trebleStave.setContext(context).draw();

        // Create Bass Stave
        const bassStave = new Stave(x, yBass, measureWidth - 15);
        if (colIndex === 0) {
          bassStave.addClef('bass');
          if (rowIndex === 0) {
            bassStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
          }
        }
        bassStave.setContext(context).draw();

        // Filter notes for this measure
        const measureStartBeat = m * beatsPerMeasure;
        const measureEndBeat = measureStartBeat + beatsPerMeasure;

        const measureNotes = notes.filter(
          (n) => n.startBeat >= measureStartBeat - 0.05 && n.startBeat < measureEndBeat - 0.05
        );

        // Separate by staff
        const trebleNotes = measureNotes.filter((n) => (n.clef ?? (n.pitch >= 60 ? 'treble' : 'bass')) === 'treble');
        const bassNotes = measureNotes.filter((n) => (n.clef ?? (n.pitch >= 60 ? 'treble' : 'bass')) === 'bass');

        // Render voice for Treble
        renderStaffMeasure(
          context,
          trebleStave,
          trebleNotes,
          'treble',
          measureStartBeat,
          beatsPerMeasure,
          measureWidth - 25
        );

        // Render voice for Bass
        renderStaffMeasure(
          context,
          bassStave,
          bassNotes,
          'bass',
          measureStartBeat,
          beatsPerMeasure,
          measureWidth - 25
        );
      }
    } catch (err: unknown) {
      console.error('VexFlow rendering error:', err);
      setRenderError(err instanceof Error ? err.message : 'Error rendering score notation');
    }
  }, [notes, timeSignature, totalMeasures, svgWidth]);

  return (
    <div className="relative w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl overflow-x-auto">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Grand Staff Score</span>
          <span>·</span>
          <span>{timeSignature.numerator}/{timeSignature.denominator} Time</span>
          <span>·</span>
          <span>{notes.length} notes</span>
          <span>·</span>
          <span>{totalMeasures} measures</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Beat</span>
          <span className="font-mono tabular-nums text-amber-400 font-semibold text-sm">
            {currentBeat.toFixed(2)}
          </span>
        </div>
      </div>

      {renderError && (
        <div className="p-3 my-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded">
          Notation engine message: {renderError}
        </div>
      )}

      {/* SVG Container where VexFlow engraves */}
      <div
        ref={containerRef}
        className="w-full flex justify-center min-h-[300px] select-none text-slate-100"
        aria-label="Interactive Music Notation Sheet"
      />
    </div>
  );
};

/**
 * Builds and renders a VexFlow voice of notes + rests for a single stave measure
 */
function renderStaffMeasure(
  context: any,
  stave: Stave,
  notesInMeasure: NoteEvent[],
  clef: 'treble' | 'bass',
  measureStartBeat: number,
  beatsPerMeasure: number,
  staveWidth: number
) {
  try {
    const vexNotes: StaveNote[] = [];

    // Group notes by start beat to handle chords
    const grouped = new Map<number, NoteEvent[]>();
    notesInMeasure.forEach((n) => {
      // Snap to nearest 1/16th beat inside measure
      const relBeat = Math.round((n.startBeat - measureStartBeat) * 16) / 16;
      if (!grouped.has(relBeat)) grouped.set(relBeat, []);
      grouped.get(relBeat)!.push(n);
    });

    // If measure is completely empty for this staff, render full measure rest
    if (grouped.size === 0) {
      const restKey = clef === 'treble' ? 'b/4' : 'd/3';
      const wholeRest = new StaveNote({
        clef,
        keys: [restKey],
        duration: 'wr',
      });
      vexNotes.push(wholeRest);
    } else {
      // Build chronological events with rest fills
      let cursor = 0;
      const sortedBeats = Array.from(grouped.keys()).sort((a, b) => a - b);

      sortedBeats.forEach((relBeat) => {
        // If there is gap between cursor and note, fill with rests
        if (relBeat > cursor + 0.1) {
          fillRests(cursor, relBeat, clef, vexNotes);
        }

        const chordNotes = grouped.get(relBeat)!;
        const maxDuration = Math.max(...chordNotes.map((n) => n.durationBeats));
        const vexDur = beatDurationToVex(maxDuration);

        // Convert pitches to VexFlow keys
        const keysWithAcc: { key: string; accidental: string | null }[] = [];
        chordNotes.forEach((n) => {
          keysWithAcc.push(pitchToVexKey(n.pitch));
        });

        // Deduplicate and sort keys from lowest to highest
        keysWithAcc.sort((a, b) => a.key.localeCompare(b.key));
        const keys = keysWithAcc.map((k) => k.key);

        const staveNote = new StaveNote({
          clef,
          keys,
          duration: vexDur.duration,
        });

        // Add accidentals
        keysWithAcc.forEach((k, idx) => {
          if (k.accidental) {
            staveNote.addModifier(new Accidental(k.accidental), idx);
          }
        });

        if (vexDur.isDotted) {
          staveNote.addModifier(new Dot(), 0);
        }

        vexNotes.push(staveNote);
        cursor = Math.max(cursor + vexDur.beats, relBeat + vexDur.beats);
      });

      // Fill remaining beats in measure if cursor < beatsPerMeasure
      if (cursor < beatsPerMeasure - 0.1) {
        fillRests(cursor, beatsPerMeasure, clef, vexNotes);
      }
    }

    if (vexNotes.length > 0) {
      // Create voice and format
      const voice = new Voice({
        numBeats: beatsPerMeasure,
        beatValue: 4,
      }).setStrict(false);

      voice.addTickables(vexNotes);
      new Formatter().joinVoices([voice]).format([voice], Math.max(120, staveWidth - 40));
      voice.draw(context, stave);
    }
  } catch (err) {
    // Graceful fallback for non-standard polyphony measures
    console.warn(`Staff measure render fallback for ${clef}:`, err);
  }
}

/**
 * Fills empty space with standard musical rests (half, quarter, eighth, sixteenth)
 */
function fillRests(
  fromBeat: number,
  toBeat: number,
  clef: 'treble' | 'bass',
  vexNotes: StaveNote[]
) {
  let remaining = toBeat - fromBeat;
  const restKey = clef === 'treble' ? 'b/4' : 'd/3';

  while (remaining >= 0.2) {
    if (remaining >= 2.0 && fromBeat % 2 === 0) {
      vexNotes.push(new StaveNote({ clef, keys: [restKey], duration: 'hr' }));
      remaining -= 2.0;
    } else if (remaining >= 0.9) {
      vexNotes.push(new StaveNote({ clef, keys: [restKey], duration: 'qr' }));
      remaining -= 1.0;
    } else if (remaining >= 0.45) {
      vexNotes.push(new StaveNote({ clef, keys: [restKey], duration: '8r' }));
      remaining -= 0.5;
    } else {
      vexNotes.push(new StaveNote({ clef, keys: [restKey], duration: '16r' }));
      remaining -= 0.25;
    }
  }
}
