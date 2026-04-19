"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SpeechManager } from "@/lib/speechManager";
import { AudioRecorder } from "@/lib/audioRecorder";
import { VoiceSynthesis } from "@/lib/voiceSynthesis";
import { InterviewEngine, INTERVIEW_STATES } from "@/lib/interviewEngine";

// Mini code editor component
function CodeEditor({ language, onSubmit, disabled }) {
  const [code, setCode] = useState("");
  const textareaRef = useRef(null);

  const lineCount = useMemo(() => {
    return Math.max(code.split("\n").length, 10);
  }, [code]);

  const handleKeyDown = (e) => {
    // Handle Tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="code-editor-wrap">
        <div className="code-editor-header">
          <span className="lang-tag">⟨/⟩ {language || "Code"}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {code.split("\n").length} lines
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <div className="code-editor-lines" style={{ height: "100%" }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} style={{ height: "1.65em" }}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="code-editor-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`// Write your ${language || 'code'} solution here...\n// Use Tab for indentation\n`}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        <div className="code-editor-footer">
          <span>Press Tab for indent • Write clean, readable code</span>
          <span>{code.length} chars</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => onSubmit(code)}
          disabled={disabled || code.trim().length < 5}
          style={{ flex: 1 }}
          id="submit-code-btn"
        >
          💻 Submit Code
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setCode("")}
          disabled={disabled}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// Real waveform visualizer for audio mode
