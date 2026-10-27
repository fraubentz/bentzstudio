import { MidiDeviceInfo, MidiMessageLog } from '../types/music';
import { midiToNoteName } from './quantizer';

export class MidiManager {
  private static instance: MidiManager | null = null;
  private midiAccess: MIDIAccess | null = null;
  private isSupported: boolean = false;
  private connectedInputs: Map<string, MIDIInput> = new Map();
  private selectedInputId: string | null = null;

  // Active listeners
  private noteOnListeners: Set<(pitch: number, velocity: number, timestamp: number) => void> = new Set();
  private noteOffListeners: Set<(pitch: number, timestamp: number) => void> = new Set();
  private deviceListeners: Set<(devices: MidiDeviceInfo[]) => void> = new Set();
  private rawMessageListeners: Set<(log: MidiMessageLog) => void> = new Set();

  // Sustain pedal (CC 64) state
  private isSustainPedalDown = false;
  private sustainedNotes = new Set<number>();

  private constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public static getInstance(): MidiManager {
    if (!MidiManager.instance) {
      MidiManager.instance = new MidiManager();
    }
    return MidiManager.instance;
  }

  public isWebMidiSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Request MIDI access from the browser with browser-specific diagnosis
   */
  public async requestAccess(): Promise<{
    success: boolean;
    error?: string;
    errorCategory?: 'firefox-addon' | 'permission-denied' | 'unsupported' | 'iframe-policy' | 'generic';
  }> {
    if (!this.isSupported) {
      return {
        success: false,
        error: 'Web MIDI API is not natively supported in this browser. Use Chrome, Edge, Brave, or Opera, or play via the on-screen keyboard.',
        errorCategory: 'unsupported',
      };
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      // Handle hot-plugging / unplugging
      this.midiAccess.onstatechange = () => {
        this.updateConnectedDevices();
      };

      this.updateConnectedDevices();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();

      let category: 'firefox-addon' | 'permission-denied' | 'unsupported' | 'iframe-policy' | 'generic' = 'generic';

      if (lower.includes('site permission add-on') || lower.includes('add-on') || (lower.includes('firefox') && lower.includes('permission'))) {
        category = 'firefox-addon';
      } else if (lower.includes('permission') || lower.includes('notallowederror') || lower.includes('denied')) {
        category = 'permission-denied';
      } else if (lower.includes('securityerror') || lower.includes('feature policy') || lower.includes('iframe') || lower.includes('permissions policy')) {
        category = 'iframe-policy';
      }

      return {
        success: false,
        error: message,
        errorCategory: category,
      };
    }
  }

  private updateConnectedDevices() {
    if (!this.midiAccess) return;

    this.connectedInputs.clear();
    const deviceList: MidiDeviceInfo[] = [];

    this.midiAccess.inputs.forEach((input: MIDIInput) => {
      this.connectedInputs.set(input.id, input);
      deviceList.push({
        id: input.id,
        name: input.name || `MIDI Device (${input.id})`,
        manufacturer: input.manufacturer || 'Generic',
        state: input.state || 'connected',
        connection: input.connection || 'open',
        type: 'input',
      });

      // Bind listener to every input so user can play any connected device
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (!this.selectedInputId || this.selectedInputId === input.id) {
          this.handleMidiMessage(event);
        }
      };
    });

