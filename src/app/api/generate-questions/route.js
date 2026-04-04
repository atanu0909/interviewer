import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { resumeAnalysis, resumeText, targetRole, difficulty } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const difficultyGuide = {
      junior: 'Entry-level questions. Focus on fundamentals, basic concepts, and eagerness to learn. Questions should be approachable.',
      mid: 'Mid-level questions. Include system design basics, problem-solving scenarios, and deeper technical concepts.',
      senior: 'Senior-level questions. Focus on architecture, leadership, trade-offs, mentoring, and complex problem-solving.',
    };

    const prompt = `You are an expert technical interviewer for the role of "${targetRole}" at a top tech company.

=== FULL RESUME TEXT (use this to ask specific, detailed questions) ===
"""
${resumeText || 'Not available'}
"""

=== STRUCTURED RESUME ANALYSIS ===
Candidate Resume Summary:
- Name: ${resumeAnalysis.name || 'Candidate'}
- Skills: ${JSON.stringify(resumeAnalysis.skills || {})}
- Experience: ${JSON.stringify(resumeAnalysis.experience || [])}
- Projects: ${JSON.stringify(resumeAnalysis.projects || [])}
- Education: ${JSON.stringify(resumeAnalysis.education || [])}
- Strengths: ${JSON.stringify(resumeAnalysis.strengths || [])}
- Gaps/Concerns: ${JSON.stringify(resumeAnalysis.gaps || [])}
- Certifications: ${JSON.stringify(resumeAnalysis.certifications || [])}

Difficulty Level: ${difficulty}
Guide: ${difficultyGuide[difficulty] || difficultyGuide.mid}

Generate exactly 14 interview questions tailored to this candidate and role. The questions MUST be in this EXACT ORDER — grouped by category and following the sequence below:

**PHASE 1 — Resume Deep-Dive (Questions 1–5, category: "resume")**
These come FIRST and must directly reference the candidate's actual resume content:
  Q1: An ice-breaker about their background/journey — "Tell me about yourself..."
  Q2: A question about a SPECIFIC project from their resume — name the project, ask what they built, challenges faced, and their individual contribution
  Q3: A question about their work EXPERIENCE — reference a specific role/company listed, ask about responsibilities, achievements, or what they learned
  Q4: A question about a SKILL or TECHNOLOGY from their resume — ask how they used it in practice, why they chose it, or compare it to alternatives
  Q5: A question about a GAP or interesting aspect in their resume — something unusual, a career transition, or a skill they claim but hasn't been demonstrated

**PHASE 2 — Technical Knowledge (Questions 6–9, category: "technical")**
Role-specific technical questions for "${targetRole}":
  Q6-Q9: Test core technical knowledge, system design concepts, coding/architecture patterns, and domain expertise relevant to the role

**PHASE 3 — Behavioral (Questions 10–12, category: "behavioral")**
STAR-method behavioral questions:
  Q10-Q12: Ask about teamwork, conflict resolution, leadership, handling failures, or tight deadlines

**PHASE 4 — Situational (Questions 13–14, category: "situational")**
Hypothetical workplace scenarios:
  Q13-Q14: "What would you do if..." scenarios relevant to the role

CRITICAL RULES:
- Questions in Phase 1 MUST reference REAL content from the resume — actual project names, company names, technologies, etc. Do NOT ask generic questions
- Questions must be appropriate for the "${difficulty}" difficulty level
- Each question should be conversational — as if a real interviewer is naturally talking
- Keep questions clear and focused (1-3 sentences max)
- The array MUST follow the exact order: 5 resume → 4 technical → 3 behavioral → 2 situational

Return a JSON array with EXACTLY this structure (no markdown, no code blocks, just pure JSON):
[
  {
    "question": "The actual interview question text",
    "category": "resume|technical|behavioral|situational",
    "expectedTopics": ["topic1", "topic2"],
    "difficulty": "${difficulty}"
  }
]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let questions;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback questions — still follow the resume-first order
      const candidateName = resumeAnalysis?.name || 'you';
      const firstProject = resumeAnalysis?.projects?.[0]?.name || 'your most notable project';
      const firstSkill = resumeAnalysis?.skills?.technical?.[0] || 'your primary technology';
      questions = [
        { question: `To start things off, can you give me a brief walkthrough of your background and what led you to apply for the ${targetRole} role?`, category: 'resume', expectedTopics: ['background', 'motivation'], difficulty },
        { question: `I see you worked on ${firstProject}. Can you walk me through what you built and what your individual contribution was?`, category: 'resume', expectedTopics: ['projects', 'technical depth'], difficulty },
        { question: `Tell me about your most recent work experience. What were your main responsibilities and key achievements?`, category: 'resume', expectedTopics: ['experience', 'achievements'], difficulty },
        { question: `You've listed ${firstSkill} as one of your skills. How have you used it in real projects, and what do you find most challenging about it?`, category: 'resume', expectedTopics: ['skills', 'hands-on experience'], difficulty },
        { question: `What are the key technical skills you think are essential for a ${targetRole}?`, category: 'technical', expectedTopics: ['role knowledge', 'self-awareness'], difficulty },
        { question: 'Describe a time when you had to learn a new technology quickly. How did you approach it?', category: 'behavioral', expectedTopics: ['learning ability', 'adaptability'], difficulty },
        { question: 'How do you handle disagreements with team members about technical decisions?', category: 'situational', expectedTopics: ['collaboration', 'communication'], difficulty },
      ];
    }

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions: ' + error.message },
      { status: 500 }
    );
  }
}
