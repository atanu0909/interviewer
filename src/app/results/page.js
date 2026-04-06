"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function RadarChart({ scores, size = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scores) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 44;
    const labels = Object.keys(scores);
    const values = Object.values(scores);
    const n = labels.length;
    if (n === 0) return;
    const angleStep = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    // Draw grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (radius * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = idx * angleStep - Math.PI / 2;
      const val = Math.min(10, Math.max(0, values[idx] || 0));
      const r = (radius * val) / 10;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.fillStyle = "rgba(99, 102, 241, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const val = Math.min(10, Math.max(0, values[i] || 0));
      const r = (radius * val) / 10;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#a5b4fc";
      ctx.fill();
    }

    // Draw labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const labelR = radius + 28;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      const label = labels[i].replace(/([A-Z])/g, " $1").trim();
      ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), x, y + 4);
    }
  }, [scores, size]);

  return <canvas ref={canvasRef} />;
}

function CircularScore({ score, grade, size = 160 }) {
  const circumference = 2 * Math.PI * 62;
  const dashOffset = circumference - (circumference * Math.min(100, score)) / 100;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f97316" : "#ef4444";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r="62" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "2rem", fontWeight: 800, color }}>{score}</span>
        <span style={{
          fontSize: "1.5rem", fontWeight: 700,
          color, marginTop: -4,
        }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function HiringDecision({ decision }) {
  if (!decision) return null;
  const colorMap = { yes: "#10b981", maybe: "#f97316", no: "#ef4444" };
  const emojiMap = { yes: "✅", maybe: "🤔", no: "❌" };
  const labelMap = { yes: "Would Hire", maybe: "Maybe", no: "Would Not Hire" };
  const color = colorMap[decision.wouldHire] || "#f97316";
  
  return (
    <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
      <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 8 }}>
        {emojiMap[decision.wouldHire] || "🤔"}
      </span>
      <p style={{ fontWeight: 700, color, fontSize: "1.1rem" }}>
        {labelMap[decision.wouldHire] || "Undecided"}
      </p>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
        Confidence: {decision.confidence || "medium"}
      </p>
      {decision.reasoning && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>
          {decision.reasoning}
        </p>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem("interviewReport");
    if (!data) {
      router.push("/setup");
      return;
    }
    const parsed = JSON.parse(data);
    setReport(parsed.report);
    setAnswers(parsed.answers || []);
  }, [router]);

  if (!mounted || !report) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const scoreColor = (s) => s >= 7 ? "var(--accent-400)" : s >= 4 ? "var(--warm-400)" : "var(--danger-400)";

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

  const codingAnswers = answers.filter(a => a.category === "coding");
  const hasCoding = codingAnswers.length > 0;

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-3" />

      {/* Navbar */}
      <nav style={styles.nav}>
        <div className="container" style={styles.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => router.push("/")}>
            <span style={{ fontSize: "1.5rem" }}>🎤</span>
            <span className="gradient-text" style={{ fontSize: "1.25rem", fontWeight: 800 }}>InterviewAI</span>
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/setup")} id="retry-btn">
            🔄 New Interview
          </button>
        </div>
      </nav>

      <main className="container" style={styles.main}>
        <h1 className="animate-fade-in" style={{ textAlign: "center", marginBottom: 8 }}>
          Interview <span className="gradient-text">Results</span>
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 36 }} className="animate-fade-in">
          Here&apos;s your comprehensive performance analysis
        </p>

        {/* Top Row: Score + Radar + Hiring Decision */}
        <div style={styles.topGrid} className="animate-fade-in-up delay-1">
          {/* Overall Score */}
          <div className="glass-card" style={styles.scorePanel}>
            <h3 style={{ marginBottom: 16 }}>Overall Performance</h3>
            <CircularScore score={report.overallScore || 0} grade={report.grade || "—"} />
            <p style={{ marginTop: 16, fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
              {report.summary || "Interview completed."}
            </p>
            {report.readinessLevel && (
              <span className="badge badge-primary" style={{ marginTop: 12 }}>
                {report.readinessLevel}
              </span>
            )}
          </div>

          {/* Radar Chart */}
          <div className="glass-card" style={styles.radarPanel}>
            <h3 style={{ marginBottom: 16 }}>Skill Breakdown</h3>
            {report.categoryScores && Object.keys(report.categoryScores).length > 0 ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart scores={report.categoryScores} />
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No detailed scores available</p>
            )}
          </div>

          {/* Hiring Decision */}
          {report.mockScore && (
            <HiringDecision decision={report.mockScore} />
          )}
        </div>

        {/* Company Readiness + Resume Authenticity */}
        {(report.companyReadiness || report.resumeAuthenticity) && (
          <div style={styles.swGrid} className="animate-fade-in-up delay-2">
            {report.companyReadiness && (
              <div className="glass-card" style={styles.swCard}>
                <h3 style={{ marginBottom: 14, color: "#fbbf24" }}>🏢 Company Readiness</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {report.companyReadiness}
                </p>
              </div>
            )}
            {report.resumeAuthenticity && (
              <div className="glass-card" style={styles.swCard}>
                <h3 style={{ marginBottom: 14, color: "#c084fc" }}>🔍 Resume Authenticity</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {report.resumeAuthenticity}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div style={styles.swGrid} className="animate-fade-in-up delay-2">
          <div className="glass-card" style={styles.swCard}>
            <h3 style={{ marginBottom: 14, color: "var(--accent-400)" }}>💪 Strengths</h3>
            <ul style={styles.swList}>
              {(report.strengths || []).map((s, i) => (
                <li key={i} style={styles.swItem}>
                  <span style={{ color: "var(--accent-400)", marginRight: 8 }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card" style={styles.swCard}>
            <h3 style={{ marginBottom: 14, color: "var(--warm-400)" }}>🎯 Areas to Improve</h3>
            <ul style={styles.swList}>
              {(report.weaknesses || []).map((w, i) => (
                <li key={i} style={styles.swItem}>
                  <span style={{ color: "var(--warm-400)", marginRight: 8 }}>→</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coding Feedback Section */}
        {hasCoding && report.codingFeedback && (
          <div className="glass-card animate-fade-in-up delay-3" style={{ padding: "24px", marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, color: "#22d3ee" }}>💻 Coding Performance</h3>
            <div style={styles.swGrid2}>
              <div>
                <span className="label">Overall Coding Score</span>
                <p style={{
                  fontSize: "2rem", fontWeight: 800,
                  color: (report.codingFeedback.overallCodingScore || 0) >= 7 ? "var(--accent-400)" :
                    (report.codingFeedback.overallCodingScore || 0) >= 4 ? "var(--warm-400)" : "var(--danger-400)",
                }}>
                  {report.codingFeedback.overallCodingScore || "—"}/10
                </p>
              </div>
              <div>
                <span className="label">Language Proficiency</span>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {report.codingFeedback.languageProficiency || "N/A"}
                </p>
              </div>
            </div>
            {report.codingFeedback.strengths?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <span className="label" style={{ color: "#22d3ee" }}>Coding Strengths</span>
                <ul style={styles.swList}>
                  {report.codingFeedback.strengths.map((s, i) => (
                    <li key={i} style={styles.swItem}>
                      <span style={{ color: "#22d3ee", marginRight: 8 }}>✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.codingFeedback.improvements?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <span className="label" style={{ color: "var(--warm-400)" }}>Coding Improvements</span>
                <ul style={styles.swList}>
                  {report.codingFeedback.improvements.map((s, i) => (
                    <li key={i} style={styles.swItem}>
                      <span style={{ color: "var(--warm-400)", marginRight: 8 }}>→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {report.tips && report.tips.length > 0 && (
          <div className="glass-card animate-fade-in-up delay-3" style={styles.tipsCard}>
            <h3 style={{ marginBottom: 16 }}>📝 Improvement Tips</h3>
            <div style={styles.tipsGrid}>
              {report.tips.map((tip, i) => (
                <div key={i} style={styles.tipItem}>
                  <span style={styles.tipNum}>{i + 1}</span>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Topics */}
        {report.recommendedTopics && report.recommendedTopics.length > 0 && (
          <div className="glass-card animate-fade-in-up delay-3" style={{ padding: "24px", marginBottom: 24 }}>
            <h3 style={{ marginBottom: 14 }}>📚 Recommended Study Topics</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {report.recommendedTopics.map((topic, i) => (
                <span key={i} className="badge badge-primary">{topic}</span>
              ))}
            </div>
          </div>
        )}

        {/* Per-Question Breakdown */}
        <div className="animate-fade-in-up delay-4" style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16 }}>📋 Question-by-Question Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {answers.map((a, i) => (
              <div
                key={i}
                className="glass-card"
                style={{ padding: "16px 20px", cursor: "pointer" }}
                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", fontWeight: 700,
                        background: a.score >= 7 ? "rgba(16,185,129,0.15)" :
                          a.score >= 4 ? "rgba(249,115,22,0.15)" : "rgba(239,68,68,0.15)",
                        color: scoreColor(a.score),
                      }}>
                        {a.score}
                      </span>
                      <span className={`badge ${getCategoryBadgeClass(a.category)}`} style={{ fontSize: "0.65rem" }}>
                        {a.category}
                      </span>
                      {a.category === "coding" && a.codingLanguage && (
                        <span className="badge badge-coding" style={{ fontSize: "0.6rem" }}>
                          {a.codingLanguage}
                        </span>
                      )}
                    </div>
                    <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 500 }}>
                      {a.question?.length > 120 ? a.question.substring(0, 120) + "..." : a.question}
                    </p>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: "1.2rem", marginLeft: 12 }}>
                    {expandedQ === i ? "▲" : "▼"}
                  </span>
                </div>

                {expandedQ === i && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    {/* Full question for coding */}
                    {a.category === "coding" && a.question?.length > 120 && (
                      <div style={{ marginBottom: 12 }}>
                        <span className="label">Full Question</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {a.question}
                        </p>
                      </div>
                    )}

                    {/* Code submission */}
                    {a.codeSubmission ? (
                      <div style={{ marginBottom: 12 }}>
                        <span className="label">Your Code</span>
                        <div className="code-result">
                          {a.codeSubmission}
                        </div>
                        {a.correctness !== undefined && (
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <span className={`badge ${a.correctness ? "badge-accent" : "badge-warm"}`}>
                              {a.correctness ? "✓ Correct" : "✗ Issues Found"}
                            </span>
                            {a.timeComplexity && (
                              <span className="badge badge-primary">Time: {a.timeComplexity}</span>
                            )}
                            {a.spaceComplexity && (
                              <span className="badge">Space: {a.spaceComplexity}</span>
                            )}
                          </div>
                        )}
                        {a.codeReview && (
                          <div style={{ marginTop: 10 }}>
                            <span className="label">Code Review</span>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                              {a.codeReview}
                            </p>
                          </div>
                        )}
                        {a.suggestions?.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <span className="label">Suggestions</span>
                            <ul style={{ paddingLeft: 16, margin: 0 }}>
                              {a.suggestions.map((s, j) => (
                                <li key={j} style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 4 }}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <span className="label">Your Answer</span>
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          {a.answer || "(No response)"}
                        </p>
                      </div>
                    )}

                    {a.feedback && (
                      <div>
                        <span className="label">Feedback</span>
                        <p style={{ fontSize: "0.9rem", color: "var(--primary-300)", lineHeight: 1.6 }}>
                          {a.feedback}
                        </p>
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="badge" style={{ fontSize: "0.7rem" }}>
                        ⏱️ {a.timeTaken ? `${a.timeTaken}s` : "—"}
                      </span>
                      <span className="badge" style={{
                        fontSize: "0.7rem",
                        background: a.score >= 7 ? "rgba(16,185,129,0.1)" :
                          a.score >= 4 ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)",
                        color: scoreColor(a.score),
                      }}>
                        Score: {a.score}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="glass-card" style={{ padding: "32px", textAlign: "center", marginBottom: 40 }}>
          <h3 style={{ marginBottom: 8 }}>Ready for another round?</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            Practice makes perfect. Try a different role, company, or difficulty level!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-primary btn-lg" onClick={() => router.push("/setup")} id="new-interview-btn">
              🎤 New Interview
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => router.push("/")} id="home-btn">
              🏠 Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    background: "rgba(5, 10, 24, 0.8)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  navInner: {
    display: "flex", justifyContent: "space-between", alignItems: "center", height: 64,
  },
  main: { paddingTop: 96, position: "relative", zIndex: 1 },
  topGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 24, marginBottom: 24, alignItems: "start",
  },
  scorePanel: {
    padding: "28px", display: "flex", flexDirection: "column", alignItems: "center",
  },
  radarPanel: { padding: "28px" },
  swGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24,
  },
  swGrid2: {
    display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start",
  },
  swCard: { padding: "24px" },
  swList: { listStyle: "none" },
  swItem: {
    display: "flex", alignItems: "start", color: "var(--text-secondary)",
    fontSize: "0.9rem", marginBottom: 10, lineHeight: 1.5,
  },
  tipsCard: { padding: "24px", marginBottom: 24 },
  tipsGrid: { display: "flex", flexDirection: "column", gap: 12 },
  tipItem: { display: "flex", gap: 12, alignItems: "start" },
  tipNum: {
    minWidth: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(99, 102, 241, 0.15)", color: "var(--primary-300)",
    fontWeight: 700, fontSize: "0.8rem",
  },
};
