# 🎤 InterviewAI — AI-Powered Mock Interviewer

An intelligent mock interview platform that uses **Gemini AI** to simulate real tech interviews. Upload your resume, pick your dream role, and practice with a live AI interviewer that listens, adapts, and gives you real feedback.

## ✨ Features

- **Smart Resume Analysis** — AI deeply analyzes your resume to generate tailored, role-specific questions
- **Voice-Powered Interview** — Speak naturally with Indian English-optimized speech recognition
- **15+ IT Roles** — From Frontend Developer to Cloud Architect, practice for any IT role
- **Intelligent Stuck Detection** — AI detects pauses, offers hints, and gracefully moves forward
- **Live Audio Evaluation** — Gemini analyzes your spoken responses for content, confidence, and clarity
- **Coding Challenges** — Write and submit code directly during the interview
- **Comprehensive Feedback Report** — Detailed scoring across technical, behavioral, and communication skills

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router)
- **AI**: [Google Gemini API](https://ai.google.dev/) (gemini-2.0-flash)
- **Speech**: Web Speech API (browser-native, free)
- **PDF Parsing**: pdf-parse
- **Styling**: Vanilla CSS with glassmorphism design

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/atanu0909/interviewer.git
   cd interviewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and replace `your_gemini_api_key_here` with your actual Gemini API key.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## ☁️ Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/atanu0909/interviewer&env=GEMINI_API_KEY&envDescription=Get%20your%20Gemini%20API%20key%20from%20Google%20AI%20Studio&envLink=https://aistudio.google.com/app/apikey)

### Manual Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
3. In **Environment Variables**, add:
   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | Your Gemini API key |
4. Click **Deploy**

> **Note:** The `GEMINI_API_KEY` is used server-side only (in API routes). It is never exposed to the browser.

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for AI features |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # Server-side API routes
│   │   ├── analyze-resume/     # Resume PDF parsing & AI analysis
│   │   ├── detect-stuck/       # Smart silence/stuck detection
│   │   ├── evaluate-answer/    # Text answer evaluation
│   │   ├── evaluate-audio/     # Audio answer evaluation
│   │   ├── evaluate-code/      # Code submission evaluation
│   │   ├── generate-questions/ # Role-specific question generation
│   │   └── generate-report/    # Post-interview report generation
│   ├── interview/              # Live interview page
│   ├── results/                # Results & feedback page
│   ├── setup/                  # Resume upload & role selection
│   ├── globals.css             # Design system & styles
│   ├── layout.js               # Root layout
│   └── page.js                 # Landing page
└── lib/
    ├── audioRecorder.js        # Browser audio recording
    ├── interviewEngine.js      # Interview state machine
    ├── speechManager.js        # Web Speech API manager
    └── voiceSynthesis.js       # Text-to-speech
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
