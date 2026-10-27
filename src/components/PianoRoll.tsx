import React, { useRef, useMemo } from 'react';
import { NoteEvent, TimeSignature } from '../types/music';
import { midiToNoteName } from '../audio/quantizer';

interface PianoRollProps {
  notes: NoteEvent[];
  timeSignature: TimeSignature;
  currentBeat: number;
  onSeek: (beat: number) => void;
  onNoteSelect?: (note: NoteEvent) => void;
  onDeleteNote?: (id: string) => void;
  activePitches?: Set<number>;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  timeSignature,
  currentBeat,
  onSeek,
  onNoteSelect,
  onDeleteNote,
  activePitches = new Set(),
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pitch range: determine min and max pitch present, or standard 3-octave C3(48) to B5(83)
  const { minPitch, maxPitch } = useMemo(() => {
    if (notes.length === 0) return { minPitch: 48, maxPitch: 84 };
    let min = 127;
    let max = 0;
    notes.forEach((n) => {
      if (n.pitch < min) min = n.pitch;
      if (n.pitch > max) max = n.pitch;
    });
    // Add margin
    return {
      minPitch: Math.max(21, Math.min(48, min - 2)),
      maxPitch: Math.min(108, Math.max(84, max + 2)),
    };
  }, [notes]);

  const pitches = useMemo(() => {
    const list: number[] = [];
    for (let p = maxPitch; p >= minPitch; p--) {
      list.push(p);
    }
    return list;
  }, [minPitch, maxPitch]);

  const beatsPerMeasure = (timeSignature.numerator / timeSignature.denominator) * 4;
  
  // Total beats displayed
  const totalBeats = useMemo(() => {
    let max = 16;
    notes.forEach((n) => {
      const end = n.startBeat + n.durationBeats;
      if (end > max) max = Math.ceil(end / beatsPerMeasure) * beatsPerMeasure;
    });
    return Math.max(16, max + beatsPerMeasure);
  }, [notes, beatsPerMeasure]);

