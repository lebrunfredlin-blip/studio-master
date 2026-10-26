// Web Audio API ambient soundtrack synthesizer & Web Speech API French TTS

class AudioStudioEngine {
  private audioCtx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isMusicPlaying = false;
  private synthInterval: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  public mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.mediaStreamDestination = this.audioCtx.createMediaStreamDestination();
      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      
      // Route music gain to both speakers and recording stream
      this.musicGain.connect(this.audioCtx.destination);
      this.musicGain.connect(this.mediaStreamDestination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Get available voices from browser
  public getFrenchVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const allVoices = window.speechSynthesis.getVoices();
    const frVoices = allVoices.filter(v => v.lang.toLowerCase().startsWith('fr'));
    return frVoices.length > 0 ? frVoices : allVoices;
  }

  // Speak narration text in French with ducking
  public speak(
    text: string,
    options?: {
      voice?: SpeechSynthesisVoice;
      rate?: number;
      pitch?: number;
      onWord?: (charIndex: number, length: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options?.onEnd?.();
        return resolve();
      }

      this.stopSpeech();

      // Duck background music slightly while speaking
      this.duckMusic(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;

      if (options?.voice) {
        utterance.voice = options.voice;
      } else {
        const frVoices = this.getFrenchVoices();
        if (frVoices.length > 0) utterance.voice = frVoices[0];
      }

      utterance.onboundary = (e) => {
        if (e.name === 'word' && options?.onWord) {
          options.onWord(e.charIndex, (e as any).charLength || 5);
        }
      };

      utterance.onend = () => {
        this.duckMusic(false);
        this.currentUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (err) => {
        this.duckMusic(false);
        this.currentUtterance = null;
        options?.onError?.(err);
        resolve();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.duckMusic(false);
      this.currentUtterance = null;
    }
  }

  // Start procedural ambient soundtrack (Wes Anderson whimsical celesta / accordion / soft chords)
  public startAmbientMusic(mood: 'wes-anderson' | 'lofi' | 'cinema' | 'retro' = 'wes-anderson') {
    const ctx = this.getAudioContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    // Chords progressions (Frequencies in Hz)
    // Wes Anderson / Alexandre Desplat style: playful, light, symmetrical waltz
    const waProgression = [
      [261.63, 329.63, 392.00], // C maj
      [220.00, 261.63, 329.63], // A min
      [174.61, 220.00, 261.63], // F maj
      [196.00, 246.94, 293.66], // G maj
      [164.81, 196.00, 246.94], // E min
      [146.83, 174.61, 220.00], // D min
    ];

    let chordIdx = 0;
    const playChordStep = () => {
      if (!this.isMusicPlaying || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const chord = waProgression[chordIdx % waProgression.length];
      chordIdx++;

      // Play soft bass note
      this.playTone(chord[0] / 2, 'triangle', now, 1.2, 0.08);

      // Play arpeggiated celesta notes
      chord.forEach((freq, noteIdx) => {
        const noteTime = now + (noteIdx * 0.22);
        this.playTone(freq, 'sine', noteTime, 0.9, 0.07);
        // Soft harmonic overtone
        this.playTone(freq * 2, 'triangle', noteTime + 0.05, 0.5, 0.02);
      });
    };

    playChordStep();
    this.synthInterval = setInterval(playChordStep, 1400);
  }

  public stopAmbientMusic() {
    this.isMusicPlaying = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private playTone(freq: number, type: OscillatorType, startTime: number, duration: number, peakGain: number) {
    if (!this.audioCtx || !this.musicGain) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(noteGain);
      noteGain.connect(this.musicGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    } catch {
      // Audio node cleanup
    }
  }

  private duckMusic(duck: boolean) {
    if (!this.musicGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const targetVolume = duck ? 0.06 : 0.22;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.linearRampToValueAtTime(targetVolume, now + 0.3);
  }

  public getAudioStreamDestination(): MediaStreamAudioDestinationNode {
    this.getAudioContext();
    return this.mediaStreamDestination!;
  }
}

export const audioEngine = new AudioStudioEngine();
