import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { answers, resumeAnalysis, targetRole, difficulty, totalTime, targetCompany } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const answeredQuestions = answers.filter(a => a.answer !== '(Skipped)' && a.answer !== '(No response)');
    const avgScore = answers.length > 0
      ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length
      : 0;

    // Separate scores by category
    const categoryDetails = {};
    answers.forEach(a => {
      if (!categoryDetails[a.category]) categoryDetails[a.category] = [];
      categoryDetails[a.category].push(a.score || 0);
    });

    const categoryAvgs = {};
    Object.entries(categoryDetails).forEach(([cat, scores]) => {
      categoryAvgs[cat] = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    });

    const codingAnswers = answers.filter(a => a.category === 'coding');
    const projectAnswers = answers.filter(a => a.category === 'project');

    const prompt = `You are an expert interview coach providing detailed feedback after a mock interview.

Role: ${targetRole}
Company: ${targetCompany || 'General'}
Difficulty: ${difficulty}
Total questions: ${answers.length}
Questions answered: ${answeredQuestions.length}
Questions skipped: ${answers.length - answeredQuestions.length}
Average score: ${avgScore.toFixed(1)}/10
Total time: ${Math.floor(totalTime / 60)} minutes ${totalTime % 60} seconds
Category averages: ${JSON.stringify(categoryAvgs)}

Candidate's resume:
- Name: ${resumeAnalysis?.name || 'Candidate'}
- Skills: ${JSON.stringify(resumeAnalysis?.skills || {})}
- Programming Languages: ${JSON.stringify(resumeAnalysis?.programmingLanguages || [])}
- Experience: ${JSON.stringify((resumeAnalysis?.experience || []).map(e => e.title + ' at ' + e.company))}
- Projects: ${JSON.stringify((resumeAnalysis?.projects || []).map(p => p.name))}

=== COMPLETE INTERVIEW TRANSCRIPT ===
${answers.map((a, i) => `
Q${i + 1} [${a.category}] (Score: ${a.score}/10): ${a.question}
Answer: ${a.answer}
${a.codeSubmission ? `Code: ${a.codeSubmission}` : ''}
Feedback: ${a.feedback || 'N/A'}
`).join('\n')}

Generate a comprehensive interview report. Be honest, specific, and actionable. This should read like a professional interview debrief.

Return a JSON object (no markdown, no code blocks, just pure JSON):
{
  "overallScore": 72,
  "grade": "B+",
  "summary": "A comprehensive 4-5 sentence summary of the interview performance. Mention specific moments — both strong answers and weak ones.",
  "strengths": [
    "Specific strength 1 — reference actual answers given",
    "Specific strength 2",
    "Specific strength 3"
  ],
  "weaknesses": [
    "Specific weakness 1 — reference where they struggled",
    "Specific weakness 2"
  ],
  "categoryScores": {
    "resumeKnowledge": 7.5,
    "projectDiscussion": 8.0,
    "technicalDepth": 6.5,
    "codingAbility": 7.0,
    "behavioral": 7.5,
    "communication": 7.0,
    "confidence": 6.5,
    "problemSolving": 7.0,
    "domainKnowledge": 7.5,
    "authenticity": 8.0
  },
  "codingFeedback": {
    "overallCodingScore": 7,
    "strengths": ["What they did well in coding"],
    "improvements": ["What to improve in coding"],
    "languageProficiency": "Assessment of their ${resumeAnalysis?.programmingLanguages?.[0]?.name || 'primary language'} proficiency"
  },
  "resumeAuthenticity": "Assessment of how well their answers matched their resume claims. Did they seem genuine about their experience?",
  "companyReadiness": "How ready are they for an interview at ${targetCompany || 'a top company'}? What specifically should they work on?",
  "tips": [
    "Specific actionable tip 1 — tied to their actual performance",
    "Specific actionable tip 2",
    "Specific actionable tip 3",
    "Specific actionable tip 4",
    "Specific actionable tip 5",
    "Specific actionable tip 6"
  ],
  "readinessLevel": "A descriptive statement like 'Strong contender for mid-level roles' or 'Needs significant preparation in system design'",
  "recommendedTopics": ["Topic to study 1", "Topic to study 2", "Topic to study 3", "Topic to study 4", "Topic to study 5"],
  "mockScore": {
    "wouldHire": "yes|maybe|no",
    "confidence": "high|medium|low",
    "reasoning": "1-2 sentence reasoning for the hiring decision"
  }
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let report;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      report = JSON.parse(jsonMatch[0]);
    } catch {
      report = {
        overallScore: Math.round(avgScore * 10),
        grade: avgScore >= 8 ? 'A' : avgScore >= 6 ? 'B' : avgScore >= 4 ? 'C' : 'D',
        summary: `You completed the ${targetRole} interview with an average score of ${avgScore.toFixed(1)}/10.`,
        strengths: ['Completed the interview'],
        weaknesses: ['Detailed analysis unavailable'],
        categoryScores: {},
        codingFeedback: null,
        resumeAuthenticity: '',
        companyReadiness: '',
        tips: ['Practice more mock interviews', 'Review technical fundamentals'],
        readinessLevel: 'Needs more preparation',
        recommendedTopics: [],
        mockScore: { wouldHire: 'maybe', confidence: 'low', reasoning: 'Report generation had issues' },
      };
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({
      overallScore: 50,
      grade: 'C',
      summary: 'Interview completed. Detailed report generation failed.',
      strengths: [],
      weaknesses: [],
      categoryScores: {},
      tips: ['Try again for a detailed report'],
      readinessLevel: 'Unknown',
      recommendedTopics: [],
      mockScore: null,
    });
  }
}
