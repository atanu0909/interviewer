// Voice Synthesis Manager — TTS wrapper with voice selection and queue system

export class VoiceSynthesis {
  constructor(options = {}) {
    this.preferredVoiceNames = options.preferredVoiceNames || [
      'Google UK English Female',
      'Google UK English Male',
      'Microsoft Zira',
      'Microsoft David',
      'Google US English',
      'Samantha',
      'Alex',
    ];
    this.lang = options.lang || 'en-US';
    this.rate = options.rate || 0.95;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 1.0;
    this.selectedVoice = null;
    this.isSpeaking = false;
    this.queue = [];
    this.currentUtterance = null;

    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onWord = options.onWord || (() => {});

    this._initVoices();
  }

  _initVoices() {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Try preferred voices first
      for (const name of this.preferredVoiceNames) {
        const found = voices.find(v =>
          v.name.toLowerCase().includes(name.toLowerCase())
        );
        if (found) {
          this.selectedVoice = found;
          break;
        }
      }

      // Fallback: first English voice
      if (!this.selectedVoice) {
        this.selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  speak(text) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !text) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.lang = this.lang;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          console.error('Speech synthesis error:', event.error);
        }
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          this.onWord(event.charIndex);
        }
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (typeof window === 'undefined') return;
    speechSynthesis.cancel();
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  pause() {
    if (typeof window === 'undefined') return;
    speechSynthesis.pause();
  }

  resume() {
    if (typeof window === 'undefined') return;
    speechSynthesis.resume();
  }

  getAvailableVoices() {
    if (typeof window === 'undefined') return [];
    return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }

  setVoice(voiceName) {
    const voices = speechSynthesis.getVoices();
    const found = voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  static isSupported() {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }
}
