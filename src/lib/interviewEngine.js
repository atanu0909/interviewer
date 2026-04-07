// Interview Engine — State machine coordinating speech, AI, coding, and UI

export const INTERVIEW_STATES = {
  IDLE: 'idle',
  ASKING: 'asking',           // TTS is speaking the question
  LISTENING: 'listening',     // Waiting for user answer
  CODING: 'coding',           // Waiting for user to write code
  PROCESSING: 'processing',  // Evaluating answer with Gemini
  GIVING_HINT: 'giving_hint', // Providing a hint
  TRANSITIONING: 'transitioning', // Moving to next question
  COMPLETED: 'completed',
};

export class InterviewEngine {
  constructor(options = {}) {
    this.state = INTERVIEW_STATES.IDLE;
    
    // Sort questions to ensure proper interview flow order
    const categoryOrder = { resume: 0, project: 1, experience: 2, technical: 3, coding: 4, behavioral: 5, situational: 6, closing: 7, 'follow-up': 8 };
    this.questions = (options.questions || []).slice().sort((a, b) => {
      return (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
    });
    
    this.resumeAnalysis = options.resumeAnalysis || {};
    this.resumeText = options.resumeText || '';
    this.targetRole = options.targetRole || '';
    this.difficulty = options.difficulty || 'mid';
    this.targetCompany = options.targetCompany || '';
    this.interviewType = options.interviewType || 'full';
    this.currentIndex = 0;
    this.answers = [];
    this.scores = [];
    this.startTime = null;
    this.questionStartTime = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onQuestionChange = options.onQuestionChange || (() => {});
    this.onScoreUpdate = options.onScoreUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onHint = options.onHint || (() => {});
    this.onEncouragement = options.onEncouragement || (() => {});
    this.onCodingQuestion = options.onCodingQuestion || (() => {}); // triggers code editor
    this.onAutoSubmit = options.onAutoSubmit || (() => {}); // called when auto-submitting after silence
  }

  setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.questions.length,
      percentage: Math.round(((this.currentIndex) / this.questions.length) * 100),
    };
  }

  getElapsedTime() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getQuestionTime() {
    if (!this.questionStartTime) return 0;
    return Math.floor((Date.now() - this.questionStartTime) / 1000);
  }

  start() {
    this.startTime = Date.now();
    this.currentIndex = 0;
    this.answers = [];
    this.scores = [];
    this.askCurrentQuestion();
  }

  askCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (!question) {
      this.complete();
      return;
    }
    this.questionStartTime = Date.now();
    this.setState(INTERVIEW_STATES.ASKING);
    this.onQuestionChange(question, this.getProgress());
  }

  // Called when TTS finishes speaking the question
  onQuestionSpoken() {
    const question = this.getCurrentQuestion();
    if (question?.category === 'coding') {
      // Switch to coding mode instead of listening
      this.setState(INTERVIEW_STATES.CODING);
      this.onCodingQuestion(question);
    } else {
      this.setState(INTERVIEW_STATES.LISTENING);
    }
  }

  // Called when user finishes answering (voice — text mode)
  async submitAnswer(transcript) {
    this.setState(INTERVIEW_STATES.PROCESSING);
    
    const question = this.getCurrentQuestion();
    const timeTaken = this.getQuestionTime();
    
    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          answer: transcript,
          category: question.category,
          resumeContext: this.resumeAnalysis,
          resumeText: this.resumeText,
          targetRole: this.targetRole,
          difficulty: this.difficulty,
          targetCompany: this.targetCompany,
        }),
      });

      const evaluation = await response.json();

      this.answers.push({
        question: question.question,
        category: question.category,
        answer: transcript,
        timeTaken,
        score: evaluation.score,
        feedback: evaluation.feedback,
        followUp: evaluation.followUp,
        authenticity: evaluation.authenticity,
      });

      this.scores.push(evaluation.score);
      this.onScoreUpdate(this.answers);

      // Check if there's a follow-up
      if (evaluation.followUp && this.currentIndex < this.questions.length - 1) {
        // Insert follow-up as next question
        this.questions.splice(this.currentIndex + 1, 0, {
          question: evaluation.followUp,
          category: 'follow-up',
          isFollowUp: true,
        });
      }

      this.nextQuestion();
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
      this.answers.push({
        question: question.question,
        category: question.category,
        answer: transcript,
        timeTaken,
        score: 5,
        feedback: 'Unable to evaluate - moving to next question.',
      });
      this.nextQuestion();
    }
  }

  // Called when user finishes answering (audio mode — direct audio analysis)
  async submitAudioAnswer(audioBase64, mimeType) {
    this.setState(INTERVIEW_STATES.PROCESSING);

    const question = this.getCurrentQuestion();
    const timeTaken = this.getQuestionTime();

    try {
      const response = await fetch('/api/evaluate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          question: question.question,
          category: question.category,
          resumeContext: this.resumeAnalysis,
          resumeText: this.resumeText,
          targetRole: this.targetRole,
          difficulty: this.difficulty,
          targetCompany: this.targetCompany,
        }),
      });

      const evaluation = await response.json();

      this.answers.push({
        question: question.question,
        category: question.category,
        answer: evaluation.transcript || '(Audio answer)',
        timeTaken,
        score: evaluation.score,
        feedback: evaluation.feedback,
        followUp: evaluation.followUp,
        authenticity: evaluation.authenticity,
        // Audio-specific metadata
        audioMode: true,
        confidence: evaluation.confidence,
        speakingPace: evaluation.speakingPace,
        clarity: evaluation.clarity,
        fillerWords: evaluation.fillerWords,
        speakingFeedback: evaluation.speakingFeedback,
      });

      this.scores.push(evaluation.score);
      this.onScoreUpdate(this.answers);

      // Check if there's a follow-up
      if (evaluation.followUp && this.currentIndex < this.questions.length - 1) {
        this.questions.splice(this.currentIndex + 1, 0, {
          question: evaluation.followUp,
          category: 'follow-up',
          isFollowUp: true,
        });
      }

      this.nextQuestion();
    } catch (error) {
      console.error('Failed to evaluate audio answer:', error);
      this.answers.push({
        question: question.question,
        category: question.category,
        answer: '(Audio evaluation failed)',
        timeTaken,
        score: 5,
        feedback: 'Unable to evaluate audio - moving to next question.',
        audioMode: true,
      });
      this.scores.push(5);
      this.onScoreUpdate(this.answers);
      this.nextQuestion();
    }
  }

  // Called when user submits code (coding challenge)
  async submitCode(code) {
    this.setState(INTERVIEW_STATES.PROCESSING);
    
    const question = this.getCurrentQuestion();
    const timeTaken = this.getQuestionTime();
    
    try {
      const response = await fetch('/api/evaluate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: question.codingLanguage || 'python',
          problemStatement: question.question,
          expectedApproach: question.expectedApproach || '',
          difficulty: this.difficulty,
          targetRole: this.targetRole,
        }),
      });

      const evaluation = await response.json();

      this.answers.push({
        question: question.question,
        category: 'coding',
        answer: `[Code submitted in ${question.codingLanguage || 'unknown'}]`,
        codeSubmission: code,
        codingLanguage: question.codingLanguage,
        timeTaken,
        score: evaluation.score,
        feedback: evaluation.feedback,
        codeReview: evaluation.codeReview,
        correctness: evaluation.correctness,
        timeComplexity: evaluation.timeComplexity,
        spaceComplexity: evaluation.spaceComplexity,
        suggestions: evaluation.suggestions,
      });

      this.scores.push(evaluation.score);
      this.onScoreUpdate(this.answers);
      this.nextQuestion();
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      this.answers.push({
        question: question.question,
        category: 'coding',
        answer: `[Code submitted]`,
        codeSubmission: code,
        timeTaken,
        score: 5,
        feedback: 'Unable to evaluate code - moving to next question.',
      });
      this.scores.push(5);
      this.onScoreUpdate(this.answers);
      this.nextQuestion();
    }
  }

  // Called when silence is detected (8s) — SMART auto-submit logic
  // hasSpeech: whether the user spoke during this listening session
  async handleSilence(partialTranscript, hasSpeech = false) {
    if (this.state !== INTERVIEW_STATES.LISTENING) return;

    // ─── USER SPOKE + 8s SILENCE → They finished answering → AUTO-SUBMIT ───
    if (hasSpeech && partialTranscript && partialTranscript.trim().length > 10) {
      // Signal the UI that we're auto-submitting
      this.onAutoSubmit('text');
      return; // The interview page will handle the actual submission
    }

    // ─── USER SPOKE + 8s SILENCE in AUDIO mode → signal auto-submit ───
    if (hasSpeech && !partialTranscript) {
      // Audio mode — no transcript available, but speech was detected via RMS
      this.onAutoSubmit('audio');
      return; // The interview page will stop recording + submit audio
    }

    // ─── USER NEVER SPOKE → They might be stuck → hint/encourage ───
    try {
      const response = await fetch('/api/detect-stuck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: this.getCurrentQuestion()?.question,
          partialTranscript: partialTranscript || '',
          silenceDuration: 8,
        }),
      });

      const result = await response.json();

      if (result.action === 'hint') {
        this.onHint(result.hint);
      } else if (result.action === 'encourage') {
        this.onEncouragement(result.message);
      }
    } catch (error) {
      // Fallback encouragement
      this.onEncouragement("Take your time. You can also say 'skip' to move on.");
    }
  }

  // Called on max silence (15s) — hard stop safety net
  handleMaxSilence(partialTranscript, hasSpeech = false) {
    if (this.state !== INTERVIEW_STATES.LISTENING) return;

    // If user spoke something, submit whatever they said
    if (hasSpeech || (partialTranscript && partialTranscript.trim().length > 10)) {
      this.onAutoSubmit(partialTranscript ? 'text' : 'audio');
    } else {
      // No speech at all — skip this question
      this.answers.push({
        question: this.getCurrentQuestion()?.question,
        category: this.getCurrentQuestion()?.category,
        answer: partialTranscript || '(No response)',
        timeTaken: this.getQuestionTime(),
        score: 0,
        feedback: 'No response provided.',
      });
      this.scores.push(0);
      this.onScoreUpdate(this.answers);
      this.nextQuestion();
    }
  }

  // Check if user wants to skip
  checkForSkipIntent(transcript) {
    const skipPhrases = [
      'skip', 'next question', 'i don\'t know', 'i dont know',
      'pass', 'move on', 'next one', 'skip this',
    ];
    const lower = transcript.toLowerCase().trim();
    return skipPhrases.some(phrase => lower.includes(phrase));
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.complete();
    } else {
      this.setState(INTERVIEW_STATES.TRANSITIONING);
      setTimeout(() => {
        this.askCurrentQuestion();
      }, 1500);
    }
  }

  skipQuestion() {
    this.answers.push({
      question: this.getCurrentQuestion()?.question,
      category: this.getCurrentQuestion()?.category,
      answer: '(Skipped)',
      timeTaken: this.getQuestionTime(),
      score: 0,
      feedback: 'Question was skipped.',
    });
    this.scores.push(0);
    this.onScoreUpdate(this.answers);
    this.nextQuestion();
  }

  async complete() {
    this.setState(INTERVIEW_STATES.COMPLETED);
    
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: this.answers,
          resumeAnalysis: this.resumeAnalysis,
          targetRole: this.targetRole,
          difficulty: this.difficulty,
          targetCompany: this.targetCompany,
          totalTime: this.getElapsedTime(),
        }),
      });

      const report = await response.json();
      this.onComplete(report, this.answers);
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Generate a basic report
      const avgScore = this.scores.length > 0
        ? this.scores.reduce((a, b) => a + b, 0) / this.scores.length
        : 0;
      
      this.onComplete({
        overallScore: Math.round(avgScore * 10),
        grade: avgScore >= 8 ? 'A' : avgScore >= 6 ? 'B' : avgScore >= 4 ? 'C' : 'D',
        strengths: ['Completed the interview'],
        weaknesses: ['Report generation failed - scores may be approximate'],
        tips: ['Try again for a more detailed report'],
        summary: 'Interview completed. Detailed analysis unavailable.',
      }, this.answers);
    }
  }

  getResults() {
    return {
      answers: this.answers,
      scores: this.scores,
      totalTime: this.getElapsedTime(),
    };
  }
}
