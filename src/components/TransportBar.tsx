import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Circle,
  Volume2,
  VolumeX,
  Sliders,
  RotateCcw,
  Clock,
  Music2,
} from 'lucide-react';
import {
  InstrumentSound,
  QuantizeGrid,
  QuantizeSetting,
  TimeSignature,
  TransportState,
} from '../types/music';

interface TransportBarProps {
  state: TransportState;
  bpm: number;
  timeSignature: TimeSignature;
  currentBeat: number;
  countInBeatsLeft: number;
  isMetronomeActive: boolean;
  instrument: InstrumentSound;
  quantize: QuantizeSetting;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRewind: () => void;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  onMetronomeToggle: () => void;
  onInstrumentChange: (inst: InstrumentSound) => void;
  onQuantizeChange: (q: QuantizeSetting) => void;
  onOpenQuantizeModal: () => void;
  countInEnabled: boolean;
  onToggleCountIn: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  state,
  bpm,
  timeSignature,
  currentBeat,
  countInBeatsLeft,
  isMetronomeActive,
  instrument,
  quantize,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onRewind,
  onBpmChange,
  onTimeSignatureChange,
  onMetronomeToggle,
  onInstrumentChange,
  onQuantizeChange,
  onOpenQuantizeModal,
  countInEnabled,
  onToggleCountIn,
}) => {
  // Tap tempo logic
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimestamps.filter((t) => now - t < 3000);
    const newTaps = [...recent, now];
    setTapTimestamps(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  const beatsPerMeasure = (timeSignature.numerator / timeSignature.denominator) * 4;
  const currentMeasure = Math.floor(currentBeat / beatsPerMeasure) + 1;
  const currentMeasureBeat = (currentBeat % beatsPerMeasure) + 1;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-4">
      {/* Zone 1: Transport Controls (Play, Record, Stop, Rewind) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRewind}
          title="Rewind to start (Home)"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Rewind to beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Record Button */}
        <button
          onClick={onRecord}
          title={state === 'recording' ? 'Stop recording' : 'Record MIDI (Space + R)'}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
            state === 'recording'
              ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
              : state === 'counting-in'
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700'
          }`}
          aria-label={state === 'recording' ? 'Stop Recording' : 'Start Recording'}
        >
          <Circle
            className={`w-3.5 h-3.5 ${
              state === 'recording' ? 'fill-white text-white' : 'fill-red-500 text-red-500'
            }`}
          />
          <span className="font-semibold">
            {state === 'counting-in'
              ? `Count ${countInBeatsLeft}`
              : state === 'recording'
              ? 'Recording'
              : 'Record'}
          </span>
        </button>

        {/* Play / Pause Button */}
        {state === 'playing' ? (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-colors"
            aria-label="Pause playback"
          >
            <Pause className="w-4 h-4 fill-slate-950" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
            aria-label="Play score"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play</span>
          </button>
        )}

        {/* Stop Button */}
        <button
          onClick={onStop}
          title="Stop playback & reset playhead (Escape)"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            state !== 'stopped'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600 active:scale-95'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
          aria-label="Stop playback and rewind"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>

        {/* Digital Time / Position Counter */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 ml-2 font-mono tabular-nums text-xs">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Bar</span>
            <span className="text-amber-400 font-bold text-sm">
              {String(currentMeasure).padStart(2, '0')}
            </span>
          </div>
          <span className="text-slate-600 px-1.5 text-sm">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Beat</span>
            <span className="text-amber-400 font-bold text-sm">
              {currentMeasureBeat.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Metronome & Timing Settings */}
      <div className="flex items-center gap-3">
        {/* Metronome Toggle */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
          <button
            onClick={onMetronomeToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              isMetronomeActive
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label={isMetronomeActive ? 'Mute Metronome' : 'Enable Metronome'}
          >
            {isMetronomeActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Click</span>
          </button>

          <button
            onClick={onToggleCountIn}
            title="1 Bar Pre-Roll Count-in before recording"
            className={`px-2 py-1 text-[11px] font-mono rounded-md transition-colors ${
              countInEnabled
                ? 'bg-slate-700 text-amber-300 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            1-Bar Count
          </button>
        </div>

        {/* BPM Tempo Controls */}
        <div className="flex items-center bg-slate-850 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1 gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-12 bg-transparent text-xs font-mono font-bold text-slate-100 focus:outline-none text-right"
            aria-label="Tempo in BPM"
          />
          <span className="text-[10px] text-slate-400 uppercase font-semibold">BPM</span>
          <button
            onClick={handleTapTempo}
            className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 rounded font-medium transition-colors"
            title="Tap tempo rhythmically"
          >
            Tap
          </button>
        </div>

        {/* Time Signature */}
        <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg px-2 py-1 gap-1">
          <select
            value={`${timeSignature.numerator}/${timeSignature.denominator}`}
            onChange={(e) => {
              const [num, den] = e.target.value.split('/').map(Number);
              onTimeSignatureChange({ numerator: num, denominator: den });
            }}
            className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer"
            aria-label="Time Signature"
          >
            <option value="4/4" className="bg-slate-900 text-slate-100">4/4</option>
            <option value="3/4" className="bg-slate-900 text-slate-100">3/4</option>
            <option value="2/4" className="bg-slate-900 text-slate-100">2/4</option>
            <option value="6/8" className="bg-slate-900 text-slate-100">6/8</option>
          </select>
        </div>
      </div>

      {/* Zone 3: Instrument & Quantize Controls */}
      <div className="flex items-center gap-3">
        {/* Instrument Selector */}
        <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1 gap-2">
          <Music2 className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={instrument}
            onChange={(e) => onInstrumentChange(e.target.value as InstrumentSound)}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            aria-label="Synthesizer Instrument Timbre"
          >
            <option value="grand-piano" className="bg-slate-900 text-slate-100">Acoustic Grand</option>
            <option value="rhodes" className="bg-slate-900 text-slate-100">Rhodes Electric</option>
            <option value="warm-synth" className="bg-slate-900 text-slate-100">Analog Poly Synth</option>
            <option value="organ" className="bg-slate-900 text-slate-100">Tonewheel Organ</option>
          </select>
        </div>

        {/* Quantize Quick Selector */}
        <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg p-0.5 gap-1">
          <button
            onClick={onOpenQuantizeModal}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            title="Inspect mathematical quantization parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px] font-semibold text-amber-300">
              {quantize.grid === 'off' ? 'Raw' : quantize.grid}
            </span>
          </button>

          <select
            value={quantize.grid}
            onChange={(e) =>
              onQuantizeChange({
                ...quantize,
                grid: e.target.value as QuantizeGrid,
              })
            }
            className="bg-transparent text-[11px] font-mono text-slate-300 px-1.5 py-0.5 rounded focus:outline-none cursor-pointer"
            aria-label="Quantize Grid Division"
          >
            <option value="off" className="bg-slate-900 text-slate-100">Off (Raw)</option>
            <option value="1/4" className="bg-slate-900 text-slate-100">1/4 Note</option>
            <option value="1/8" className="bg-slate-900 text-slate-100">1/8 Note</option>
            <option value="1/8T" className="bg-slate-900 text-slate-100">1/8 Triplet</option>
            <option value="1/16" className="bg-slate-900 text-slate-100">1/16 Note</option>
            <option value="1/16T" className="bg-slate-900 text-slate-100">1/16 Triplet</option>
            <option value="1/32" className="bg-slate-900 text-slate-100">1/32 Note</option>
          </select>
        </div>
      </div>
    </div>
  );
};
