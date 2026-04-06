"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const IT_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "Data Scientist",
  "ML Engineer",
  "AI Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Site Reliability Engineer",
  "Mobile Developer (React Native)",
  "Mobile Developer (Flutter)",
  "iOS Developer",
  "Android Developer",
  "QA / Test Engineer",
  "Cybersecurity Analyst",
  "Product Manager (Technical)",
  "UI/UX Designer",
  "System Administrator",
  "Database Administrator",
  "Data Engineer",
  "Blockchain Developer",
  "Software Engineer",
  "Solutions Architect",
  "Technical Lead",
  "Engineering Manager",
];

const DIFFICULTY_LEVELS = [
  { value: "junior", label: "🌱 Junior", desc: "0-2 years" },
  { value: "mid", label: "💼 Mid-Level", desc: "2-5 years" },
  { value: "senior", label: "🏆 Senior", desc: "5-8 years" },
  { value: "lead", label: "👑 Lead", desc: "8+ years" },
];

const INTERVIEW_TYPES = [
  { value: "full", icon: "🎯", label: "Full Interview", desc: "All phases: resume, technical, coding, behavioral" },
  { value: "resume", icon: "📋", label: "Resume Deep-Dive", desc: "Focus on your projects, experience & skills" },
  { value: "technical", icon: "⚙️", label: "Technical Only", desc: "Technical + system design + coding" },
  { value: "coding", icon: "💻", label: "Coding Focus", desc: "Heavy coding challenges with review" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: upload, 2: configure, 3: analyzing
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [difficulty, setDifficulty] = useState("mid");
  const [interviewType, setInterviewType] = useState("full");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [resumeText, setResumeText] = useState("");

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  };

  const analyzeResume = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      setAnalysis(data.analysis);
      setResumeText(data.resumeText || "");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to analyze resume. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const startInterview = async () => {
    if (!targetRole || !analysis) return;
    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeAnalysis: analysis,
          resumeText,
          targetRole,
          difficulty,
          targetCompany,
          interviewType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      // Store interview data in sessionStorage
      sessionStorage.setItem(
        "interviewData",
        JSON.stringify({
          questions: data.questions,
          resumeAnalysis: analysis,
          resumeText,
          targetRole,
          difficulty,
          targetCompany,
          interviewType,
        })
      );

      router.push("/interview");
    } catch (err) {
      setError(err.message || "Failed to generate questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Count categories from analysis
  const projectCount = (analysis?.projects || []).length;
  const internshipCount = (analysis?.internships || []).length;
  const experienceCount = (analysis?.experience || []).length;
  const langCount = (analysis?.programmingLanguages || []).length;

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Navbar */}
      <nav style={styles.nav}>
        <div className="container" style={styles.navInner}>
          <div style={styles.logo} onClick={() => router.push("/")} role="button" tabIndex={0}>
            <span style={{ fontSize: "1.5rem" }}>🎤</span>
            <span className="gradient-text" style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              InterviewAI
            </span>
          </div>
          <div style={styles.steps}>
            <span className={`badge ${step >= 1 ? "badge-primary" : ""}`}>1. Upload</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span className={`badge ${step >= 2 ? "badge-primary" : ""}`}>2. Configure</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span className="badge">3. Interview</span>
          </div>
        </div>
      </nav>

      <main className="container" style={styles.main}>
        {/* Step 1: Upload Resume */}
        {step === 1 && (
          <div className="animate-fade-in-up" style={styles.centerContent}>
            <h1 style={styles.title}>
              Upload Your <span className="gradient-text">Resume</span>
            </h1>
            <p style={styles.subtitle}>
              Drop your PDF resume below and our AI will deeply analyze your skills, projects, internships, and experience.
            </p>

            <div
              className="glass-card"
              style={{
                ...styles.dropZone,
                borderColor: dragActive 
                  ? "var(--primary-500)" 
                  : file 
                    ? "var(--accent-500)" 
                    : "var(--border-subtle)",
                background: dragActive 
                  ? "rgba(99, 102, 241, 0.08)" 
                  : "var(--bg-glass)",
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              id="resume-drop-zone"
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="file-input"
              />
              {file ? (
                <div>
                  <span style={{ fontSize: "3rem", display: "block", marginBottom: 12 }}>✅</span>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.1rem" }}>
                    {file.name}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB • Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: "3rem", display: "block", marginBottom: 12 }}>📄</span>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.05rem" }}>
                    Drag & drop your resume here
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                    or click to browse • PDF only
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p style={styles.error}>⚠️ {error}</p>
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={analyzeResume}
              disabled={!file || analyzing}
              style={{ marginTop: 24 }}
              id="analyze-btn"
            >
              {analyzing ? (
                <>
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Analyzing Resume...
                </>
              ) : (
                "🔍 Analyze Resume"
              )}
            </button>
          </div>
        )}

        {/* Step 2: Full Configuration */}
        {step === 2 && analysis && (
          <div className="animate-fade-in-up" style={{ maxWidth: 1050, margin: "0 auto" }}>
            <h1 style={styles.title}>
              Configure Your <span className="gradient-text">Interview</span>
            </h1>

            <div style={styles.threeCol}>
              {/* Left: Detailed Resume Analysis */}
              <div className="glass-card" style={styles.analysisCard}>
                <h3 style={{ marginBottom: 16 }}>📋 Resume Deep Analysis</h3>
                
                <div style={styles.analysisItem}>
                  <span className="label">Candidate</span>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.05rem" }}>{analysis.name}</p>
                </div>

                {analysis.summary && (
                  <div style={styles.analysisItem}>
                    <span className="label">Summary</span>
                    <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{analysis.summary}</p>
                  </div>
                )}

                {/* Programming Languages */}
                {(analysis.programmingLanguages || []).length > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">💻 Programming Languages ({langCount})</span>
                    <div style={styles.tagsWrap}>
                      {analysis.programmingLanguages.map((lang) => (
                        <span key={lang.name} className={`badge ${lang.proficiency === 'primary' ? 'badge-coding' : 'badge-primary'}`}
                          title={lang.context}
                        >
                          {lang.name} {lang.proficiency === 'primary' ? '★' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Skills */}
                <div style={styles.analysisItem}>
                  <span className="label">🛠️ Technical Skills</span>
                  <div style={styles.tagsWrap}>
                    {(analysis.skills?.technical || []).slice(0, 12).map((s) => (
                      <span key={s} className="badge badge-primary">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                {projectCount > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">🚀 Projects ({projectCount})</span>
                    {analysis.projects.slice(0, 4).map((p, i) => (
                      <div key={i} style={styles.miniCard}>
                        <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{p.name}</p>
                        <p style={{ fontSize: "0.8rem", marginTop: 2 }}>{p.description?.substring(0, 100)}{p.description?.length > 100 ? '...' : ''}</p>
                        <div style={{ ...styles.tagsWrap, marginTop: 4 }}>
                          {(p.technologies || []).slice(0, 4).map((t) => (
                            <span key={t} style={styles.miniTag}>{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Internships */}
                {internshipCount > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">🎓 Internships ({internshipCount})</span>
                    {analysis.internships.slice(0, 3).map((intern, i) => (
                      <div key={i} style={styles.miniCard}>
                        <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                          {intern.title} @ {intern.company}
                        </p>
                        <p style={{ fontSize: "0.8rem", marginTop: 2 }}>{intern.duration}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Experience */}
                {experienceCount > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">💼 Experience ({experienceCount})</span>
                    {analysis.experience.slice(0, 3).map((exp, i) => (
                      <div key={i} style={styles.miniCard}>
                        <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                          {exp.title} @ {exp.company}
                        </p>
                        <p style={{ fontSize: "0.8rem", marginTop: 2 }}>{exp.duration}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                {(analysis.strengths || []).length > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">💪 Key Strengths</span>
                    <div style={styles.tagsWrap}>
                      {analysis.strengths.slice(0, 5).map((s) => (
                        <span key={s} className="badge badge-accent">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {(analysis.achievements || []).length > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">🏆 Achievements</span>
                    <div style={styles.tagsWrap}>
                      {analysis.achievements.slice(0, 4).map((a) => (
                        <span key={a} className="badge badge-warm">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interview Focus Areas */}
                {(analysis.interviewFocusAreas || []).length > 0 && (
                  <div style={styles.analysisItem}>
                    <span className="label">🎯 AI Will Probe</span>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {analysis.interviewFocusAreas.slice(0, 3).map((area, i) => (
                        <li key={i} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right: Configuration */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Target Role */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <label className="label" htmlFor="role-select">🎯 Target Role</label>
                  <select
                    className="select"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    id="role-select"
                  >
                    <option value="">Select a role...</option>
                    {IT_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Target Company */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <label className="label" htmlFor="company-input">🏢 Target Company</label>
                  <input
                    type="text"
                    className="company-input"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="e.g. Google, Amazon, TCS, Startup..."
                    id="company-input"
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Questions will be tailored to this company&apos;s interview style
                  </p>
                </div>

                {/* Difficulty Level */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <span className="label">📊 Difficulty Level</span>
                  <div style={styles.difficultyGrid}>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        style={{
                          ...styles.difficultyCard,
                          borderColor: difficulty === level.value ? "var(--primary-500)" : "var(--border-subtle)",
                          background: difficulty === level.value ? "rgba(99, 102, 241, 0.1)" : "var(--bg-glass)",
                        }}
                        onClick={() => setDifficulty(level.value)}
                      >
                        <span style={{ fontSize: "1.3rem" }}>{level.label.split(" ")[0]}</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                          {level.label.split(" ").slice(1).join(" ")}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{level.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interview Type */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <span className="label">📝 Interview Type</span>
                  <div style={styles.interviewTypeGrid}>
                    {INTERVIEW_TYPES.map((type) => (
                      <button
                        key={type.value}
                        className={`interview-type-card ${interviewType === type.value ? 'active' : ''}`}
                        onClick={() => setInterviewType(type.value)}
                      >
                        <span style={{ fontSize: "1.5rem" }}>{type.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{type.label}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interview Summary */}
                <div className="glass-card" style={{ padding: "16px 20px", background: "rgba(99, 102, 241, 0.05)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--text-primary)" }}>Interview Preview:</strong>{" "}
                    {interviewType === "full" ? "~20 questions • ~30 min" : 
                     interviewType === "resume" ? "~10 questions • ~15 min" :
                     interviewType === "technical" ? "~12 questions • ~25 min" :
                     "~10 questions • ~25 min"} 
                    {targetCompany ? ` • ${targetCompany} style` : ""} 
                    • {difficulty} level
                    {langCount > 0 ? ` • Coding in ${analysis.programmingLanguages[0].name}` : ""}
                  </p>
                </div>

                {error && <p style={styles.error}>⚠️ {error}</p>}

                <button
                  className="btn btn-accent btn-lg"
                  onClick={startInterview}
                  disabled={!targetRole || generating}
                  id="start-interview-btn"
                  style={{ width: "100%" }}
                >
                  {generating ? (
                    <>
                      <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      Generating Questions...
                    </>
                  ) : (
                    "🎙️ Begin Interview"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
  logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  steps: { display: "flex", alignItems: "center", gap: 8 },
  main: { paddingTop: 100, paddingBottom: 60, position: "relative", zIndex: 1 },
  centerContent: { maxWidth: 560, margin: "0 auto", textAlign: "center" },
  title: { marginBottom: 12, textAlign: "center" },
  subtitle: { textAlign: "center", fontSize: "1.05rem", marginBottom: 32, maxWidth: 500, marginLeft: "auto", marginRight: "auto" },
  dropZone: {
    padding: "48px 32px", textAlign: "center", cursor: "pointer",
    borderWidth: 2, borderStyle: "dashed", borderRadius: "var(--radius-lg)",
    transition: "all 0.25s ease",
  },
  error: {
    color: "var(--danger-400)", marginTop: 12, fontSize: "0.9rem", textAlign: "center",
  },
  threeCol: {
    display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, alignItems: "start",
  },
  analysisCard: { padding: "24px", maxHeight: "calc(100vh - 160px)", overflowY: "auto" },
  analysisItem: { marginBottom: 16 },
  tagsWrap: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 },
  miniCard: {
    padding: "10px 12px", marginTop: 6,
    background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
  },
  miniTag: {
    display: "inline-block", padding: "1px 6px", borderRadius: "var(--radius-sm)",
    fontSize: "0.7rem", background: "rgba(99,102,241,0.1)", color: "var(--primary-300)",
  },
  difficultyGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  difficultyCard: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 3, padding: "12px 6px", border: "1px solid", borderRadius: "var(--radius-md)",
    cursor: "pointer", transition: "all 0.2s", background: "none",
    fontFamily: "var(--font-sans)",
  },
  interviewTypeGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
};