  const pixelsPerBeat = 48; // Width scale
  const rowHeight = 18; // Height per pitch

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft - 50; // offset piano key gutter
    if (clickX >= 0) {
      const targetBeat = Math.max(0, clickX / pixelsPerBeat);
      onSeek(targetBeat);
    }
  };

  return (
    <div className="relative w-full rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Top Header / Ruler */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Interactive Piano Roll</span>
          <span>·</span>
          <span>Click timeline to scrub</span>
          <span>·</span>
          <span>{notes.length} Active Notes</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Range: {midiToNoteName(minPitch)} - {midiToNoteName(maxPitch)}</span>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        className="relative overflow-x-auto overflow-y-auto max-h-[380px] bg-[#0d121d] select-none cursor-crosshair"
      >
        <div
          className="relative flex"
          style={{
            width: `${totalBeats * pixelsPerBeat + 60}px`,
            height: `${pitches.length * rowHeight + 28}px`,
          }}
        >
          {/* Left Key Gutter (Sticky) */}
          <div className="sticky left-0 top-0 z-20 w-[50px] bg-slate-950 border-r border-slate-800 flex flex-col pt-7">
            {pitches.map((pitch) => {
              const noteName = midiToNoteName(pitch);
              const isBlack = noteName.includes('#');
              const isC = noteName.startsWith('C') && !isBlack;
              const isActive = activePitches.has(pitch);

              return (
                <div
                  key={pitch}
                  style={{ height: `${rowHeight}px` }}
                  className={`flex items-center justify-end pr-1 text-[10px] font-mono border-b ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : isBlack
                      ? 'bg-slate-900 text-slate-400 border-slate-800/80'
                      : isC
                      ? 'bg-slate-800/90 text-amber-300 font-semibold border-slate-700/60'
                      : 'bg-slate-950 text-slate-500 border-slate-800/50'
                  }`}
                >
                  {isC ? noteName : isBlack ? '' : noteName.slice(0, 1)}
                </div>
              );
            })}
          </div>

          {/* Timeline & Grid Area */}
          <div className="relative flex-1">
            {/* Top Measure Ruler */}
            <div className="sticky top-0 z-10 h-7 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex">
              {Array.from({ length: Math.ceil(totalBeats / beatsPerMeasure) }).map((_, mIdx) => {
                const measureNum = mIdx + 1;
                return (
                  <div
                    key={mIdx}
                    style={{ width: `${beatsPerMeasure * pixelsPerBeat}px` }}
                    className="border-r border-slate-700/80 px-2 py-1 text-[11px] font-mono font-medium text-slate-300 flex items-center justify-between"
                  >
                    <span>M{measureNum}</span>
                    <span className="text-[9px] text-slate-600">
                      {(mIdx * beatsPerMeasure).toFixed(0)}b
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Grid Rows */}
            <div className="relative">
              {pitches.map((pitch, idx) => {
                const noteName = midiToNoteName(pitch);
                const isBlack = noteName.includes('#');
                const isC = noteName.startsWith('C') && !isBlack;

                return (
                  <div
                    key={pitch}
                    style={{
                      height: `${rowHeight}px`,
                      top: `${idx * rowHeight}px`,
                    }}
                    className={`w-full border-b ${
                      isBlack
                        ? 'bg-slate-900/35 border-slate-800/40'
                        : isC
                        ? 'bg-slate-800/20 border-slate-700/60'
                        : 'bg-transparent border-slate-800/30'
                    }`}
                  />
                );
              })}

              {/* Vertical Beat Lines */}
              {Array.from({ length: Math.ceil(totalBeats) }).map((_, beatIdx) => {
                const isMeasureBar = beatIdx % beatsPerMeasure === 0;
                return (
                  <div
                    key={beatIdx}
                    style={{
                      left: `${beatIdx * pixelsPerBeat}px`,
                      height: `${pitches.length * rowHeight}px`,
                    }}
                    className={`absolute top-0 pointer-events-none border-r ${
                      isMeasureBar ? 'border-slate-700/70' : 'border-slate-800/30'
                    }`}
                  />
                );
              })}

              {/* Note Rectangles */}
              {notes.map((note) => {
                const pitchIdx = pitches.indexOf(note.pitch);
                if (pitchIdx === -1) return null;

                const left = note.startBeat * pixelsPerBeat;
                const width = Math.max(8, note.durationBeats * pixelsPerBeat - 2);
                const top = pitchIdx * rowHeight + 1;
                const isTreble = (note.clef ?? (note.pitch >= 60 ? 'treble' : 'bass')) === 'treble';

                return (
                  <div
                    key={note.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNoteSelect) onNoteSelect(note);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (onDeleteNote) onDeleteNote(note.id);
                    }}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${rowHeight - 2}px`,
                    }}
                    title={`${note.name} (${note.pitch}) | Start: ${note.startBeat.toFixed(2)}b | Dur: ${note.durationBeats.toFixed(2)}b (Right-click to delete)`}
                    className={`absolute rounded-[3px] border px-1 text-[9px] font-mono flex items-center justify-between overflow-hidden cursor-pointer shadow-sm transition-transform active:scale-95 ${
                      isTreble
                        ? 'bg-amber-500/85 hover:bg-amber-400 border-amber-300 text-slate-950 font-bold'
                        : 'bg-emerald-600/85 hover:bg-emerald-500 border-emerald-300 text-slate-950 font-bold'
                    }`}
                  >
                    <span className="truncate leading-none">{note.name}</span>
                  </div>
                );
              })}

              {/* Live Playhead Needle */}
              <div
                style={{
                  left: `${currentBeat * pixelsPerBeat}px`,
                  height: `${pitches.length * rowHeight}px`,
                }}
                className="absolute top-0 w-[2px] bg-amber-400 z-10 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              >
                <div className="w-2.5 h-2.5 bg-amber-400 transform -translate-x-[4px] -translate-y-1 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