    // Notify listeners
    this.deviceListeners.forEach((listener) => listener(deviceList));
  }

  public getConnectedDevices(): MidiDeviceInfo[] {
    if (!this.midiAccess) return [];
    const list: MidiDeviceInfo[] = [];
    this.midiAccess.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || `MIDI Input (${input.id})`,
        manufacturer: input.manufacturer || 'Generic',
        state: input.state || 'connected',
        connection: input.connection || 'open',
        type: 'input',
      });
    });
    return list;
  }

  public selectDevice(deviceId: string | null) {
    this.selectedInputId = deviceId;
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    if (!event.data || event.data.length < 2) return;

    const data = event.data;
    const status = data[0];
    const command = status >> 4;
    const channel = (status & 0x0f) + 1;
    const data1 = data[1];
    const data2 = data.length > 2 ? data[2] : 0;
    const timestamp = performance.now();

    let messageType: MidiMessageLog['type'] = 'other';
    let description = `Ch ${channel}: 0x${status.toString(16).toUpperCase()}`;

    // Note On (command 0x9) or Note Off (command 0x8)
    if (command === 0x9) {
      if (data2 > 0) {
        // True Note On
        messageType = 'note-on';
        const noteName = midiToNoteName(data1);
        description = `Note On: ${noteName} (${data1}), Vel: ${data2}`;
        this.emitNoteOn(data1, data2, timestamp);
      } else {
        // Note On with velocity 0 is Note Off
        messageType = 'note-off';
        const noteName = midiToNoteName(data1);
        description = `Note Off: ${noteName} (${data1})`;
        this.emitNoteOff(data1, timestamp);
      }
    } else if (command === 0x8) {
      // Note Off
      messageType = 'note-off';
      const noteName = midiToNoteName(data1);
      description = `Note Off: ${noteName} (${data1})`;
      this.emitNoteOff(data1, timestamp);
    } else if (command === 0xb) {
      // Control Change
      messageType = 'cc';
      description = `CC #${data1} = ${data2}`;
      // Sustain Pedal CC 64
      if (data1 === 64) {
        this.isSustainPedalDown = data2 >= 64;
        description = `Sustain: ${this.isSustainPedalDown ? 'DOWN' : 'UP'}`;
        if (!this.isSustainPedalDown && this.sustainedNotes.size > 0) {
          // Release notes that were held by sustain pedal
          this.sustainedNotes.forEach((pitch) => {
            this.noteOffListeners.forEach((l) => l(pitch, timestamp));
          });
          this.sustainedNotes.clear();
        }
      }
    } else if (command === 0xe) {
      // Pitch Bend
      messageType = 'pitch-bend';
      const bendValue = (data2 << 7) | data1;
      description = `Pitch Bend: ${bendValue}`;
    }

    // Log broadcast
    const log: MidiMessageLog = {
      id: `${timestamp}_${Math.random()}`,
      timestamp,
      status,
      type: messageType,
      data1,
      data2,
      description,
    };
    this.rawMessageListeners.forEach((listener) => listener(log));
  }

  private emitNoteOn(pitch: number, velocity: number, timestamp: number) {
    if (this.sustainedNotes.has(pitch)) {
      this.sustainedNotes.delete(pitch);
    }
    this.noteOnListeners.forEach((l) => l(pitch, velocity, timestamp));
  }

  private emitNoteOff(pitch: number, timestamp: number) {
    if (this.isSustainPedalDown) {
      this.sustainedNotes.add(pitch);
    } else {
      this.noteOffListeners.forEach((l) => l(pitch, timestamp));
    }
  }

  /**
   * Inject note events manually (e.g. from Virtual Keyboard)
   */
  public injectNoteOn(pitch: number, velocity: number = 100) {
    this.emitNoteOn(pitch, velocity, performance.now());
  }

  public injectNoteOff(pitch: number) {
    this.emitNoteOff(pitch, performance.now());
  }

  // Listener subscriptions
  public onNoteOn(callback: (pitch: number, velocity: number, timestamp: number) => void): () => void {
    this.noteOnListeners.add(callback);
    return () => this.noteOnListeners.delete(callback);
  }

  public onNoteOff(callback: (pitch: number, timestamp: number) => void): () => void {
    this.noteOffListeners.add(callback);
    return () => this.noteOffListeners.delete(callback);
  }

  public onDevicesChange(callback: (devices: MidiDeviceInfo[]) => void): () => void {
    this.deviceListeners.add(callback);
    return () => this.deviceListeners.delete(callback);
  }

  public onRawMessage(callback: (log: MidiMessageLog) => void): () => void {
    this.rawMessageListeners.add(callback);
    return () => this.rawMessageListeners.delete(callback);
  }
}

export const midiManager = MidiManager.getInstance();
