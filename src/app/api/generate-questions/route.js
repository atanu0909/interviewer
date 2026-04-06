import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { resumeAnalysis, resumeText, targetRole, difficulty, targetCompany, interviewType } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const difficultyGuide = {
      junior: 'Entry-level questions (0-2 years). Focus on fundamentals, basic concepts, eagerness to learn. Coding: simple data structure problems, string manipulation, basic algorithms.',
      mid: 'Mid-level questions (2-5 years). Include system design basics, problem-solving, deeper technical concepts. Coding: medium difficulty — algorithms, optimization, design patterns.',
      senior: 'Senior-level questions (5+ years). Focus on architecture, leadership, trade-offs, mentoring, complex system design. Coding: complex algorithmic problems, system-level thinking.',
      lead: 'Lead/Principal-level questions (8+ years). Focus on strategic thinking, team building, cross-functional leadership, architectural vision. Coding: system design + code architecture.',
    };

    // Determine primary programming language for coding questions
    const primaryLang = resumeAnalysis.programmingLanguages?.find(l => l.proficiency === 'primary')?.name
      || resumeAnalysis.programmingLanguages?.[0]?.name
      || resumeAnalysis.skills?.technical?.find(s => ['python', 'java', 'javascript', 'c++', 'c#', 'typescript', 'go', 'rust', 'ruby', 'php', 'kotlin', 'swift'].includes(s.toLowerCase()))
      || 'Python';

    // Company-specific interview style guidance
    let companyStyle = '';
    if (targetCompany) {
      const companyLower = targetCompany.toLowerCase();
      if (['google', 'alphabet'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Google. Style: Heavy focus on algorithms, data structures, system design, and Googleyness (collaboration, intellectual humility). Ask at least one algorithmic coding question. Behavioral questions should probe for collaboration and innovation.`;
      } else if (['amazon', 'aws'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Amazon. Style: Frame behavioral questions around Amazon's Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep, Earn Trust). Technical questions should focus on scalability and distributed systems.`;
      } else if (['microsoft'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Microsoft. Style: Mix of coding, system design, and behavioral. Emphasize growth mindset, collaboration, and impact. Technical questions should cover both breadth and depth.`;
      } else if (['meta', 'facebook'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Meta. Style: Heavy coding focus with system design for senior roles. Questions should emphasize scale (billions of users), product thinking, and move-fast mentality. Behavioral around impact and collaboration.`;
      } else if (['apple'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Apple. Style: Focus on attention to detail, craftsmanship, passion for the product. Technical depth matters. Ask about design decisions and trade-offs extensively.`;
      } else if (['tcs', 'infosys', 'wipro', 'hcl', 'cognizant', 'tech mahindra', 'capgemini'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: ${targetCompany} (Indian IT Services). Style: Focus on fundamentals — OOP, DBMS, SQL, networking basics, and language proficiency. Behavioral questions about teamwork and client handling. Less system design, more core CS fundamentals. Ask questions about SDLC, Agile methodology.`;
      } else if (['startup', 'early stage', 'seed'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Startup. Style: Emphasize breadth over depth, ownership, wearing multiple hats, moving fast. Ask about building things from scratch, handling ambiguity, and making trade-offs with limited resources.`;
      } else {
        companyStyle = `Company: ${targetCompany}. Tailor questions to match professional standards expected at this company. Mix technical depth with practical problem-solving.`;
      }
    }

    // Determine question counts based on interview type
    let phaseInstructions = '';
    const isFullInterview = !interviewType || interviewType === 'full';
    const isResumeOnly = interviewType === 'resume';
    const isTechnicalOnly = interviewType === 'technical';
    const isCodingFocus = interviewType === 'coding';

    if (isResumeOnly) {
      phaseInstructions = `Generate exactly 10 questions. ALL should be resume category, deeply probing every aspect of the candidate's resume — projects, experience, internships, skills, gaps.`;
    } else if (isTechnicalOnly) {
      phaseInstructions = `Generate exactly 12 questions:
- 2 resume questions (ice-breaker + one project question)
- 6 technical questions (deep domain knowledge for ${targetRole})
- 2 coding challenges (in ${primaryLang})
- 2 system design / architecture questions`;
    } else if (isCodingFocus) {
      phaseInstructions = `Generate exactly 10 questions:
- 1 resume ice-breaker
- 2 technical concept questions
- 5 coding challenges of increasing difficulty (all in ${primaryLang})
- 2 code review / optimization questions`;
    } else {
      // Full interview
      phaseInstructions = `Generate exactly 20 interview questions in this EXACT order:

**PHASE 1 — Resume Introduction (2 Qs, category: "resume")**
Q1: Ice-breaker — "Tell me about yourself and your journey into tech..."
Q2: Career motivation — Why this role? Why this company? What excites them?

**PHASE 2 — Project Deep-Dive (4 Qs, category: "project")**
For the candidate's most impressive/relevant projects:
Q3: "Walk me through [Project Name]. What problem were you solving and what was your approach?"
Q4: "Why did you choose [Technology X] for [Project Name]? Did you consider [Alternative Y]? What were the trade-offs?"
Q5: "What was the biggest challenge you faced in [Project Name] and how did you overcome it?"
Q6: "If you could rebuild [Project Name] today, what would you do differently?"

**PHASE 3 — Experience & Internship Deep-Dive (3 Qs, category: "experience")**
Q7: About their most recent/relevant work experience — "At [Company], what were your main responsibilities? What's something you're particularly proud of delivering?"
Q8: About internship experience (if any) — "During your internship at [Company], what did you learn about working in a professional environment?" OR if no internship, about learning experience
Q9: About a skill gap or interesting aspect — "I notice [interesting aspect]. Can you tell me more about that?"

**PHASE 4 — Technical Knowledge (3 Qs, category: "technical")**
Q10-Q12: Core technical questions for ${targetRole}. These should test:
  - Fundamental concepts (OOP, data structures, algorithms, databases, etc.)
  - Domain-specific knowledge (React for frontend, ML concepts for ML engineer, etc.)
  - System design or architecture appropriate for the difficulty level

**PHASE 5 — Coding Challenge (2 Qs, category: "coding")**
Q13-Q14: Coding problems the candidate must solve by writing actual code.
  - Use ${primaryLang} as the language (this is their strongest language from the resume)
  - Q13 should be easier (warm-up), Q14 should be harder
  - Frame as: "Can you write a function in ${primaryLang} that..."
  - Include clear input/output examples in the question
  - For ${difficulty} level, adjust complexity appropriately

**PHASE 6 — Behavioral (3 Qs, category: "behavioral")**
Q15-Q17: STAR-method behavioral questions tailored to their experience:
  - Teamwork/collaboration scenario
  - Handling failure or setback
  - Leadership or initiative

**PHASE 7 — Situational (2 Qs, category: "situational")**
Q18-Q19: "What would you do if..." scenarios relevant to ${targetRole}:
  - Technical crisis scenario
  - Stakeholder/team conflict scenario

**CLOSING (1 Q, category: "closing")**
Q20: "Do you have any questions about the role or the company?" — This is the final question.`;
    }

    const prompt = `You are an expert technical interviewer for the role of "${targetRole}"${targetCompany ? ` at ${targetCompany}` : ' at a top tech company'}.

${companyStyle}

=== FULL RESUME TEXT (reference SPECIFIC content — project names, company names, technologies, achievements) ===
"""
${resumeText || 'Not available'}
"""

=== STRUCTURED RESUME ANALYSIS ===
- Name: ${resumeAnalysis.name || 'Candidate'}
- Skills: ${JSON.stringify(resumeAnalysis.skills || {})}
- Programming Languages: ${JSON.stringify(resumeAnalysis.programmingLanguages || [])}
- Experience: ${JSON.stringify(resumeAnalysis.experience || [])}
- Internships: ${JSON.stringify(resumeAnalysis.internships || [])}
- Projects (detailed): ${JSON.stringify(resumeAnalysis.projects || [])}
- Education: ${JSON.stringify(resumeAnalysis.education || [])}
- Achievements: ${JSON.stringify(resumeAnalysis.achievements || [])}
- Strengths: ${JSON.stringify(resumeAnalysis.strengths || [])}
- Gaps/Concerns: ${JSON.stringify(resumeAnalysis.gaps || [])}
- Domain Expertise: ${JSON.stringify(resumeAnalysis.domainExpertise || [])}
- Career Gaps: ${JSON.stringify(resumeAnalysis.careerGaps || [])}
- Interesting Aspects: ${JSON.stringify(resumeAnalysis.interestingAspects || [])}
- Interview Focus Areas: ${JSON.stringify(resumeAnalysis.interviewFocusAreas || [])}
- Certifications: ${JSON.stringify(resumeAnalysis.certifications || [])}

Difficulty Level: ${difficulty}
Guide: ${difficultyGuide[difficulty] || difficultyGuide.mid}
Primary Programming Language: ${primaryLang}

${phaseInstructions}

CRITICAL RULES:
1. Resume/Project/Experience questions MUST reference REAL content from the resume — actual project names, company names, technologies. NO generic questions allowed.
2. For project questions, ALWAYS ask "why this tech?" and suggest a REAL alternative (e.g. "Why React and not Vue?" or "Why MongoDB and not PostgreSQL?")
3. Coding questions MUST be in ${primaryLang}, include clear problem statements with examples, and be solvable in 5-15 minutes
4. Coding question format MUST include: problem description, input format, output format, and at least 2 examples
5. Behavioral questions should reference their actual experience level — don't ask about "managing large teams" to a junior
6. Questions should flow naturally — like a real conversation, not an interrogation
7. Each question should be 1-4 sentences max — conversational tone
8. The array MUST follow the exact phase order specified above

Return a JSON array (no markdown, no code blocks, just pure JSON):
[
  {
    "question": "The actual interview question text",
    "category": "resume|project|experience|technical|coding|behavioral|situational|closing",
    "expectedTopics": ["topic1", "topic2"],
    "difficulty": "${difficulty}",
    "codingLanguage": "${primaryLang} (only for coding category, otherwise null)",
    "expectedApproach": "For coding: expected algorithm/approach. For others: null"
  }
]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let questions;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback questions
      const candidateName = resumeAnalysis?.name || 'you';
      const firstProject = resumeAnalysis?.projects?.[0]?.name || 'your most notable project';
      const firstSkill = resumeAnalysis?.skills?.technical?.[0] || 'your primary technology';
      questions = [
        { question: `To start things off, ${candidateName}, can you give me a brief walkthrough of your background and what led you to apply for the ${targetRole} role?`, category: 'resume', expectedTopics: ['background', 'motivation'], difficulty },
        { question: `I see you worked on ${firstProject}. Can you walk me through what you built and what your individual contribution was?`, category: 'project', expectedTopics: ['projects', 'technical depth'], difficulty },
        { question: `Why did you choose the specific technologies for ${firstProject}? Were there alternatives you considered?`, category: 'project', expectedTopics: ['tech choices', 'trade-offs'], difficulty },
        { question: `Tell me about your most recent work experience. What were your main responsibilities and key achievements?`, category: 'experience', expectedTopics: ['experience', 'achievements'], difficulty },
        { question: `You've listed ${firstSkill} as one of your skills. How have you used it in real projects?`, category: 'technical', expectedTopics: ['skills', 'hands-on experience'], difficulty },
        { question: `What are the key technical skills you think are essential for a ${targetRole}?`, category: 'technical', expectedTopics: ['role knowledge'], difficulty },
        { question: `Write a function in ${primaryLang} that takes a list of numbers and returns the two numbers that add up to a given target. Include the function signature and handle edge cases.`, category: 'coding', codingLanguage: primaryLang, expectedApproach: 'Two-pointer or hash map approach', expectedTopics: ['coding', 'problem solving'], difficulty },
        { question: 'Describe a time when you had to learn a new technology quickly. How did you approach it?', category: 'behavioral', expectedTopics: ['learning ability', 'adaptability'], difficulty },
        { question: 'How do you handle disagreements with team members about technical decisions?', category: 'situational', expectedTopics: ['collaboration', 'communication'], difficulty },
        { question: 'Do you have any questions about the role or the team?', category: 'closing', expectedTopics: ['engagement', 'curiosity'], difficulty },
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
