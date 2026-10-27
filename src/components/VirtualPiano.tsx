import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { midiManager } from '../audio/midiManager';
import { audioEngine } from '../audio/audioEngine';
import { midiToNoteName } from '../audio/quantizer';

interface VirtualPianoProps {
  activePitches: Set<number>;
  onPitchTrigger?: (pitch: number, isDown: boolean) => void;
}

// QWERTY keyboard map to semi-tone offset from base octave C
const KEY_MAP: Record<string, number> = {
  a: 0,  // C
  w: 1,  // C#
  s: 2,  // D
  e: 3,  // D#
  d: 4,  // E
  f: 5,  // F
  t: 6,  // F#
  g: 7,  // G
  y: 8,  // G#
  h: 9,  // A
  u: 10, // A#
  j: 11, // B
  k: 12, // C next octave
  o: 13, // C# next octave
  l: 14, // D next octave
  p: 15, // D# next octave
  ';': 16, // E next octave
};

export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  activePitches,
  onPitchTrigger,
}) => {
  const [baseOctave, setBaseOctave] = useState<number>(4); // Middle C = C4 = pitch 60
  const [labelMode, setLabelMode] = useState<'note' | 'qwerty' | 'none'>('note');
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Octave start pitch: Octave 4 C = 60, Octave 3 C = 48, etc.
  const startPitch = baseOctave * 12 + 12; // C3=48 when octave 3, C4=60 when octave 4

  // Show 2.5 octaves (e.g. C4 to F6 = 30 keys)
  const numberOfKeys = 29;

  const keys = useMemo(() => {
    const list: { pitch: number; isBlack: boolean; name: string }[] = [];
    for (let i = 0; i < numberOfKeys; i++) {
      const pitch = startPitch + i;
      const name = midiToNoteName(pitch);
      const isBlack = name.includes('#');
      list.push({ pitch, isBlack, name });
    }
    return list;
  }, [startPitch, numberOfKeys]);

  const handleNoteDown = useCallback(
    (pitch: number) => {
      audioEngine.initAudio();
      audioEngine.triggerNoteOn(pitch, 95);
      midiManager.injectNoteOn(pitch, 95);
      if (onPitchTrigger) onPitchTrigger(pitch, true);
    },
    [onPitchTrigger]
  );

  const handleNoteUp = useCallback(
    (pitch: number) => {
      audioEngine.triggerNoteOff(pitch);
      midiManager.injectNoteOff(pitch);
      if (onPitchTrigger) onPitchTrigger(pitch, false);
    },
    [onPitchTrigger]
  );

  // Global mouse up tracker
  useEffect(() => {
    const onUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // Computer QWERTY keyboard listener
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.repeat
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined && !pressedKeys.has(key)) {
        pressedKeys.add(key);
        const pitch = startPitch + KEY_MAP[key];
        handleNoteDown(pitch);
      } else if (key === 'z') {
        // Shift octave down
        setBaseOctave((prev) => Math.max(1, prev - 1));
      } else if (key === 'x') {
        // Shift octave up
        setBaseOctave((prev) => Math.min(6, prev + 1));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        pressedKeys.delete(key);
        const pitch = startPitch + KEY_MAP[key];
        handleNoteUp(pitch);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startPitch, handleNoteDown, handleNoteUp]);

  // Separate white keys and black keys for proper musical positioning
  const whiteKeys = keys.filter((k) => !k.isBlack);

  return (
    <div className="w-full flex flex-col rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-xl select-none">
      {/* Keyboard Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">On-Screen Keyboard</span>
          <span>·</span>
          <span>Octave {baseOctave} (C{baseOctave} - E{baseOctave + 2})</span>
          <span>·</span>
          <span className="hidden sm:inline">Press Z/X to shift octave</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Octave Shifter */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={() => setBaseOctave((o) => Math.max(1, o - 1))}
              disabled={baseOctave <= 1}
              aria-label="Shift octave down"
              className="px-2 py-1 text-xs font-mono font-bold hover:text-white disabled:opacity-30 transition-colors"
            >
              -1 Oct
            </button>
            <span className="px-2 text-xs font-mono text-amber-400 font-semibold">
              C{baseOctave}
            </span>
            <button
              onClick={() => setBaseOctave((o) => Math.min(6, o + 1))}
              disabled={baseOctave >= 6}
              aria-label="Shift octave up"
              className="px-2 py-1 text-xs font-mono font-bold hover:text-white disabled:opacity-30 transition-colors"
            >
              +1 Oct
            </button>
          </div>

          {/* Key label toggles */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={() => setLabelMode('note')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                labelMode === 'note'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setLabelMode('qwerty')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                labelMode === 'qwerty'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              QWERTY
            </button>
            <button
              onClick={() => setLabelMode('none')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                labelMode === 'none'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clean
            </button>
          </div>
        </div>
      </div>

      {/* Piano Keys Visual Surface */}
      <div
        onMouseDown={() => setIsMouseDown(true)}
        className="relative w-full h-[140px] flex overflow-x-auto touch-pan-x py-1"
        style={{ touchAction: 'none' }}
      >
        <div className="relative flex flex-1 h-full min-w-[580px]">
          {/* White Keys */}
          {whiteKeys.map((k) => {
            const isActive = activePitches.has(k.pitch);
            const isMiddleC = k.pitch === 60;
            // Lookup matching qwerty key
            const qwertyKey = Object.keys(KEY_MAP).find(
              (q) => startPitch + KEY_MAP[q] === k.pitch
            );

            return (
              <button
                key={k.pitch}
                onMouseDown={() => handleNoteDown(k.pitch)}
                onMouseUp={() => handleNoteUp(k.pitch)}
                onMouseEnter={() => {
                  if (isMouseDown) handleNoteDown(k.pitch);
                }}
                onMouseLeave={() => {
                  if (isMouseDown) handleNoteUp(k.pitch);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleNoteDown(k.pitch);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleNoteUp(k.pitch);
                }}
                className={`relative flex-1 h-full rounded-b-md border-b-4 transition-all duration-75 flex flex-col justify-end items-center pb-2 select-none ${
                  isActive
                    ? 'bg-amber-400 border-amber-600 text-slate-950 translate-y-1 shadow-inner'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-[0_4px_6px_rgba(0,0,0,0.3)]'
                }`}
                style={{
                  marginRight: '1px',
                }}
                aria-label={`Piano key ${k.name}`}
              >
                {labelMode === 'note' && (
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      isMiddleC ? 'text-amber-600 font-bold underline' : 'text-slate-600'
                    }`}
                  >
                    {k.name}
                  </span>
                )}
                {labelMode === 'qwerty' && qwertyKey && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    {qwertyKey}
                  </span>
                )}
              </button>
            );
          })}

          {/* Black Keys Layered Absolutely */}
          {whiteKeys.map((wKey, index) => {
            const nextPitch = wKey.pitch + 1;
            const blackKey = keys.find((k) => k.pitch === nextPitch && k.isBlack);
            if (!blackKey) return null;

            const isActive = activePitches.has(blackKey.pitch);
            const qwertyKey = Object.keys(KEY_MAP).find(
              (q) => startPitch + KEY_MAP[q] === blackKey.pitch
            );

            // Calculate percentage left position based on white key index
            const leftPercent = ((index + 0.65) / whiteKeys.length) * 100;
            const widthPercent = (0.7 / whiteKeys.length) * 100;

            return (
              <button
                key={blackKey.pitch}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleNoteDown(blackKey.pitch);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleNoteUp(blackKey.pitch);
                }}
                onMouseEnter={() => {
                  if (isMouseDown) handleNoteDown(blackKey.pitch);
                }}
                onMouseLeave={() => {
                  if (isMouseDown) handleNoteUp(blackKey.pitch);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleNoteDown(blackKey.pitch);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleNoteUp(blackKey.pitch);
                }}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  height: '62%',
                }}
                className={`absolute z-10 rounded-b-[4px] transition-all duration-75 flex flex-col justify-end items-center pb-2 select-none shadow-md ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 translate-y-1'
                    : 'bg-gradient-to-b from-slate-800 to-slate-950 hover:to-slate-900 border border-slate-700 text-slate-300'
                }`}
                aria-label={`Piano key ${blackKey.name}`}
              >
                {labelMode === 'note' && (
                  <span className="text-[8px] font-mono font-semibold text-slate-300">
                    {blackKey.name.replace('#', '♯')}
                  </span>
                )}
                {labelMode === 'qwerty' && qwertyKey && (
                  <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">
                    {qwertyKey}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
