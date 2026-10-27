import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Cable,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Keyboard,
  Play,
  Sparkles,
} from 'lucide-react';
import { midiManager } from '../audio/midiManager';
import { audioEngine } from '../audio/audioEngine';
import { MidiDeviceInfo, MidiMessageLog } from '../types/music';

interface MidiDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MidiDeviceModal: React.FC<MidiDeviceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<
    'firefox-addon' | 'permission-denied' | 'unsupported' | 'iframe-policy' | 'generic' | null
  >(null);
  const [recentLogs, setRecentLogs] = useState<MidiMessageLog[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setIsSupported(midiManager.isWebMidiSupported());
    setDevices(midiManager.getConnectedDevices());

    const unsubscribeDevices = midiManager.onDevicesChange((devs) => {
      setDevices(devs);
    });

    const unsubscribeLogs = midiManager.onRawMessage((log) => {
      setRecentLogs((prev) => [log, ...prev.slice(0, 7)]);
    });

    return () => {
      unsubscribeDevices();
      unsubscribeLogs();
    };
  }, []);

  const handleScanMidi = async () => {
    setIsRequesting(true);
    setErrorMsg(null);
    setErrorCategory(null);
    const result = await midiManager.requestAccess();
    setIsRequesting(false);
    if (!result.success && result.error) {
      setErrorMsg(result.error);
      setErrorCategory(result.errorCategory || 'generic');
    } else {
      setDevices(midiManager.getConnectedDevices());
      setErrorMsg(null);
      setErrorCategory(null);
    }
  };

  const handleCopyAppUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleTestNote = (pitch: number = 60) => {
    audioEngine.initAudio();
    audioEngine.triggerNoteOn(pitch, 100);
    midiManager.injectNoteOn(pitch, 100);
    setTimeout(() => {
      audioEngine.triggerNoteOff(pitch);
      midiManager.injectNoteOff(pitch);
    }, 350);
  };

  if (!isOpen) return null;

  const isFirefoxIssue =
    errorCategory === 'firefox-addon' ||
    (errorMsg && errorMsg.toLowerCase().includes('site permission add-on'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Hardware MIDI Keyboard Setup</h2>
              <p className="text-xs text-slate-400">
                Connect external USB / Bluetooth keyboard or use built-in virtual keys
              </p>
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1">
          {/* Status banner */}
          {!isSupported ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold mb-1">Web MIDI API Unsupported in this Browser</p>
                <p>
                  Safari and some mobile browsers do not support hardware Web MIDI. For plug-and-play
                  hardware MIDI keyboard support, use <strong>Google Chrome</strong>,{' '}
                  <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                </p>
              </div>
            </div>
          ) : isFirefoxIssue ? (
            /* Specific, actionable Firefox Guidance */
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-slate-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-300 text-sm">
                    Firefox Web MIDI Permission Policy
                  </h3>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                    Mozilla Firefox blocks hardware MIDI access by default and requires a site permission
                    add-on or custom flag to protect hardware interfaces.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {/* Solution A: Chrome / Edge recommendation */}
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recommended: Open in Chrome, Edge, or Brave</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Chromium browsers have native hardware MIDI drivers with zero configuration or add-ons.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyAppUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied URL!' : 'Copy Link'}</span>
                  </button>
                </div>

                {/* Solution B: Firefox about:config instructions */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-200">How to enable Web MIDI in Firefox:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-1">
                    <li>
                      Type <code className="text-amber-300 font-mono">about:config</code> in your address bar and press Enter.
                    </li>
                    <li>
                      Search for <code className="text-amber-300 font-mono">dom.webmidi.enabled</code>.
                    </li>
                    <li>
                      Toggle it to <code className="text-emerald-400 font-mono">true</code>, then refresh this page.
                    </li>
                  </ol>
                </div>

                {/* Solution C: Instant Virtual Keyboard fallback */}
                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Built-in Keyboard Ready (No Add-on Needed)</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You can play, compose, record, quantize, and export MIDI right now using your computer QWERTY keyboard or mouse!
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium rounded-lg text-xs transition-colors shrink-0"
                  >
                    Use Virtual Keys
                  </button>
                </div>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">MIDI Permission Note</p>
                <p>{errorMsg}</p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Check your browser site permissions (click the icon to the left of the URL bar) and
                  allow MIDI access.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Web MIDI Subsystem Ready · Zero latency client-side stream</span>
              </div>
              <button
                onClick={handleScanMidi}
                disabled={isRequesting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium rounded-lg text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                <span>Scan Hardware</span>
              </button>
            </div>
          )}

          {/* Connected Device List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Detected Hardware Inputs ({devices.length})
              </span>
              <span className="text-xs text-slate-500">Hot-plug supported</span>
            </div>

            {devices.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-400 space-y-2">
                <p>No external hardware MIDI keyboard connected yet.</p>
                <p className="text-slate-500">
                  Connect your USB keyboard (Roland, Yamaha, Akai, Novation, Casio, etc.) and click
                  <strong> Scan Hardware</strong>, or play directly via the on-screen keys.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleScanMidi}
                    disabled={isRequesting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                    <span>Scan for Hardware</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setSelectedDevice(null);
                    midiManager.selectDevice(null);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    selectedDevice === null
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="font-semibold">All Connected Hardware (Omni Listen)</p>
                      <p className="text-[11px] text-slate-400">Captures events from all plugged MIDI inputs</p>
                    </div>
                  </div>
                  {selectedDevice === null && (
                    <span className="text-[11px] text-amber-400 font-mono font-medium">Selected</span>
                  )}
                </div>

                {devices.map((device) => {
                  const isSelected = selectedDevice === device.id;
                  return (
                    <div
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device.id);
                        midiManager.selectDevice(device.id);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-slate-100">{device.name}</p>
                          <p className="text-[11px] text-slate-400">
                            Manufacturer: {device.manufacturer} · State: {device.state}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[11px] text-amber-400 font-mono font-medium">Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Hardware Message Diagnostic Monitor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Live MIDI Packet Monitor
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestNote(60)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded transition-colors"
                >
                  Test Note (C4)
                </button>
                <span className="text-[11px] font-mono text-slate-500">31.25 kbaud Stream</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] h-28 overflow-y-auto space-y-1">
              {recentLogs.length === 0 ? (
                <div className="text-slate-600 italic py-2">
                  Awaiting MIDI key press, pitch wheel, or sustain pedal action...
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-slate-300 border-b border-slate-900/80 pb-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.type === 'note-on'
                            ? 'bg-emerald-400'
                            : log.type === 'note-off'
                            ? 'bg-slate-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      <span>{log.description}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">
                      0x{log.status.toString(16).toUpperCase()} {log.data1} {log.data2}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Works natively in Chrome, Edge, & Brave · Virtual piano active in all browsers
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
