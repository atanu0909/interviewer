import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { answers, resumeAnalysis, targetRole, difficulty, totalTime } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const answeredQuestions = answers.filter(a => a.answer !== '(Skipped)' && a.answer !== '(No response)');
    const avgScore = answers.length > 0
      ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length
      : 0;

    const prompt = `You are an expert interview coach providing detailed feedback after a mock interview.

Role: ${targetRole}
Difficulty: ${difficulty}
Total questions: ${answers.length}
Questions answered: ${answeredQuestions.length}
Average score: ${avgScore.toFixed(1)}/10
Total time: ${Math.floor(totalTime / 60)} minutes

Candidate's resume highlights:
- Skills: ${JSON.stringify(resumeAnalysis?.skills || {})}
- Experience: ${JSON.stringify((resumeAnalysis?.experience || []).map(e => e.title + ' at ' + e.company))}

Interview Q&A:
${answers.map((a, i) => `
Q${i + 1} [${a.category}]: ${a.question}
Answer: ${a.answer}
Score: ${a.score}/10
`).join('\n')}

Generate a comprehensive interview report. Return a JSON object (no markdown, no code blocks):
{
  "overallScore": 72,
  "grade": "B",
  "summary": "A comprehensive 3-4 sentence summary of the interview performance",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "categoryScores": {
    "technical": 7.5,
    "behavioral": 8.0,
    "resume": 6.5,
    "situational": 7.0,
    "communication": 7.5,
    "confidence": 6.0,
    "problemSolving": 7.0,
    "domainKnowledge": 7.5
  },
  "tips": [
    "Specific actionable tip 1",
    "Specific actionable tip 2",
    "Specific actionable tip 3",
    "Specific actionable tip 4",
    "Specific actionable tip 5"
  ],
  "readinessLevel": "A statement about their readiness for the role",
  "recommendedTopics": ["Topic to study 1", "Topic to study 2", "Topic to study 3"]
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
        tips: ['Practice more mock interviews', 'Review technical fundamentals'],
        readinessLevel: 'Needs more preparation',
        recommendedTopics: [],
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
    });
  }
}