function WaveformVisualizer({ audioLevel, isActive, waveformData }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Idle state: flat line
        ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      if (waveformData && waveformData.length > 0) {
        // Real waveform from analyser
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.8)");
        gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.8)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.8)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const sliceWidth = width / waveformData.length;
        let x = 0;

        for (let i = 0; i < waveformData.length; i++) {
          const v = waveformData[i] * 2.5 + 0.5; // Amplify and center
          const y = (v * height) / 1;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();

        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Fallback: animated bars using audio level
        const barCount = 40;
        const barWidth = width / barCount - 2;
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
          const normalized = audioLevel || 0;
          const barHeight = Math.max(2, normalized * height * 0.8 * (0.5 + Math.random() * 0.5));

          const hue = 230 + (i / barCount) * 80;
          ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.5 + normalized * 0.5})`;
          ctx.fillRect(
            i * (barWidth + 2),
            centerY - barHeight / 2,
            barWidth,
            barHeight
          );
        }
      }

      if (isActive) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [audioLevel, isActive, waveformData]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={60}
      style={{
        width: "100%",
        height: 60,
        borderRadius: "var(--radius-md)",
        background: isActive ? "rgba(99, 102, 241, 0.05)" : "transparent",
        transition: "background 0.3s",
      }}
    />
  );
}

// Mode toggle component
function InputModeToggle({ mode, onModeChange, disabled }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "var(--bg-glass)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: 3,
    }}>
      <button
        onClick={() => onModeChange("audio")}
        disabled={disabled}
        style={{
          padding: "6px 14px",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.78rem",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          transition: "all 0.25s",
          background: mode === "audio"
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))"
            : "transparent",
          color: mode === "audio" ? "var(--primary-300)" : "var(--text-muted)",
          boxShadow: mode === "audio" ? "0 0 12px rgba(99, 102, 241, 0.2)" : "none",
        }}
        id="mode-audio-btn"
      >
        🎤 Live Audio AI
      </button>
      <button
        onClick={() => onModeChange("text")}
        disabled={disabled}
        style={{
          padding: "6px 14px",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.78rem",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          transition: "all 0.25s",
          background: mode === "text"
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(52, 211, 153, 0.3))"
            : "transparent",
          color: mode === "text" ? "var(--accent-300)" : "var(--text-muted)",
          boxShadow: mode === "text" ? "0 0 12px rgba(16, 185, 129, 0.2)" : "none",
        }}
        id="mode-text-btn"
      >
        📝 Text Recognition
      </button>
    </div>
  );
}


export default function InterviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [interviewState, setInterviewState] = useState(INTERVIEW_STATES.IDLE);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [answers, setAnswers] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [showHint, setShowHint] = useState("");
  const [isCodingMode, setIsCodingMode] = useState(false);
  const [interviewMeta, setInterviewMeta] = useState({});

  // Audio mode state
  const [inputMode, setInputMode] = useState("audio"); // "audio" or "text"
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasSpeechDetected, setHasSpeechDetected] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState(""); // Shows transcript in audio mode

  const engineRef = useRef(null);
  const speechRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const voiceRef = useRef(null);
  const timerRef = useRef(null);
  const qTimerRef = useRef(null);
  const isAutoSubmittingRef = useRef(false);

  // Initialize
  useEffect(() => {
    setMounted(true);

    const data = sessionStorage.getItem("interviewData");
    if (!data) {
      router.push("/setup");
      return;
    }

    const { questions, resumeAnalysis, resumeText, targetRole, difficulty, targetCompany, interviewType } = JSON.parse(data);
    setInterviewMeta({ targetRole, difficulty, targetCompany, interviewType });

    // Check if AudioRecorder is supported — default to audio mode if yes
    if (!AudioRecorder.isSupported()) {
      setInputMode("text");
    }

    // Init Voice Synthesis
    const voice = new VoiceSynthesis({
      rate: 0.92,
      pitch: 1.0,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    voiceRef.current = voice;

    // Init Interview Engine
    const engine = new InterviewEngine({
      questions,
      resumeAnalysis,
      resumeText,
      targetRole,
      difficulty,
      targetCompany,
      interviewType,
      onStateChange: (state) => {
        setInterviewState(state);
        if (state === INTERVIEW_STATES.ASKING) {
          setStatusMessage("Interviewer is asking...");
          setTranscript("");
          setInterimText("");
          setShowHint("");
          setIsCodingMode(false);
          setHasSpeechDetected(false);
          setRecordingDuration(0);
          setAutoSubmitting(false);
          isAutoSubmittingRef.current = false;
          setLiveTranscript("");
        } else if (state === INTERVIEW_STATES.LISTENING) {
          setStatusMessage("Your turn — speak your answer");
          setIsCodingMode(false);
        } else if (state === INTERVIEW_STATES.CODING) {
          setStatusMessage("Write your code solution below");
          setIsCodingMode(true);
        } else if (state === INTERVIEW_STATES.PROCESSING) {
          setStatusMessage("Evaluating your response...");
        } else if (state === INTERVIEW_STATES.TRANSITIONING) {
          setStatusMessage("Moving to next question...");
          setIsCodingMode(false);
        } else if (state === INTERVIEW_STATES.COMPLETED) {
          setStatusMessage("Interview complete!");
          setIsCodingMode(false);
        }
      },
      onQuestionChange: (question, prog) => {
        setCurrentQuestion(question);
        setProgress(prog);
        setQuestionTime(0);

        // Typing animation for question
        const text = question.question;
        setDisplayedQuestion("");
        let i = 0;
        const typeSpeed = question.category === "coding" ? 15 : 25;
        const typeInterval = setInterval(() => {
          if (i < text.length) {
            setDisplayedQuestion(text.substring(0, i + 1));
            i++;
          } else {
            clearInterval(typeInterval);
            const speakText = question.category === "coding"
              ? text.split("\n")[0] + ". Please write your solution in the code editor below."
              : text;
            voice.speak(speakText).then(() => {
              engine.onQuestionSpoken();
              if (question.category !== "coding") {
                startListening();
              }
            });
          }
        }, typeSpeed);
      },
      onScoreUpdate: (ans) => {
        setAnswers([...ans]);
        // Capture transcript from audio evaluation so user can see what they said
        const lastAns = ans[ans.length - 1];
        if (lastAns?.audioMode && lastAns?.answer && lastAns.answer !== '(Audio answer)' && lastAns.answer !== '(Audio evaluation failed)') {
          setLiveTranscript(lastAns.answer);
        }
      },
      onComplete: (report, ans) => {
        stopListening();
        voice.stop();
        sessionStorage.setItem("interviewReport", JSON.stringify({ report, answers: ans }));
        setTimeout(() => router.push("/results"), 1500);
      },
      onHint: (hint) => {
        setShowHint(hint);
        voice.speak(hint);
      },
      onEncouragement: (msg) => {
        setStatusMessage(msg);
        voice.speak(msg);
      },
      onCodingQuestion: () => {
        // Already handled via state change to CODING
      },
      // ─── SMART AUTO-SUBMIT: user spoke then went silent for 5s ───
      onAutoSubmit: (mode) => {
        if (isAutoSubmittingRef.current) return; // Prevent double-submit
        isAutoSubmittingRef.current = true;
        setAutoSubmitting(true);
        setStatusMessage("✓ Answer detected — submitting automatically...");

        // Brief delay to show the auto-submit message, then submit
        setTimeout(async () => {
          if (mode === 'audio') {
            // Audio mode: stop recording and submit the audio
            const result = await audioRecorderRef.current?.stop();
            setIsRecording(false);
            setIsListening(false);
            if (result && result.base64) {
              engine.submitAudioAnswer(result.base64, result.mimeType);
            } else {
              // Fallback: skip with no response
              engine.skipQuestion();
            }
          } else {
            // Text mode: stop speech recognition and submit transcript
            const finalTranscript = speechRef.current?.stop() || '';
            setIsListening(false);
            if (finalTranscript && finalTranscript.trim().length > 0) {
              engine.submitAnswer(finalTranscript);
            } else {
              engine.skipQuestion();
            }
          }
          setAutoSubmitting(false);
          isAutoSubmittingRef.current = false;
        }, 1200); // 1.2s delay so user sees "submitting..." message
      },
    });
    engineRef.current = engine;

    // Start timer
    timerRef.current = setInterval(() => {
      if (engine.startTime) {
        setTotalTime(engine.getElapsedTime());
      }
    }, 1000);

    qTimerRef.current = setInterval(() => {
      if (engine.questionStartTime && (engine.state === INTERVIEW_STATES.LISTENING || engine.state === INTERVIEW_STATES.CODING)) {
        setQuestionTime(engine.getQuestionTime());
      }
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(qTimerRef.current);
      speechRef.current?.destroy();
      audioRecorderRef.current?.destroy();
      voiceRef.current?.stop();
    };
  }, [router]);

  // ═══════════════════════════════════════════════
  // TEXT MODE — Web Speech API (original)
  // ═══════════════════════════════════════════════
  const startTextListening = useCallback(() => {
    if (speechRef.current) {
      speechRef.current.destroy();
    }

    const speech = new SpeechManager({
      lang: "en-IN",
      silenceTimeout: 8000,
      maxSilenceTimeout: 15000,
      onResult: (text) => {
        setTranscript(text);
        if (engineRef.current?.checkForSkipIntent(text)) {
          stopListening();
          voiceRef.current?.speak("Sure, let's move to the next question.").then(() => {
            engineRef.current?.skipQuestion();
          });
        }
      },
      onInterim: (text) => setInterimText(text),
      onSilence: (partialTranscript, hasSpeechStarted) => {
        engineRef.current?.handleSilence(partialTranscript, hasSpeechStarted);
      },
      onMaxSilence: (partialTranscript, hasSpeechStarted) => {
        stopListening();
        engineRef.current?.handleMaxSilence(partialTranscript, hasSpeechStarted);
      },
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onSpeechDetected: () => {
        setShowHint("");
      },
    });

    speechRef.current = speech;
    speech.start();
  }, []);

  // ═══════════════════════════════════════════════
  // AUDIO MODE — MediaRecorder + Gemini
  // ═══════════════════════════════════════════════
  const startAudioRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.destroy();
    }

    const recorder = new AudioRecorder({
      silenceTimeout: 8000,
      maxSilenceTimeout: 15000,
      onAudioLevel: (level, dataArray) => {
        setAudioLevel(level);
        // Downsample waveform data for visualization
        if (dataArray) {
          const step = Math.floor(dataArray.length / 100);
          const downsampled = [];
          for (let i = 0; i < dataArray.length; i += step) {
            downsampled.push(dataArray[i]);
          }
          setWaveformData(downsampled);
        }
      },
      onSilence: (hasSpeechStarted) => {
        // Pass hasSpeechStarted so the engine can auto-submit if user finished
        engineRef.current?.handleSilence("", hasSpeechStarted);
      },
      onMaxSilence: async (hasSpeechStarted) => {
        // Auto-submit what we have
        if (hasSpeechStarted) {
          // User spoke — let the engine handle auto-submit
          engineRef.current?.handleMaxSilence("", true);
        } else {
          const result = await audioRecorderRef.current?.stop();
          setIsRecording(false);
          setIsListening(false);
          if (result && result.hasSpeech && result.base64) {
            engineRef.current?.submitAudioAnswer(result.base64, result.mimeType);
          } else {
            engineRef.current?.handleMaxSilence("", false);
          }
        }
      },
      onSpeechDetected: () => {
        setHasSpeechDetected(true);
        setShowHint("");
      },
      onStart: () => {
        setIsRecording(true);
        setIsListening(true);
      },
      onStop: () => {
        setIsRecording(false);
        setAudioLevel(0);
        setWaveformData(null);
      },
      onRecordingTime: (seconds) => {
        setRecordingDuration(seconds);
      },
      onError: (error) => {
        console.error("AudioRecorder error:", error);
        // Fallback to text mode
        setInputMode("text");
        setStatusMessage("Audio failed — switched to text recognition");
        startTextListening();
      },
    });

    audioRecorderRef.current = recorder;
    recorder.start();
  }, []);

  // Unified start/stop listening
  const startListening = useCallback(() => {
    if (inputMode === "audio") {
      startAudioRecording();
    } else {
      startTextListening();
    }
  }, [inputMode, startAudioRecording, startTextListening]);

  const stopListening = useCallback(() => {
    if (inputMode === "audio") {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.destroy();
        setIsRecording(false);
        setIsListening(false);
        setAudioLevel(0);
        setWaveformData(null);
      }
    } else {
      if (speechRef.current) {
        speechRef.current.stop();
        setIsListening(false);
      }
    }
    return transcript;
  }, [inputMode, transcript]);

  const handleSubmitAnswer = useCallback(async () => {
    if (inputMode === "audio") {
      // Stop recording and get audio data
      const result = await audioRecorderRef.current?.stop();
      setIsRecording(false);
      setIsListening(false);
      if (result && result.base64) {
        engineRef.current?.submitAudioAnswer(result.base64, result.mimeType);
      } else {
        engineRef.current?.handleMaxSilence("");
      }
    } else {
      // Text mode — use transcript
      const finalTranscript = speechRef.current?.stop() || transcript;
      setIsListening(false);
      if (finalTranscript && finalTranscript.trim().length > 0) {
        engineRef.current?.submitAnswer(finalTranscript);
      } else {
        engineRef.current?.handleMaxSilence("");
      }
    }
  }, [inputMode, transcript]);

  const handleSubmitCode = useCallback((code) => {
    voiceRef.current?.stop();
    engineRef.current?.submitCode(code);
  }, []);

  const handleStartInterview = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const handleSkip = useCallback(() => {
    stopListening();
    voiceRef.current?.stop();
    engineRef.current?.skipQuestion();
  }, [stopListening]);

  const handleEndInterview = useCallback(() => {
    stopListening();
    voiceRef.current?.stop();
    engineRef.current?.complete();
  }, [stopListening]);

  const handleModeChange = useCallback((newMode) => {
    // Only allow mode change when not actively listening
    if (interviewState === INTERVIEW_STATES.LISTENING) {
      stopListening();
      setInputMode(newMode);
      // Restart listening in new mode
      setTimeout(() => {
        if (newMode === "audio") {
          startAudioRecording();
        } else {
          startTextListening();
        }
      }, 300);
    } else {
      setInputMode(newMode);
    }
  }, [interviewState, stopListening, startAudioRecording, startTextListening]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getCategoryBadgeClass = (category) => {
    const map = {
      technical: "badge-primary",
      behavioral: "badge-accent",
      resume: "badge-warm",
      project: "badge-project",
      experience: "badge-experience",
      coding: "badge-coding",
      situational: "badge-primary",
      closing: "badge-accent",
      "follow-up": "badge-warm",
    };
    return map[category] || "badge-primary";
  };

  const getConfidenceBadge = (confidence) => {
    const map = {
      high: { class: "badge-accent", icon: "💪" },
      medium: { class: "badge-primary", icon: "👍" },
      low: { class: "badge-warm", icon: "😟" },
    };
    return map[confidence] || map.medium;
  };

  if (!mounted) return null;

  const avgScore = answers.length > 0
    ? (answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length).toFixed(1)
    : "—";

  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;

  return (
    <div style={styles.wrapper}>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div className="container" style={styles.topBarInner}>
          <div style={styles.logo}>
            <span>🎤</span>
            <span className="gradient-text" style={{ fontWeight: 800 }}>InterviewAI</span>
            {interviewMeta.targetCompany && (
              <span className="badge badge-company" style={{ marginLeft: 8 }}>
                {interviewMeta.targetCompany}
              </span>
            )}
          </div>
          <div style={styles.topBarInfo}>
            <span className="badge badge-primary">Q {progress.current}/{progress.total}</span>
            <span className="badge">⏱️ {formatTime(totalTime)}</span>
            <span className="badge badge-accent">Avg: {avgScore}/10</span>
            {isCodingMode && <span className="coding-pulse">💻 Coding Mode</span>}
            {/* Mode indicator */}
            {!isCodingMode && interviewState !== INTERVIEW_STATES.IDLE && interviewState !== INTERVIEW_STATES.COMPLETED && (
              <InputModeToggle
                mode={inputMode}
                onModeChange={handleModeChange}
                disabled={interviewState === INTERVIEW_STATES.PROCESSING}
              />
            )}
          </div>
          <button className="btn btn-secondary" onClick={handleEndInterview} id="end-interview-btn" style={{ fontSize: "0.85rem" }}>
            End Interview
          </button>
        </div>
        {/* Progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>

      <main className="container" style={styles.main}>
        {/* Idle State — Start Button */}
        {interviewState === INTERVIEW_STATES.IDLE && (
          <div className="animate-scale-in" style={styles.centerPanel}>
            <div className="glass-card" style={styles.startCard}>
              <div style={styles.avatarLarge}>🤖</div>
              <h2>Ready to Begin?</h2>
              <p style={{ maxWidth: 420, margin: "12px auto 20px", lineHeight: 1.6 }}>
                Your AI interviewer is ready{interviewMeta.targetCompany ? ` to simulate a ${interviewMeta.targetCompany}-style interview` : ""}.
                Make sure your microphone is enabled.
              </p>

              {/* Mode selection */}
              <div className="glass-card" style={{ padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
                <p className="label" style={{ marginBottom: 10 }}>🎧 Choose Input Mode</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setInputMode("audio")}
                    className={`interview-type-card ${inputMode === "audio" ? "active" : ""}`}
                    style={{ flex: 1, padding: "14px 12px" }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>🎤</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Live Audio AI</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                      Gemini directly analyzes your voice — detects confidence, tone & more
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: "0.6rem", marginTop: 4 }}>✨ Recommended</span>
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`interview-type-card ${inputMode === "text" ? "active" : ""}`}
                    style={{ flex: 1, padding: "14px 12px" }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>📝</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Text Recognition</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                      Browser converts speech to text, then AI evaluates the text
                    </span>
                  </button>
                </div>
              </div>

              <div style={styles.preflight}>
                <span className="badge badge-accent">✓ Microphone access needed</span>
                <span className="badge badge-primary">✓ {progress.total} questions prepared</span>
                <span className="badge badge-warm">✓ {interviewMeta.interviewType === "full" ? "~30 min" : "~15-25 min"}</span>
                {interviewMeta.targetCompany && (
                  <span className="badge badge-company">✓ {interviewMeta.targetCompany} style</span>
                )}
                <span className="badge" style={{
                  background: inputMode === "audio" ? "rgba(99, 102, 241, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  color: inputMode === "audio" ? "var(--primary-300)" : "var(--accent-300)",
                }}>
                  {inputMode === "audio" ? "🎤 Audio AI Mode" : "📝 Text Mode"}
                </span>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleStartInterview} id="begin-btn" style={{ marginTop: 24 }}>
                🎙️ Start Interview
              </button>
            </div>
          </div>
        )}

        {/* Active Interview */}
        {interviewState !== INTERVIEW_STATES.IDLE && interviewState !== INTERVIEW_STATES.COMPLETED && (
          <div style={styles.interviewLayout}>
            {/* Left: Avatar + Question */}
            <div style={styles.questionPanel}>
              {/* Avatar */}
              <div style={styles.avatarSection}>
                <div style={{
                  ...styles.avatar,
                  ...(isSpeaking ? styles.avatarSpeaking : {}),
                  ...(interviewState === INTERVIEW_STATES.LISTENING ? styles.avatarListening : {}),
                  ...(isCodingMode ? styles.avatarCoding : {}),
                }}>
                  {isSpeaking && <div style={styles.avatarPulse} />}
                  <span style={{ fontSize: "2.5rem", position: "relative", zIndex: 2 }}>🤖</span>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>AI Interviewer</p>
                  <p style={{
                    fontSize: "0.8rem",
                    color: isSpeaking ? "var(--primary-400)" :
                      interviewState === INTERVIEW_STATES.LISTENING ? "var(--accent-400)" :
                      isCodingMode ? "#22d3ee" :
                      interviewState === INTERVIEW_STATES.PROCESSING ? "var(--warm-400)" :
                      "var(--text-muted)",
                  }}>
                    {isSpeaking ? "Speaking..." :
                      interviewState === INTERVIEW_STATES.LISTENING ? "Listening to you..." :
                      isCodingMode ? "Waiting for your code..." :
                      interviewState === INTERVIEW_STATES.PROCESSING ? "Evaluating..." : "Ready"}
                  </p>
                </div>
              </div>

              {/* Question display */}
              <div className="glass-card" style={styles.questionCard}>
                {currentQuestion && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className={`badge ${getCategoryBadgeClass(currentQuestion.category)}`}>
                          {currentQuestion.category}
                        </span>
                        {currentQuestion.category === "coding" && (
                          <span className="badge badge-coding">{currentQuestion.codingLanguage || "Code"}</span>
                        )}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        ⏱️ {formatTime(questionTime)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: currentQuestion.category === "coding" ? "1rem" : "1.15rem",
                      color: "var(--text-primary)",
                      lineHeight: 1.7,
                      fontWeight: 500,
                      whiteSpace: "pre-wrap",
                    }}>
                      {displayedQuestion}
                      {displayedQuestion.length < (currentQuestion.question?.length || 0) && (
                        <span style={{ borderRight: "2px solid var(--primary-400)", animation: "blink-caret 0.75s step-end infinite", marginLeft: 2 }} />
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* Hint */}
              {showHint && (
                <div className="glass-card animate-fade-in" style={styles.hintCard}>
                  <span>💡</span>
                  <p style={{ fontSize: "0.9rem", color: "var(--primary-300)" }}>{showHint}</p>
                </div>
              )}
            </div>

            {/* Right: Response area (Voice OR Code Editor) */}
            <div style={styles.answerPanel}>
              {/* Coding Mode */}
              {isCodingMode ? (
                <div className="animate-fade-in">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span className="coding-pulse">💻 Coding Challenge</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Write your solution below
                    </span>
                  </div>
                  <CodeEditor
                    language={currentQuestion?.codingLanguage || "code"}
                    onSubmit={handleSubmitCode}
                    disabled={interviewState === INTERVIEW_STATES.PROCESSING}
                  />
                </div>
              ) : (
                <>
                  {/* ═══ AUDIO MODE ═══ */}
                  {inputMode === "audio" ? (
                    <>
                      {/* Live Waveform Visualizer */}
                      <div className="glass-card" style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="label" style={{ margin: 0 }}>🎤 Live Audio Recording</span>
                            {isRecording && (
                              <span style={{
                                display: "flex", alignItems: "center", gap: 5,
                                fontSize: "0.75rem", color: "var(--danger-400)",
                                animation: "pulse-glow 1.5s infinite",
                              }}>
                                <span style={{
                                  width: 8, height: 8, borderRadius: "50%",
                                  background: "var(--danger-500)",
                                  animation: "pulse-glow 1s infinite",
                                }} />
                                REC
                              </span>
                            )}
                          </div>
                          {isRecording && (
                            <span style={{
                              fontSize: "0.85rem", fontWeight: 600,
                              fontFamily: "var(--font-mono, monospace)",
                              color: "var(--text-primary)",
                            }}>
                              {formatTime(recordingDuration)}
                            </span>
                          )}
                        </div>

                        <WaveformVisualizer
                          audioLevel={audioLevel}
                          isActive={isRecording}
                          waveformData={waveformData}
                        />

                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          marginTop: 10, fontSize: "0.75rem", color: "var(--text-muted)",
                        }}>
                          <span>
                            {isRecording
                              ? hasSpeechDetected
                                ? "🟢 Speech detected — speak clearly"
                                : "⏳ Waiting for you to start speaking..."
                              : interviewState === INTERVIEW_STATES.LISTENING
                                ? "Microphone starting..."
                                : "Microphone idle"}
                          </span>
                          <span style={{ color: "var(--primary-400)", fontSize: "0.7rem" }}>
                            ✨ Gemini analyzes audio directly
                          </span>
                        </div>
                      </div>

                      {/* Audio mode info card */}
                      <div style={{
                        padding: "10px 16px",
                        background: "rgba(99, 102, 241, 0.05)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid rgba(99, 102, 241, 0.1)",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}>
                        💡 <strong style={{ color: "var(--primary-300)" }}>Smart Audio Mode</strong> — Your voice is recorded and sent directly to Gemini for analysis.
                        When you finish speaking, the system <strong>automatically submits after 5 seconds of silence</strong> — no need to click any button.
                      </div>

                      {/* Live transcript display in audio mode */}
                      <div className="glass-card" style={{ padding: "16px 20px", minHeight: 100 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span className="label" style={{ margin: 0 }}>📝 Your Response (Live)</span>
                          {isRecording && hasSpeechDetected && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--accent-400)" }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-500)", animation: "pulse-glow 1.5s infinite" }} />
                              Listening
                            </span>
                          )}
                        </div>
                        <div style={{
                          minHeight: 60,
                          fontSize: "1rem",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                          color: liveTranscript ? "var(--text-primary)" : "var(--text-muted)",
                          fontStyle: liveTranscript ? "normal" : "italic",
                        }}>
                          {liveTranscript
                            ? liveTranscript
                            : interviewState === INTERVIEW_STATES.LISTENING
                              ? hasSpeechDetected
                                ? "🎤 Speaking detected — transcript will appear after evaluation..."
                                : "Start speaking your answer..."
                              : interviewState === INTERVIEW_STATES.PROCESSING
                                ? "⏳ Analyzing your audio response..."
                                : "Waiting for question..."}
                        </div>
                        <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          ✨ Full transcription appears after Gemini analyzes your audio
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* ═══ TEXT MODE (Original) ═══ */}
                      {/* Audio Visualizer (fake bars) */}
                      <div style={styles.visualizer}>
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: 4,
                              borderRadius: 2,
                              background: isListening ? "var(--gradient-primary)" : "var(--gray-700)",
                              height: isListening ? `${6 + Math.random() * 28}px` : "4px",
                              transition: "height 0.15s ease",
                              animation: isListening ? `speaking-wave ${0.8 + Math.random() * 0.8}s ease-in-out infinite ${i * 0.05}s` : "none",
                            }}
                          />
                        ))}
                      </div>

                      {/* Transcript */}
                      <div className="glass-card" style={styles.transcriptCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span className="label" style={{ margin: 0 }}>Your Response</span>
                          {isListening && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--accent-400)" }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-500)", animation: "pulse-glow 1.5s infinite" }} />
                              Recording
                            </span>
                          )}
                        </div>
                        <div style={styles.transcriptArea}>
                          {transcript || interimText ? (
                            <>
                              <span style={{ color: "var(--text-primary)" }}>{transcript}</span>
                              {interimText && (
                                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}> {interimText}</span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                              {interviewState === INTERVIEW_STATES.LISTENING
                                ? "Start speaking your answer..."
                                : "Waiting for question..."}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Status */}
              <p style={styles.statusMessage}>{statusMessage}</p>

              {/* Auto-submit indicator */}
              {autoSubmitting && (
                <div className="animate-fade-in" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "10px 18px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "var(--radius-md)",
                  animation: "pulse-glow 1.5s infinite",
                }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "var(--accent-400) transparent transparent transparent" }} />
                  <span style={{ fontSize: "0.85rem", color: "var(--accent-300)", fontWeight: 600 }}>
                    ✓ Silence detected — auto-submitting your answer...
                  </span>
                </div>
              )}

              {/* Controls */}
              <div style={styles.controls}>
                {interviewState === INTERVIEW_STATES.LISTENING && !autoSubmitting && (
                  <>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleSubmitAnswer}
                      id="submit-answer-btn"
                      style={{ flex: 1 }}
                    >
                      {inputMode === "audio" ? "🎤 Submit Audio Answer" : "✓ Submit Answer"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSkip}
                      id="skip-btn"
                    >
                      Skip →
                    </button>
                  </>
                )}
                {interviewState === INTERVIEW_STATES.CODING && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleSkip}
                    id="skip-coding-btn"
                    style={{ marginLeft: "auto" }}
                  >
                    Skip Coding →
                  </button>
                )}
                {interviewState === INTERVIEW_STATES.PROCESSING && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", width: "100%" }}>
                    <span className="spinner" />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {inputMode === "audio" ? "Gemini is analyzing your audio..." : "Evaluating your response..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Last score */}
              {lastAnswer && (
                <div className="glass-card animate-fade-in" style={styles.lastScore}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Previous Q
                      </span>
                      <span className={`badge ${getCategoryBadgeClass(lastAnswer.category)}`} style={{ fontSize: "0.65rem" }}>
                        {lastAnswer.category}
                      </span>
                    </div>
                    <span style={{
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      color: lastAnswer.score >= 7 ? "var(--accent-400)" :
                        lastAnswer.score >= 4 ? "var(--warm-400)" : "var(--danger-400)",
                    }}>
                      {lastAnswer.score}/10
                    </span>
                  </div>
                  {lastAnswer.feedback && (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                      {lastAnswer.feedback}
                    </p>
                  )}
                  {/* Audio-specific feedback badges */}
                  {lastAnswer.audioMode && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {lastAnswer.confidence && (
                        <span className={`badge ${getConfidenceBadge(lastAnswer.confidence).class}`} style={{ fontSize: "0.65rem" }}>
                          {getConfidenceBadge(lastAnswer.confidence).icon} Confidence: {lastAnswer.confidence}
                        </span>
                      )}
                      {lastAnswer.clarity && (
                        <span className="badge" style={{ fontSize: "0.65rem" }}>
                          🗣️ Clarity: {lastAnswer.clarity}
                        </span>
                      )}
                      {lastAnswer.speakingPace && (
                        <span className="badge" style={{ fontSize: "0.65rem" }}>
                          ⚡ Pace: {lastAnswer.speakingPace}
                        </span>
                      )}
                      {lastAnswer.fillerWords && lastAnswer.fillerWords !== "none" && (
                        <span className="badge badge-warm" style={{ fontSize: "0.65rem" }}>
                          🔇 Fillers: {lastAnswer.fillerWords}
                        </span>
                      )}
                    </div>
                  )}
                  {lastAnswer.speakingFeedback && (
                    <p style={{ fontSize: "0.75rem", color: "var(--primary-300)", marginTop: 6, fontStyle: "italic" }}>
                      🎤 {lastAnswer.speakingFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed */}
        {interviewState === INTERVIEW_STATES.COMPLETED && (
          <div className="animate-scale-in" style={styles.centerPanel}>
            <div className="glass-card" style={styles.startCard}>
              <div style={styles.avatarLarge}>🎉</div>
              <h2>Interview Complete!</h2>
              <p style={{ color: "var(--text-secondary)", margin: "12px 0 24px" }}>
                Generating your detailed feedback report...
              </p>
              <div className="spinner spinner-lg" style={{ margin: "0 auto" }} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  wrapper: { position: "relative", minHeight: "100vh", overflow: "hidden" },
  topBar: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    background: "rgba(5, 10, 24, 0.9)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  topBarInner: {
    display: "flex", justifyContent: "space-between", alignItems: "center", height: 56,
  },
  topBarInfo: { display: "flex", gap: 8, alignItems: "center" },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  main: { paddingTop: 80, paddingBottom: 40, position: "relative", zIndex: 1 },
  centerPanel: {
    display: "flex", justifyContent: "center", alignItems: "center",
    minHeight: "calc(100vh - 140px)",
  },
  startCard: {
    padding: "48px 40px", textAlign: "center", maxWidth: 560,
  },
  avatarLarge: { fontSize: "4rem", marginBottom: 16 },
  preflight: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  interviewLayout: {
    display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28,
    minHeight: "calc(100vh - 120px)", alignItems: "start",
  },
  questionPanel: { display: "flex", flexDirection: "column", gap: 20 },
  answerPanel: { display: "flex", flexDirection: "column", gap: 16 },
  avatarSection: { display: "flex", alignItems: "center", gap: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-glass)",
    borderWidth: 2, borderStyle: "solid", borderColor: "var(--border-subtle)",
    position: "relative", transition: "all 0.3s",
  },
  avatarSpeaking: {
    borderColor: "var(--primary-500)",
    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
  },
  avatarListening: {
    borderColor: "var(--accent-500)",
    boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
  },
  avatarCoding: {
    borderColor: "#22d3ee",
    boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
  },
  avatarPulse: {
    position: "absolute", inset: -6, borderRadius: "50%",
    border: "2px solid var(--primary-400)", animation: "pulse-ring 2s infinite",
  },
  questionCard: { padding: "24px" },
  hintCard: {
    padding: "14px 18px", display: "flex", gap: 10, alignItems: "start",
    background: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(99, 102, 241, 0.2)",
  },
  visualizer: {
    display: "flex", justifyContent: "center", alignItems: "center",
    gap: 3, height: 40, padding: "0 16px",
  },
  transcriptCard: { padding: "20px", minHeight: 160 },
  transcriptArea: {
    minHeight: 100, fontSize: "1rem", lineHeight: 1.7, whiteSpace: "pre-wrap",
  },
  statusMessage: {
    textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)",
    fontStyle: "italic",
  },
  controls: { display: "flex", gap: 12 },
  lastScore: { padding: "14px 18px" },
};
