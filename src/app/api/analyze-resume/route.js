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

    const prompt = `You are an expert HR professional and resume analyst. Analyze the following resume text and extract structured information.

Resume Text:
"""
${resumeText}
"""

Return a JSON object with EXACTLY this structure (no markdown, no code blocks, just pure JSON):
{
  "name": "Candidate's full name",
  "email": "Email if found, or empty string",
  "phone": "Phone if found, or empty string",
  "summary": "A 2-3 sentence professional summary of the candidate",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Duration/dates",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"]
  },
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University",
      "year": "Year or duration"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["Potential gap or concern 1", "Potential gap 2"]
}`;

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
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        strengths: [],
        gaps: [],
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      resumeText: resumeText.substring(0, 8000),
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume: ' + error.message },
      { status: 500 }
    );
  }
}
