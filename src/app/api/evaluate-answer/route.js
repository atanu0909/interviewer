import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { question, answer, category, resumeContext, resumeText, targetRole, difficulty } = await request.json();

    if (!answer || answer.trim().length < 3) {
      return NextResponse.json({
        score: 1,
        feedback: 'No meaningful response was provided.',
        followUp: null,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert interviewer evaluating a candidate's response for a "${targetRole}" position (${difficulty} level).

Question asked: "${question}"
Category: ${category}
Candidate's answer: "${answer}"

${resumeText ? `=== CANDIDATE'S FULL RESUME ===
"""
${resumeText}
"""
` : ''}
${resumeContext ? `Resume skills summary: ${JSON.stringify(resumeContext.skills || {})}` : ''}

Evaluate the answer on a scale of 1-10 considering:
- Relevance to the question
- Depth and completeness
- Communication clarity
- Technical accuracy (for technical questions)
- Use of specific examples (for behavioral questions)

Return a JSON object with EXACTLY this structure (no markdown, no code blocks, just pure JSON):
{
  "score": 7,
  "feedback": "Brief constructive feedback (2-3 sentences max)",
  "strengths": "What was good about the answer",
  "improvement": "What could be improved",
  "followUp": "A follow-up question if the answer was interesting or needs clarification, or null if not needed"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = JSON.parse(jsonMatch[0]);
    } catch {
      evaluation = {
        score: 5,
        feedback: 'Answer recorded. Moving to next question.',
        strengths: '',
        improvement: '',
        followUp: null,
      };
    }

    // Ensure score is within bounds
    evaluation.score = Math.max(1, Math.min(10, evaluation.score || 5));

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Answer evaluation error:', error);
    return NextResponse.json({
      score: 5,
      feedback: 'Unable to evaluate answer right now.',
      followUp: null,
    });
  }
}
