"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: "🎯",
    title: "Smart Resume Analysis",
    description: "Upload your resume and our AI deeply analyzes your skills, experience, and projects to generate tailored questions.",
  },
  {
    icon: "🎙️",
    title: "Voice-Powered Interview",
    description: "Speak naturally with Indian English optimized speech recognition. No typing needed — just like a real interview.",
  },
  {
    icon: "🧠",
    title: "AI That Understands You",
    description: "Stuck on a question? The AI detects pauses, offers hints, and gracefully moves on — just like a real interviewer.",
  },
  {
    icon: "📊",
    title: "Detailed Feedback Report",
    description: "Get comprehensive scoring across technical, behavioral, and communication skills with actionable improvement tips.",
  },
  {
    icon: "💼",
    title: "15+ IT Roles",
    description: "From Frontend Developer to Cloud Architect — practice for any IT role at junior, mid, or senior level.",
  },
  {
    icon: "🚀",
    title: "Completely Free",
    description: "Uses browser-native speech recognition and your own Gemini API key. No hidden costs or subscriptions.",
  },
];

const STEPS = [
  { num: "01", title: "Upload Resume", desc: "Drop your PDF resume for instant AI analysis" },
  { num: "02", title: "Choose Your Role", desc: "Select target IT role and difficulty level" },
  { num: "03", title: "Live Interview", desc: "Answer questions using your voice naturally" },
  { num: "04", title: "Get Results", desc: "Receive detailed scores and improvement tips" },
];

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Navbar */}
      <nav style={styles.nav}>
        <div className="container" style={styles.navInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🎤</span>
            <span className="gradient-text" style={styles.logoText}>InterviewAI</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => router.push("/setup")}
            id="nav-start-btn"
          >
            Start Interview →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={styles.hero}>
        <div className="container" style={styles.heroInner}>
          <div className="animate-fade-in-up">
            <span className="badge badge-primary" style={{ marginBottom: 16 }}>
              ✨ AI-Powered Mock Interviews
            </span>
            <h1 style={styles.heroTitle}>
              Ace Your Next
              <br />
              <span className="gradient-text">Tech Interview</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Upload your resume, pick your dream role, and practice with a live AI
              interviewer that listens, adapts, and gives you real feedback — powered
              by voice recognition optimized for Indian English.
            </p>
            <div style={styles.heroCTA}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => router.push("/setup")}
                id="hero-start-btn"
              >
                🎙️ Start Mock Interview
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                id="hero-learn-btn"
              >
                Learn More ↓
              </button>
            </div>
          </div>

          {/* Floating interview mockup */}
          <div className="animate-fade-in delay-3" style={styles.heroVisual}>
            <div className="glass-card" style={styles.mockCard}>
              <div style={styles.mockAvatar}>
                <div style={styles.mockAvatarRing} />
                <span style={styles.mockAvatarEmoji}>🤖</span>
              </div>
              <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: 8 }}>
                &quot;Tell me about a challenging project you worked on...&quot;
              </p>
              <div style={styles.mockWaveform}>
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.mockWaveBar,
                      animationDelay: `${i * 0.1}s`,
                      height: `${8 + Math.random() * 20}px`,
                    }}
                  />
                ))}
              </div>
              <p style={{ color: "var(--accent-400)", fontSize: "0.8rem", marginTop: 8 }}>
                🎙️ Listening...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={styles.section} id="how-it-works">
        <div className="container">
          <h2 style={styles.sectionTitle} className="animate-fade-in">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div style={styles.stepsGrid}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`glass-card animate-fade-in-up delay-${i + 1}`}
                style={styles.stepCard}
              >
                <span style={styles.stepNum}>{step.num}</span>
                <h3 style={{ marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: "0.9rem" }}>{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <span style={styles.stepArrow}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.section} id="features">
        <div className="container">
          <h2 style={styles.sectionTitle} className="animate-fade-in">
            Why Choose <span className="gradient-text">InterviewAI</span>
          </h2>
          <div style={styles.featuresGrid}>
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`glass-card animate-fade-in-up delay-${(i % 3) + 1}`}
                style={styles.featureCard}
              >
                <span style={styles.featureIcon}>{feature.icon}</span>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={{ fontSize: "0.9rem" }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...styles.section, paddingBottom: 100 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="glass-card animate-fade-in" style={styles.ctaCard}>
            <h2 style={{ marginBottom: 12 }}>
              Ready to <span className="gradient-text">Ace Your Interview?</span>
            </h2>
            <p style={{ maxWidth: 500, margin: "0 auto 24px", fontSize: "1.05rem" }}>
              Start practicing now — it&apos;s free, private, and only takes 15 minutes.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => router.push("/setup")}
              id="cta-start-btn"
            >
              🎤 Start Your Mock Interview
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Built with ❤️ using Gemini AI & Web Speech API • Optimized for Indian English
          </p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: "rgba(5, 10, 24, 0.8)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  navInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: 64,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    fontSize: "1.5rem",
  },
  logoText: {
    fontSize: "1.25rem",
    fontWeight: 800,
  },
  hero: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    paddingTop: 80,
    position: "relative",
    zIndex: 1,
  },
  heroInner: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 60,
    alignItems: "center",
  },
  heroTitle: {
    marginBottom: 20,
    lineHeight: 1.1,
  },
  heroSubtitle: {
    fontSize: "1.15rem",
    maxWidth: 520,
    marginBottom: 32,
    lineHeight: 1.7,
  },
  heroCTA: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  heroVisual: {
    display: "flex",
    justifyContent: "center",
  },
  mockCard: {
    padding: "32px 28px",
    maxWidth: 380,
    textAlign: "center",
  },
  mockAvatar: {
    position: "relative",
    width: 80,
    height: 80,
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mockAvatarRing: {
    position: "absolute",
    inset: -4,
    borderRadius: "50%",
    border: "2px solid var(--primary-500)",
    animation: "pulse-ring 2s infinite",
  },
  mockAvatarEmoji: {
    fontSize: "2.5rem",
  },
  mockWaveform: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    height: 30,
    marginTop: 12,
  },
  mockWaveBar: {
    width: 4,
    background: "var(--gradient-primary)",
    borderRadius: 2,
    animation: "speaking-wave 1.2s ease-in-out infinite",
  },
  section: {
    padding: "80px 0",
    position: "relative",
    zIndex: 1,
  },
  sectionTitle: {
    textAlign: "center",
    marginBottom: 48,
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 24,
    position: "relative",
  },
  stepCard: {
    padding: "28px 24px",
    textAlign: "center",
    position: "relative",
  },
  stepNum: {
    display: "block",
    fontSize: "2rem",
    fontWeight: 800,
    background: "var(--gradient-primary)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 12,
  },
  stepArrow: {
    position: "absolute",
    right: -16,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "1.5rem",
    color: "var(--text-muted)",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
  },
  featureCard: {
    padding: "28px 24px",
  },
  featureIcon: {
    display: "block",
    fontSize: "2rem",
    marginBottom: 12,
  },
  featureTitle: {
    marginBottom: 8,
    fontSize: "1.1rem",
  },
  ctaCard: {
    padding: "48px 32px",
    maxWidth: 600,
    margin: "0 auto",
  },
  footer: {
    padding: "24px 0",
    borderTop: "1px solid var(--border-subtle)",
    position: "relative",
    zIndex: 1,
  },
};
