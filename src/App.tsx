import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cable,
  Music,
  Sliders,
  FolderOpen,
  Volume2,
  Trash2,
  Eye,
  Info,
  Maximize2,
  Layers,
  Sparkles,
} from 'lucide-react';

import {
  InstrumentSound,
  NoteEvent,
  ProjectData,
  QuantizeSetting,
  TimeSignature,
  TransportState,
} from './types/music';

import { audioEngine } from './audio/audioEngine';
import { midiManager } from './audio/midiManager';
import { quantizeNoteEvents, midiToNoteName } from './audio/quantizer';
import { DEMO_FUR_ELISE } from './data/demoTracks';

import { ScoreViewer } from './components/ScoreViewer';
import { PianoRoll } from './components/PianoRoll';
import { VirtualPiano } from './components/VirtualPiano';
import { TransportBar } from './components/TransportBar';
import { MidiDeviceModal } from './components/MidiDeviceModal';
import { QuantizePanel } from './components/QuantizePanel';
import { ProjectManagerModal } from './components/ProjectManagerModal';

export default function App() {
  // Project State
  const [project, setProject] = useState<ProjectData>(DEMO_FUR_ELISE);
  const [activePitches, setActivePitches] = useState<Set<number>>(new Set());

  // Transport State
  const [transportState, setTransportState] = useState<TransportState>('stopped');
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(true);
  const [countInEnabled, setCountInEnabled] = useState<boolean>(true);
  const [countInBeatsLeft, setCountInBeatsLeft] = useState<number>(4);
  const [viewMode, setViewMode] = useState<'both' | 'score' | 'pianoroll'>('both');

  // Modals
  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);
  const [isQuantizeModalOpen, setIsQuantizeModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [connectedMidiCount, setConnectedMidiCount] = useState<number>(0);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('Bentz Studio loaded');

  // Real-time recording references
  const recordingStartTimeRef = useRef<number>(0);
  const recordingStartBeatRef = useRef<number>(0);
  const activeRecordNotesRef = useRef<Map<number, { startBeat: number; velocity: number }>>(
    new Map()
  );
  const playbackAnimationRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartBeatRef = useRef<number>(0);

  // Initialize Audio & MIDI devices on mount
  useEffect(() => {
    // Attempt silent background probe for connected devices
    if (midiManager.isWebMidiSupported()) {
      midiManager
        .requestAccess()
        .then((res) => {
          if (res.success) {
            setConnectedMidiCount(midiManager.getConnectedDevices().length);
          }
        })
        .catch(() => {
          // Graceful fallback for Firefox or browsers requiring site permissions
        });
    }

    const unsubDevices = midiManager.onDevicesChange((devs) => {
      setConnectedMidiCount(devs.length);
    });
    return () => unsubDevices();
  }, []);

  // Live Note On Handler from MIDI hardware or Virtual Keyboard
  const handleNoteOn = useCallback(
    (pitch: number, velocity: number) => {
      // 1. Audio synthesis
      audioEngine.triggerNoteOn(pitch, velocity);

      // 2. Active visual highlights
      setActivePitches((prev) => {
        const next = new Set(prev);
        next.add(pitch);
        return next;
      });

      // 3. Recording accumulation if transport is in record state
      if (transportState === 'recording') {
        const now = performance.now();
        const secondsPerBeat = 60 / project.bpm;
        const elapsedSeconds = (now - recordingStartTimeRef.current) / 1000;
        const currentRecBeat = recordingStartBeatRef.current + elapsedSeconds / secondsPerBeat;

        activeRecordNotesRef.current.set(pitch, {
          startBeat: Math.max(0, currentRecBeat),
          velocity,
        });
      }
    },
    [transportState, project.bpm]
  );

  // Live Note Off Handler
  const handleNoteOff = useCallback(
    (pitch: number) => {
      // 1. Audio synthesis
      audioEngine.triggerNoteOff(pitch);

      // 2. Active visual highlights
      setActivePitches((prev) => {
        const next = new Set(prev);
        next.delete(pitch);
        return next;
      });

      // 3. Commit note if recording
      if (transportState === 'recording') {
        const draft = activeRecordNotesRef.current.get(pitch);
        if (draft) {
          const now = performance.now();
          const secondsPerBeat = 60 / project.bpm;
          const elapsedSeconds = (now - recordingStartTimeRef.current) / 1000;
          const currentRecBeat = recordingStartBeatRef.current + elapsedSeconds / secondsPerBeat;
          const duration = Math.max(0.125, currentRecBeat - draft.startBeat);

          const newNote: NoteEvent = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pitch,
            name: midiToNoteName(pitch),
            startBeat: draft.startBeat,
            durationBeats: duration,
            velocity: draft.velocity,
            rawStartBeat: draft.startBeat,
            rawDurationBeats: duration,
            clef: pitch >= 60 ? 'treble' : 'bass',
          };

          setProject((prev) => ({
            ...prev,
            notes: [...prev.notes, newNote],
          }));

          activeRecordNotesRef.current.delete(pitch);
        }
      }
    },
    [transportState, project.bpm]
  );

  // Subscribe to MIDI Manager events
  useEffect(() => {
    const unsubOn = midiManager.onNoteOn((pitch, velocity) => {
      handleNoteOn(pitch, velocity);
    });
    const unsubOff = midiManager.onNoteOff((pitch) => {
      handleNoteOff(pitch);
    });

    return () => {
      unsubOn();
      unsubOff();
    };
  }, [handleNoteOn, handleNoteOff]);

  // Synchronize Tone.js instrument & reverb with project settings
  useEffect(() => {
    audioEngine.setInstrument(project.instrument);
    audioEngine.setReverbWet(project.reverb);
    audioEngine.setMetronomeMute(!isMetronomeActive);
  }, [project.instrument, project.reverb, isMetronomeActive]);

  // Transport: Play
  const handlePlay = useCallback(async () => {
    await audioEngine.initAudio();
    audioEngine.stopPlayback();

    setTransportState('playing');
    setSrAnnouncement('Playback started');

    playbackStartTimeRef.current = performance.now();
    playbackStartBeatRef.current = currentBeat;

    // Schedule audio playback in Tone.js
    audioEngine.scheduleScorePlayback(project.notes, project.bpm, currentBeat, () => {
      setTransportState('stopped');
      setCurrentBeat(0);
      setSrAnnouncement('Playback finished');
    });

    // 60FPS UI Playhead Cursor Loop
    const secondsPerBeat = 60 / project.bpm;
    const updatePlayhead = () => {
      const elapsedSeconds = (performance.now() - playbackStartTimeRef.current) / 1000;
      const beat = playbackStartBeatRef.current + elapsedSeconds / secondsPerBeat;
      setCurrentBeat(beat);

      // Play metronome clicks during playback if active
      if (isMetronomeActive) {
        const beatInt = Math.floor(beat);
        const lastBeatInt = Math.floor(beat - 0.03);
        if (beatInt > lastBeatInt) {
          const beatsPerMeasure =
            (project.timeSignature.numerator / project.timeSignature.denominator) * 4;
          const isDownbeat = beatInt % beatsPerMeasure === 0;
          audioEngine.playMetronomeClick(isDownbeat);
        }
      }

      playbackAnimationRef.current = requestAnimationFrame(updatePlayhead);
    };

    playbackAnimationRef.current = requestAnimationFrame(updatePlayhead);
  }, [currentBeat, project.notes, project.bpm, project.timeSignature, isMetronomeActive]);

  // Transport: Pause
  const handlePause = useCallback(() => {
    if (playbackAnimationRef.current) {
      cancelAnimationFrame(playbackAnimationRef.current);
      playbackAnimationRef.current = null;
    }
    audioEngine.pausePlayback();
    setTransportState('paused');
    setSrAnnouncement('Playback paused');
  }, []);

  // Transport: Stop
  const handleStop = useCallback(() => {
    if (playbackAnimationRef.current) {
      cancelAnimationFrame(playbackAnimationRef.current);
      playbackAnimationRef.current = null;
    }
    audioEngine.stopPlayback();

    // Commit any dangling notes if stopping during record
    if (transportState === 'recording') {
      const now = performance.now();
      const secondsPerBeat = 60 / project.bpm;
      const elapsedSeconds = (now - recordingStartTimeRef.current) / 1000;
      const currentRecBeat = recordingStartBeatRef.current + elapsedSeconds / secondsPerBeat;

      activeRecordNotesRef.current.forEach((draft, pitch) => {
        const duration = Math.max(0.125, currentRecBeat - draft.startBeat);
        const newNote: NoteEvent = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          pitch,
          name: midiToNoteName(pitch),
          startBeat: draft.startBeat,
          durationBeats: duration,
          velocity: draft.velocity,
          clef: pitch >= 60 ? 'treble' : 'bass',
        };
        setProject((p) => ({ ...p, notes: [...p.notes, newNote] }));
      });
      activeRecordNotesRef.current.clear();
    }

    setTransportState('stopped');
    setCurrentBeat(0);
    setActivePitches(new Set());
    setSrAnnouncement('Transport stopped');
  }, [transportState, project.bpm]);

  // Transport: Record
  const handleRecord = useCallback(async () => {
    await audioEngine.initAudio();

    if (transportState === 'recording' || transportState === 'counting-in') {
      handleStop();
      return;
    }

    // Pre-roll Count-in
    if (countInEnabled) {
      setTransportState('counting-in');
      setSrAnnouncement('Count-in starting');
      let count = project.timeSignature.numerator;
      setCountInBeatsLeft(count);

      const msPerBeat = (60 / project.bpm) * 1000;
      audioEngine.playMetronomeClick(true);

      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountInBeatsLeft(count);
          audioEngine.playMetronomeClick(false);
        } else {
          clearInterval(interval);
          startTrueRecording();
        }
      }, msPerBeat);
    } else {
      startTrueRecording();
    }

    function startTrueRecording() {
      setTransportState('recording');
      setSrAnnouncement('Recording active');
      recordingStartTimeRef.current = performance.now();
      recordingStartBeatRef.current = currentBeat;
      playbackStartTimeRef.current = performance.now();
      playbackStartBeatRef.current = currentBeat;

      // Metronome and playhead during recording
      const secondsPerBeat = 60 / project.bpm;
      const updatePlayhead = () => {
        const elapsed = (performance.now() - playbackStartTimeRef.current) / 1000;
        const beat = playbackStartBeatRef.current + elapsed / secondsPerBeat;
        setCurrentBeat(beat);

        if (isMetronomeActive) {
          const beatInt = Math.floor(beat);
          const lastBeatInt = Math.floor(beat - 0.03);
          if (beatInt > lastBeatInt) {
            const beatsPerMeasure =
              (project.timeSignature.numerator / project.timeSignature.denominator) * 4;
            const isDownbeat = beatInt % beatsPerMeasure === 0;
            audioEngine.playMetronomeClick(isDownbeat);
          }
        }

        playbackAnimationRef.current = requestAnimationFrame(updatePlayhead);
      };

      playbackAnimationRef.current = requestAnimationFrame(updatePlayhead);
    }
  }, [
    transportState,
    countInEnabled,
    currentBeat,
    project.bpm,
    project.timeSignature,
    isMetronomeActive,
    handleStop,
  ]);

  // Quantize Application
  const handleApplyQuantization = useCallback(() => {
    const quantized = quantizeNoteEvents(project.notes, project.quantize);
    setProject((prev) => ({
      ...prev,
      notes: quantized,
    }));
    setSrAnnouncement(`Quantized ${quantized.length} notes to ${project.quantize.grid} grid`);
  }, [project.notes, project.quantize]);

  // Revert Quantization to Raw Performance
  const handleRevertToRaw = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      quantize: { ...prev.quantize, grid: 'off' },
      notes: prev.notes.map((n) => ({
        ...n,
        startBeat: n.rawStartBeat ?? n.startBeat,
        durationBeats: n.rawDurationBeats ?? n.durationBeats,
      })),
    }));
    setSrAnnouncement('Reverted score to raw micro-timing');
  }, []);

  // Delete individual note
  const handleDeleteNote = useCallback((noteId: string) => {
    setProject((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  }, []);

  // Clear all notes
  const handleClearScore = useCallback(() => {
    if (window.confirm('Clear all recorded notes from score?')) {
      handleStop();
      setProject((prev) => ({ ...prev, notes: [] }));
      setSrAnnouncement('Score cleared');
    }
  }, [handleStop]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (transportState === 'playing') handlePause();
        else handlePlay();
      } else if (e.code === 'KeyR' && (e.metaKey || e.ctrlKey || !e.repeat)) {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          handleRecord();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleStop();
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleStop();
        setCurrentBeat(0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [transportState, handlePlay, handlePause, handleRecord, handleStop]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Screen-reader live region */}
      <div className="sr-only" role="status" aria-live="polite">
        {srAnnouncement}
      </div>

      {/* Top Bar Contract: 1-line Brand wordmark — Nav links — 1 primary action */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
            <Music className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Bentz Studio
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setIsMidiModalOpen(true)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Cable className="w-4 h-4 text-emerald-400" />
            <span>Hardware MIDI ({connectedMidiCount})</span>
          </button>
          <button
            onClick={() => setIsQuantizeModalOpen(true)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Quantization ({project.quantize.grid})</span>
          </button>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span>Local Projects & MIDI</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMidiModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <Cable className="w-3.5 h-3.5" />
            <span>
              {connectedMidiCount > 0
                ? `${connectedMidiCount} MIDI Connected`
                : 'Connect MIDI Keyboard'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Transport Bar */}
      <TransportBar
        state={transportState}
        bpm={project.bpm}
        timeSignature={project.timeSignature}
        currentBeat={currentBeat}
        countInBeatsLeft={countInBeatsLeft}
        isMetronomeActive={isMetronomeActive}
        instrument={project.instrument}
        quantize={project.quantize}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onRecord={handleRecord}
        onRewind={() => {
          handleStop();
          setCurrentBeat(0);
        }}
        onBpmChange={(bpm) => setProject((p) => ({ ...p, bpm }))}
        onTimeSignatureChange={(ts) => setProject((p) => ({ ...p, timeSignature: ts }))}
        onMetronomeToggle={() => setIsMetronomeActive((prev) => !prev)}
        onInstrumentChange={(inst) => setProject((p) => ({ ...p, instrument: inst }))}
        onQuantizeChange={(q) => {
          setProject((p) => ({ ...p, quantize: q }));
          // Auto-apply if not off
          if (q.grid !== 'off') {
            const quantized = quantizeNoteEvents(project.notes, q);
            setProject((p) => ({ ...p, quantize: q, notes: quantized }));
          }
        }}
        onOpenQuantizeModal={() => setIsQuantizeModalOpen(true)}
        countInEnabled={countInEnabled}
        onToggleCountIn={() => setCountInEnabled((prev) => !prev)}
      />

      {/* Workspace Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Workspace Toolbar: Title, View Switcher & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{project.title}</h1>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-mono">
                {project.notes.length} notes recorded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-backend Web MIDI & Web Audio workstation · Client-side VexFlow engraving
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Segmented Control */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('both')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'both'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dual View
              </button>
              <button
                onClick={() => setViewMode('score')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'score'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Score Only
              </button>
              <button
                onClick={() => setViewMode('pianoroll')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'pianoroll'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Piano Roll
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sessions, Presets & MIDI Export"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearScore}
              disabled={project.notes.length === 0}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
              title="Clear Score"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Notation Sheet (VexFlow SVG) */}
        {(viewMode === 'both' || viewMode === 'score') && (
          <section aria-label="Music Notation Sheet">
            <ScoreViewer
              notes={project.notes}
              bpm={project.bpm}
              timeSignature={project.timeSignature}
              currentBeat={currentBeat}
              isPlaying={transportState === 'playing'}
            />
          </section>
        )}

        {/* Dynamic Piano Roll Timeline */}
        {(viewMode === 'both' || viewMode === 'pianoroll') && (
          <section aria-label="Piano Roll Sequencer">
            <PianoRoll
              notes={project.notes}
              timeSignature={project.timeSignature}
              currentBeat={currentBeat}
              onSeek={(beat) => {
                setCurrentBeat(beat);
                playbackStartBeatRef.current = beat;
                playbackStartTimeRef.current = performance.now();
              }}
              onDeleteNote={handleDeleteNote}
              activePitches={activePitches}
            />
          </section>
        )}

        {/* Interactive Virtual Piano Keyboard */}
        <section aria-label="Interactive Virtual Piano Keyboard">
          <VirtualPiano activePitches={activePitches} />
        </section>

        {/* Technical Architecture & Precision Reference Callout */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-xs text-slate-400 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-300 font-semibold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Architectural Rigor: Zero-Backend Web Audio & Web MIDI Subsystems</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">100% Client-Side CPU</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-200">1. Sub-Millisecond Web MIDI</h4>
              <p className="text-slate-400 leading-relaxed">
                Processes raw 31.25 kbaud MIDI packets via{' '}
                <code className="text-amber-300">navigator.requestMIDIAccess</code>. Decodes Note On
                (0x90), Note Off (0x80), Pitch Bend (0xE0), and CC 64 Damper Sustain without network
                hops.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-200">2. Mathematical Quantization</h4>
              <p className="text-slate-400 leading-relaxed">
                Applies linear harmonic interpolation:{' '}
                <code className="text-amber-300">
                  T_quant = T_raw + (T_target - T_raw) * (Strength/100)
                </code>
                . Supports 1/4 down to 1/32, triplets (0.333b), and asymmetrical swing groove offsets.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-200">3. VexFlow 5 SVG Vector Engraving</h4>
              <p className="text-slate-400 leading-relaxed">
                Dynamically partitions notes into grand staff voices, computes fractional beam
                durations, calculates accidental pitch offsets, and inserts musical rests directly in
                browser DOM.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0B0F17] py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Bentz Studio</span>
            <span>·</span>
            <span>Free & Open Source Music Notation & MIDI Composer</span>
            <span>·</span>
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Web MIDI API</span>
            <span>·</span>
            <span>Web Audio API (Tone.js)</span>
            <span>·</span>
            <span>VexFlow 5</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MidiDeviceModal isOpen={isMidiModalOpen} onClose={() => setIsMidiModalOpen(false)} />

      <QuantizePanel
        isOpen={isQuantizeModalOpen}
        onClose={() => setIsQuantizeModalOpen(false)}
        quantize={project.quantize}
        bpm={project.bpm}
        onQuantizeChange={(q) => setProject((p) => ({ ...p, quantize: q }))}
        onApplyQuantization={handleApplyQuantization}
        onRevertToRaw={handleRevertToRaw}
        notesCount={project.notes.length}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentProject={project}
        onLoadProject={(proj) => {
          handleStop();
          setProject(proj);
          setCurrentBeat(0);
        }}
      />
    </div>
  );
}
