// Speech Recognition Manager — Web Speech API wrapper with silence detection
// Optimized for Indian English (en-IN)

export class SpeechManager {
  constructor(options = {}) {
    this.lang = options.lang || 'en-IN';
    this.silenceTimeout = options.silenceTimeout || 8000;
    this.maxSilenceTimeout = options.maxSilenceTimeout || 15000;
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.silenceTimer = null;
    this.maxSilenceTimer = null;
    this.lastSpeechTime = null;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 5;
    this.intentionallyStopped = false;
    this.hasSpeechStarted = false;

    // Callbacks
    this.onResult = options.onResult || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onSilence = options.onSilence || (() => {});
    this.onMaxSilence = options.onMaxSilence || (() => {});
    this.onError = options.onError || (() => {});
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onSpeechDetected = options.onSpeechDetected || (() => {});

    this._initRecognition();
  }

  _initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Web Speech API is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.restartAttempts = 0;
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        this.transcript += ' ' + finalTranscript;
        this.transcript = this.transcript.trim();
        this.onResult(this.transcript);
      }

      if (interimTranscript) {
        this.interimTranscript = interimTranscript;
        this.onInterim(interimTranscript);
      }

      // Reset silence timers on speech
      this.lastSpeechTime = Date.now();
      this.hasSpeechStarted = true;
      this.onSpeechDetected();
      this._resetSilenceTimer();
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        // This is expected during silence, don't treat as error
        return;
      }
      if (event.error === 'aborted' && this.intentionallyStopped) {
        return;
      }
      console.error('Speech recognition error:', event.error);
      this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      
      // Auto-restart if not intentionally stopped
      if (!this.intentionallyStopped && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        try {
          setTimeout(() => {
            if (!this.intentionallyStopped) {
              this.recognition.start();
            }
          }, 200);
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      } else {
        this.onEnd();
      }
    };
  }

  start() {
    if (!this.recognition) {
      this._initRecognition();
      if (!this.recognition) return false;
    }

    this.intentionallyStopped = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.restartAttempts = 0;
    this.hasSpeechStarted = false;

    try {
      this.recognition.start();
      this.lastSpeechTime = Date.now();
      this._startSilenceTimer();
      this._startMaxSilenceTimer();
      return true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
      // Try stopping first then restarting
      try {
        this.recognition.stop();
        setTimeout(() => {
          this.recognition.start();
          this.lastSpeechTime = Date.now();
          this._startSilenceTimer();
          this._startMaxSilenceTimer();
        }, 300);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  stop() {
    this.intentionallyStopped = true;
    this._clearTimers();
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    return this.transcript;
  }

  getTranscript() {
    return this.transcript;
  }

  getFullTranscript() {
    return (this.transcript + ' ' + this.interimTranscript).trim();
  }

  _startSilenceTimer() {
    this._clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (!this.intentionallyStopped) {
        this.onSilence(this.transcript, this.hasSpeechStarted);
      }
    }, this.silenceTimeout);
  }

  _resetSilenceTimer() {
    this._clearSilenceTimer();
    this._startSilenceTimer();
    // Also reset max silence timer on speech
    this._clearMaxSilenceTimer();
    this._startMaxSilenceTimer();
  }

  _clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  _startMaxSilenceTimer() {
    this._clearMaxSilenceTimer();
    this.maxSilenceTimer = setTimeout(() => {
      if (!this.intentionallyStopped) {
        this.onMaxSilence(this.transcript, this.hasSpeechStarted);
      }
    }, this.maxSilenceTimeout);
  }

  _clearMaxSilenceTimer() {
    if (this.maxSilenceTimer) {
      clearTimeout(this.maxSilenceTimer);
      this.maxSilenceTimer = null;
    }
  }

  _clearTimers() {
    this._clearSilenceTimer();
    this._clearMaxSilenceTimer();
  }

  destroy() {
    this.stop();
    this.recognition = null;
  }

  static isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}
