import * as Tone from 'tone';
import { InstrumentSound, NoteEvent } from '../types/music';
import { midiToNoteName } from './quantizer';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private isInitialized = false;

  // Master output nodes
  private masterGain: Tone.Gain | null = null;
  private reverbNode: Tone.Reverb | null = null;
  private limiterNode: Tone.Limiter | null = null;

  // Synths
  private currentInstrument: InstrumentSound = 'grand-piano';
  private polySynth: Tone.PolySynth | null = null;

  // Metronome
  private metronomeHigh: Tone.Synth | null = null;
  private metronomeLow: Tone.Synth | null = null;
  private metronomeRepeatId: number | null = null;
  private isMetronomeMuted = false;

  // Active playing notes from MIDI or virtual piano (pitch -> noteName)
  private activeNotes = new Map<number, string>();

  // Scheduled playback part
  private playbackPart: Tone.Part | null = null;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Unlock and initialize Web Audio Context upon user interaction
   */
  public async initAudio(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await Tone.start();

      // Master output chain
      this.limiterNode = new Tone.Limiter(-0.5).toDestination();
      this.reverbNode = new Tone.Reverb({
        decay: 2.2,
        preDelay: 0.02,
        wet: 0.22,
      }).connect(this.limiterNode);
      await this.reverbNode.generate();

      this.masterGain = new Tone.Gain(0.85).connect(this.reverbNode);

      // Metronome synths (connected directly to limiter so reverb doesn't muddy click)
      this.metronomeHigh = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      }).connect(this.limiterNode);
      this.metronomeHigh.volume.value = -3;

      this.metronomeLow = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      }).connect(this.limiterNode);
      this.metronomeLow.volume.value = -6;

      this.setInstrument(this.currentInstrument);
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('AudioContext initialization deferred until user interaction:', err);
      return false;
    }
  }

  public getContextState(): string {
    return Tone.getContext().state;
  }

  public setInstrument(type: InstrumentSound) {
    this.currentInstrument = type;
    if (!this.masterGain) return;

    if (this.polySynth) {
      this.polySynth.releaseAll();
      this.polySynth.dispose();
      this.polySynth = null;
    }

    switch (type) {
      case 'grand-piano':
        // Warm multi-stage acoustic piano emulation
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle8' },
          envelope: {
            attack: 0.005,
            decay: 2.4,
            sustain: 0.15,
            release: 1.2,
          },
        }).connect(this.masterGain);
        this.polySynth.volume.value = -2;
        break;

      case 'rhodes':
        // Classic Rhodes electric piano using FM synthesis with harmonic bell ratio
        this.polySynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3.01,
          modulationIndex: 4,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.003,
            decay: 1.8,
            sustain: 0.25,
            release: 1.0,
          },
          modulation: { type: 'sine' },
          modulationEnvelope: {
            attack: 0.002,
            decay: 0.3,
            sustain: 0.1,
            release: 0.5,
          },
        }).connect(this.masterGain);
        this.polySynth.volume.value = -4;
        break;

      case 'warm-synth':
        // Analog polyphonic synth with dual saw/square blend and low-pass filter
        this.polySynth = new Tone.PolySynth(Tone.MonoSynth, {
          oscillator: { type: 'sawtooth' },
          filter: {
            Q: 2,
            type: 'lowpass',
            rolloff: -24,
          },
          envelope: {
            attack: 0.02,
            decay: 0.8,
            sustain: 0.5,
            release: 1.4,
          },
          filterEnvelope: {
            attack: 0.04,
            decay: 0.5,
            sustain: 0.4,
            release: 1.0,
            baseFrequency: 300,
            octaves: 3.5,
          },
        }).connect(this.masterGain);
        this.polySynth.volume.value = -7;
        break;

      case 'organ':
        // Rich tonewheel organ emulation with sustained sine harmonics
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'custom',
            partials: [1, 0.7, 0.4, 0.2, 0.1],
          },
          envelope: {
            attack: 0.008,
            decay: 0.1,
            sustain: 0.95,
            release: 0.2,
          },
        }).connect(this.masterGain);
        this.polySynth.volume.value = -6;
        break;
    }
  }

  public setReverbWet(amount: number) {
    if (this.reverbNode) {
      this.reverbNode.wet.value = Math.max(0, Math.min(1, amount));
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain) {
      // Linear 0..1 to gain value
      this.masterGain.gain.rampTo(Math.max(0, Math.min(1, vol)), 0.05);
    }
  }

  public setMetronomeMute(muted: boolean) {
    this.isMetronomeMuted = muted;
  }

  /**
   * Real-time live trigger on Note On (from hardware MIDI or on-screen keyboard)
   */
  public triggerNoteOn(pitch: number, velocity: number = 90) {
    if (!this.polySynth) {
      this.initAudio().then(() => this.triggerNoteOn(pitch, velocity));
      return;
    }

    const noteName = midiToNoteName(pitch);
    const normVel = Math.min(1, Math.max(0.05, velocity / 127));

    // Release prior voice if re-triggered
    if (this.activeNotes.has(pitch)) {
      this.triggerNoteOff(pitch);
    }

    try {
      this.polySynth.triggerAttack(noteName, Tone.now(), normVel);
      this.activeNotes.set(pitch, noteName);
    } catch {
      // Audio engine safe recovery
    }
  }

  /**
   * Real-time live trigger on Note Off
   */
  public triggerNoteOff(pitch: number) {
    if (!this.polySynth) return;

    const noteName = this.activeNotes.get(pitch);
    if (noteName) {
      try {
        this.polySynth.triggerRelease([noteName], Tone.now());
      } catch {
        // Fallback release
      }
      this.activeNotes.delete(pitch);
    }
  }

  /**
   * Immediately silence all ringing voices
   */
  public allNotesOff() {
    if (this.polySynth) {
      try {
        this.polySynth.releaseAll();
      } catch {
        // Safe catch
      }
    }
    this.activeNotes.clear();
  }

  /**
   * Play metronome click on beat with high precision
   */
  public playMetronomeClick(isDownbeat: boolean, time?: number) {
    if (this.isMetronomeMuted) return;
    const playTime = time ?? Tone.now();

    try {
      if (isDownbeat && this.metronomeHigh) {
        this.metronomeHigh.triggerAttackRelease('A6', '32n', playTime, 0.9);
      } else if (this.metronomeLow) {
        this.metronomeLow.triggerAttackRelease('E5', '32n', playTime, 0.6);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Schedule recorded notes for playback starting from a specific beat
   */
  public scheduleScorePlayback(
    notes: NoteEvent[],
    bpm: number,
    startBeat: number = 0,
    onComplete?: () => void
  ) {
    this.stopPlayback();

    Tone.getTransport().bpm.value = bpm;

    // Convert beat units to Tone.Time relative to startBeat
    const secondsPerBeat = 60 / bpm;

    // Filter notes occurring at or after startBeat
    const notesToPlay = notes.filter((n) => n.startBeat + n.durationBeats > startBeat);

    if (notesToPlay.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    // Determine total score duration
    let maxBeat = 0;
    notes.forEach((n) => {
      const end = n.startBeat + n.durationBeats;
      if (end > maxBeat) maxBeat = end;
    });

    const partEvents = notesToPlay.map((note) => {
      const beatOffset = Math.max(0, note.startBeat - startBeat);
      const timeOffset = beatOffset * secondsPerBeat;
      const durationSeconds = Math.max(0.08, note.durationBeats * secondsPerBeat);
      return {
        time: timeOffset,
        note: midiToNoteName(note.pitch),
        duration: durationSeconds,
        velocity: Math.min(1, Math.max(0.1, note.velocity / 127)),
      };
    });

    this.playbackPart = new Tone.Part((time, event) => {
      if (this.polySynth) {
        this.polySynth.triggerAttackRelease(
          event.note,
          event.duration,
          time,
          event.velocity
        );
      }
    }, partEvents);

    this.playbackPart.start(0);

    const totalSeconds = (maxBeat - startBeat) * secondsPerBeat + 0.5;
    Tone.getTransport().scheduleOnce(() => {
      if (onComplete) onComplete();
    }, `+${totalSeconds}`);

    Tone.getTransport().start();
  }

  public pausePlayback() {
    Tone.getTransport().pause();
  }

  public resumePlayback() {
    Tone.getTransport().start();
  }

  public stopPlayback() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    if (this.playbackPart) {
      this.playbackPart.dispose();
      this.playbackPart = null;
    }
    this.allNotesOff();
  }
}

export const audioEngine = AudioEngine.getInstance();
