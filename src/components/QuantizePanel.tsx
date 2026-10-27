import React from 'react';
import { X, Sliders, Sparkles, Check, RotateCcw } from 'lucide-react';
import { QuantizeGrid, QuantizeSetting } from '../types/music';
import { getGridStep } from '../audio/quantizer';

interface QuantizePanelProps {
  isOpen: boolean;
  onClose: () => void;
  quantize: QuantizeSetting;
  bpm: number;
  onQuantizeChange: (q: QuantizeSetting) => void;
  onApplyQuantization: () => void;
  onRevertToRaw: () => void;
  notesCount: number;
}

export const QuantizePanel: React.FC<QuantizePanelProps> = ({
  isOpen,
  onClose,
  quantize,
  bpm,
  onQuantizeChange,
  onApplyQuantization,
  onRevertToRaw,
  notesCount,
}) => {
  if (!isOpen) return null;

  const gridOptions: { label: string; value: QuantizeGrid; description: string }[] = [
    { label: 'Off', value: 'off', description: 'Raw human performance (Zero timing alterations)' },
    { label: '1/4 Note', value: '1/4', description: 'Quarter notes (1.0 beat per subdivision)' },
    { label: '1/8 Note', value: '1/8', description: 'Eighth notes (0.50 beat / standard pop/rock groove)' },
    { label: '1/8 Triplet', value: '1/8T', description: 'Eighth triplets (0.333 beat / blues, swing, jazz)' },
    { label: '1/16 Note', value: '1/16', description: 'Sixteenth notes (0.25 beat / funk, hip-hop, classical)' },
    { label: '1/16 Triplet', value: '1/16T', description: 'Sixteenth triplets (0.166 beat / fast ornamentation)' },
    { label: '1/32 Note', value: '1/32', description: 'Thirty-second notes (0.125 beat / precision rolls)' },
  ];

  const currentStep = getGridStep(quantize.grid);
  const msPerBeat = (60 / bpm) * 1000;
  const msPerGridStep = currentStep > 0 ? currentStep * msPerBeat : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Mathematical Note Quantizer</h2>
              <p className="text-xs text-slate-400">High-precision micro-timing correction & groove engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm max-h-[75vh] overflow-y-auto">
          {/* Grid Division Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Grid Division Interval
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gridOptions.map((opt) => {
                const isSelected = quantize.grid === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onQuantizeChange({ ...quantize, grid: opt.value })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 text-slate-100'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mathematical Timing Formulas & Resolution */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
              <span>Current Grid Step (Δ):</span>
              <span className="text-amber-400 font-bold">
                {currentStep > 0 ? `${currentStep.toFixed(4)} beats` : 'None (Continuous)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
              <span>Time Resolution at {bpm} BPM:</span>
              <span className="text-emerald-400 font-bold">
                {msPerGridStep > 0 ? `${msPerGridStep.toFixed(1)} ms / slot` : '1.0 ms raw'}
              </span>
            </div>
            <div className="pt-1 text-[11px] text-slate-400 space-y-1">
              <p className="text-slate-500">Quantization Math Algorithm:</p>
              <p className="text-slate-300">T_target = round(T_raw / Δ) * Δ</p>
              <p className="text-slate-300">T_quantized = T_raw + (T_target - T_raw) * (Strength / 100)</p>
            </div>
          </div>

          {/* Sliders: Strength & Swing */}
          <div className="space-y-4">
            {/* Strength */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Quantize Strength (Snapping Rigidity)</span>
                <span className="font-mono font-bold text-amber-400">{quantize.strength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={quantize.strength}
                onChange={(e) =>
                  onQuantizeChange({ ...quantize, strength: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0% (Raw feel)</span>
                <span>50% (Human groove)</span>
                <span>100% (Strict machine lock)</span>
              </div>
            </div>

            {/* Swing Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Swing & Shuffle Groove</span>
                <span className="font-mono font-bold text-amber-400">
                  {quantize.swing > 0 ? `+${quantize.swing}%` : `${quantize.swing}%`}
                </span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={quantize.swing}
                onChange={(e) =>
                  onQuantizeChange({ ...quantize, swing: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-50% (Rushed)</span>
                <span>0% (Straight time)</span>
                <span>+50% (Swing feel)</span>
              </div>
            </div>

            {/* Quantize Note Length / Duration checkbox */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="quantize-dur"
                checked={quantize.quantizeDuration}
                onChange={(e) =>
                  onQuantizeChange({ ...quantize, quantizeDuration: e.target.checked })
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
              />
              <label htmlFor="quantize-dur" className="text-xs text-slate-300 cursor-pointer select-none">
                Quantize note durations & releases (snaps note lengths to discrete note values)
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onRevertToRaw}
            disabled={notesCount === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Revert to Raw</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onApplyQuantization();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply to Score ({notesCount} notes)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
