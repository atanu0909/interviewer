import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');

    if (!file) {
      return NextResponse.json({ error: 'No resume file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // pdf-parse v2 uses a class-based API
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    let resumeText;
    try {
      const textResult = await parser.getText();
      resumeText = textResult.text;
    } finally {
      await parser.destroy();
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text from the resume. Please upload a text-based PDF.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert HR professional and resume analyst. Perform an EXHAUSTIVE deep analysis of the following resume. Extract every single detail — leave nothing unexamined.

Resume Text:
"""
${resumeText}
"""

Return a JSON object with EXACTLY this structure (no markdown, no code blocks, just pure JSON):
{
  "name": "Candidate's full name",
  "email": "Email if found, or empty string",
  "phone": "Phone if found, or empty string",
  "summary": "A comprehensive 3-4 sentence professional summary of the candidate based on everything in the resume",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Duration/dates",
      "type": "full-time|part-time|contract",
      "highlights": ["Key achievement 1", "Key achievement 2"],
      "technologies": ["tech used in this role"],
      "responsibilities": ["Main responsibility 1", "Main responsibility 2"]
    }
  ],
  "internships": [
    {
      "title": "Intern Title / Role",
      "company": "Company Name",
      "duration": "Duration/dates",
      "description": "What they did during the internship",
      "technologies": ["tech1", "tech2"],
      "keyLearnings": ["What they learned or achieved"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"]
  },
  "programmingLanguages": [
    {
      "name": "Python",
      "context": "Used in 3 projects and ML internship, appears to be primary language",
      "proficiency": "primary|secondary|familiar"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University",
      "year": "Year or duration",
      "gpa": "GPA if mentioned",
      "relevantCoursework": ["Course 1", "Course 2"]
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Detailed description of what the project does",
      "technologies": ["tech1", "tech2"],
      "alternativeTechnologies": ["What else could have been used instead and why these were chosen"],
      "challenges": ["Potential challenges they might have faced"],
      "impact": "Scale, users, or measurable impact if mentioned",
      "teamOrSolo": "team|solo|unknown",
      "keyFeatures": ["Feature 1", "Feature 2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "achievements": ["Hackathon wins", "Awards", "Competitions", "Rankings"],
  "openSource": ["Any open source contributions mentioned"],
  "publications": ["Any research papers or blog posts"],
  "strengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],
  "gaps": ["Potential gap or concern 1 — be specific", "Potential gap 2"],
  "domainExpertise": ["web development", "machine learning", "fintech", etc.],
  "careerGaps": ["Any unexplained gaps in timeline"],
  "interestingAspects": ["Unusual combinations", "Career transitions", "Unique achievements", "Things worth asking about"],
  "interviewFocusAreas": ["Areas where deep questioning would reveal true competency", "Skills claimed but not demonstrated in projects"]
}

CRITICAL RULES:
- Extract EVERY project, even small ones. For each project, think about what alternative technologies exist and what challenges they likely faced
- Separate internships from full-time experience — they require different interview approaches
- For programming languages, analyze the ENTIRE resume to determine which ones they actually use vs. just list. Note context like "used Java in 3 projects" vs "listed Java but no projects show it"
- In interestingAspects, note things that a good interviewer would want to dig into — inconsistencies, impressive claims, unique combinations
- In interviewFocusAreas, identify WHERE deep questioning would distinguish a genuine candidate from someone who inflated their resume
- Be thorough with gaps — if someone claims "5 years of React" but only shows 1 project, note that
- If the resume has open source work, hackathons, competitions — these are GOLD for interview questions`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = {
        name: 'Candidate',
        summary: resumeText.substring(0, 200),
        skills: { technical: [], soft: [], tools: [] },
        programmingLanguages: [],
        experience: [],
        internships: [],
        education: [],
        projects: [],
        certifications: [],
        achievements: [],
        openSource: [],
        publications: [],
        strengths: [],
        gaps: [],
        domainExpertise: [],
        careerGaps: [],
        interestingAspects: [],
        interviewFocusAreas: [],
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      resumeText: resumeText.substring(0, 12000), // Increased from 8000 for deeper context
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume: ' + error.message },
      { status: 500 }
    );
  }
}
