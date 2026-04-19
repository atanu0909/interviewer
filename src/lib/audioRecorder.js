// Audio Recorder — Records microphone audio for direct Gemini analysis
// Uses MediaRecorder API + Web Audio API for waveform visualization
// Supports WebM (Opus) with WAV fallback for Safari

export class AudioRecorder {
  constructor(options = {}) {
    this.silenceTimeout = options.silenceTimeout || 5000;
    this.maxSilenceTimeout = options.maxSilenceTimeout || 12000;
    this.silenceThreshold = options.silenceThreshold || 0.015; // RMS threshold for "silence"
    this.maxRecordingTime = options.maxRecordingTime || 120000; // 2 minutes max

    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.sourceNode = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.mimeType = '';

    // Silence detection
    this.silenceTimer = null;
    this.maxSilenceTimer = null;
    this.maxRecordingTimer = null;
    this.lastSpeechTime = null;
    this.hasSpeechStarted = false;
    this.levelCheckInterval = null;

    // Callbacks
    this.onAudioLevel = options.onAudioLevel || (() => {});
    this.onSilence = options.onSilence || (() => {});
    this.onMaxSilence = options.onMaxSilence || (() => {});
    this.onSpeechDetected = options.onSpeechDetected || (() => {});
    this.onStart = options.onStart || (() => {});
    this.onStop = options.onStop || (() => {});
    this.onError = options.onError || (() => {});
    this.onRecordingTime = options.onRecordingTime || (() => {});
  }

  _getSupportedMimeType() {
    // Prefer webm/opus (Chrome, Firefox, Edge), fallback to mp4/wav
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];

    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Will use default
  }

  _getMimeTypeForGemini(recorderMimeType) {
    // Map MediaRecorder MIME type to Gemini-compatible type
    if (recorderMimeType.includes('webm')) return 'audio/webm';
    if (recorderMimeType.includes('mp4')) return 'audio/mp4';
    if (recorderMimeType.includes('ogg')) return 'audio/ogg';
    if (recorderMimeType.includes('wav')) return 'audio/wav';
    return 'audio/webm'; // Default
  }

  async start() {
    if (this.isRecording) {
      console.warn('AudioRecorder: Already recording');
      return false;
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Setup Web Audio API for level monitoring
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.sourceNode.connect(this.analyserNode);
      // Don't connect to destination — we don't want to hear ourselves

      // Setup MediaRecorder
      const supportedMimeType = this._getSupportedMimeType();
      const recorderOptions = supportedMimeType ? { mimeType: supportedMimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.mimeType = this._getMimeTypeForGemini(this.mediaRecorder.mimeType);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        this.onError(event.error);
      };

      // Start recording — collect data every 1 second
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.startTime = Date.now();
      this.hasSpeechStarted = false;
      this.lastSpeechTime = Date.now();

      // Start audio level monitoring
      this._startLevelMonitoring();

      // Start silence detection
      this._startSilenceTimer();
      this._startMaxSilenceTimer();

      // Max recording safety timer
      this.maxRecordingTimer = setTimeout(() => {
        if (this.isRecording) {
          this.onMaxSilence();
        }
      }, this.maxRecordingTime);

      this.onStart();
      return true;
    } catch (error) {
      console.error('AudioRecorder: Failed to start:', error);
      this.onError(error);
      return false;
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.isRecording = false;
      this._clearTimers();
      this._stopLevelMonitoring();

      this.mediaRecorder.onstop = async () => {
        // Combine chunks into a single blob
        const blob = new Blob(this.chunks, { type: this.mimeType });

        // Convert to base64
        const base64 = await this._blobToBase64(blob);

        // Clean up
        this._cleanup();

        const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

        this.onStop();

        resolve({
          base64,
          mimeType: this.mimeType,
          blob,
          duration,
          hasSpeech: this.hasSpeechStarted,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this._cleanup();
        resolve(null);
      }
    });
  }

  getRecordingDuration() {
    if (!this.startTime || !this.isRecording) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  _startLevelMonitoring() {
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const checkLevel = () => {
      if (!this.isRecording || !this.analyserNode) return;

      this.analyserNode.getFloatTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Normalize to 0-1 range (amplify for better visualization)
      const normalizedLevel = Math.min(1, rms * 5);

      // Send level data for waveform visualization
      this.onAudioLevel(normalizedLevel, dataArray);

      // Detect speech vs silence
      if (rms > this.silenceThreshold) {
        if (!this.hasSpeechStarted) {
          this.hasSpeechStarted = true;
          this.onSpeechDetected();
        }
        this.lastSpeechTime = Date.now();
        this._resetSilenceTimer();
      }

      // Update recording time
      if (this.startTime) {
        this.onRecordingTime(this.getRecordingDuration());
      }
    };

    // Check levels at ~30fps for smooth visualization
    this.levelCheckInterval = setInterval(checkLevel, 33);
  }

  _stopLevelMonitoring() {
    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }
  }

  _startSilenceTimer() {
    this._clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording) {
        this.onSilence(this.hasSpeechStarted);
      }
    }, this.silenceTimeout);
  }

  _resetSilenceTimer() {
    this._clearSilenceTimer();
    this._startSilenceTimer();
    // Also reset max silence on speech
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
      if (this.isRecording) {
        this.onMaxSilence(this.hasSpeechStarted);
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
    if (this.maxRecordingTimer) {
      clearTimeout(this.maxRecordingTimer);
      this.maxRecordingTimer = null;
    }
  }

  _cleanup() {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.sourceNode = null;
    this.analyserNode = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }

  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data:audio/...;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  destroy() {
    this._clearTimers();
    this._stopLevelMonitoring();
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }

    this._cleanup();
  }

  static isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  }
}
