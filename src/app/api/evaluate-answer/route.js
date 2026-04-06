import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { question, answer, category, resumeContext, resumeText, targetRole, difficulty, targetCompany } = await request.json();

    if (!answer || answer.trim().length < 3) {
      return NextResponse.json({
        score: 1,
        feedback: 'No meaningful response was provided.',
        followUp: null,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Category-specific evaluation criteria
    let categoryGuidance = '';
    if (category === 'resume' || category === 'project' || category === 'experience') {
      categoryGuidance = `
IMPORTANT — This is a RESUME-BASED question. Evaluate specifically:
- Does the answer match what's actually on their resume? Cross-reference with the resume text below.
- Are they giving specific details (project names, metrics, tech stack) or being vague?
- Do they show genuine understanding of what they claim to have worked on?
- If they mention challenges, do they sound authentic or rehearsed?
- PENALIZE vague/generic answers that don't reference specific work they did
- REWARD concrete details, metrics, and genuine reflection on their experience
- For project questions: Do they understand WHY they chose certain technologies? Can they explain trade-offs?`;
    } else if (category === 'technical') {
      categoryGuidance = `
This is a TECHNICAL knowledge question. Evaluate:
- Correctness of technical concepts
- Depth of understanding (not just surface-level definitions)
- Ability to explain clearly with examples
- Awareness of trade-offs and alternatives`;
    } else if (category === 'behavioral') {
      categoryGuidance = `
This is a BEHAVIORAL question. Evaluate using STAR method:
- Did they describe a specific Situation? (not hypothetical)
- Did they explain their Task/role clearly?
- Did they detail Actions THEY specifically took?
- Did they share measurable Results?
- PENALIZE generic/hypothetical answers without specific examples`;
    } else if (category === 'situational') {
      categoryGuidance = `
This is a SITUATIONAL question. Evaluate:
- Is their proposed approach practical and professional?
- Do they consider multiple stakeholders?
- Do they show good judgment and decision-making?
- Is the answer appropriate for a ${difficulty}-level candidate?`;
    }

    const prompt = `You are an expert interviewer evaluating a candidate's response for a "${targetRole}" position at ${targetCompany || 'a top tech company'} (${difficulty} level).

Question asked: "${question}"
Category: ${category}
Candidate's answer: "${answer}"

${resumeText ? `=== CANDIDATE'S FULL RESUME (use this to verify claims and cross-reference) ===
"""
${resumeText}
"""
` : ''}
${resumeContext ? `Resume summary: Skills: ${JSON.stringify(resumeContext.skills || {})}; Projects: ${JSON.stringify((resumeContext.projects || []).map(p => p.name))}; Experience: ${JSON.stringify((resumeContext.experience || []).map(e => e.title + ' at ' + e.company))}` : ''}

${categoryGuidance}

Evaluate the answer on a scale of 1-10 considering:
- Relevance and directness (Did they actually answer the question?)
- Depth and completeness (Surface-level vs. deep understanding)
- Specificity (Concrete examples vs. vague generalities)
- Communication clarity (Well-structured vs. rambling)
- Technical accuracy (for technical questions)
- Authenticity (Does the answer feel genuine? Does it match their resume?)

Scoring guide:
- 9-10: Exceptional — specific, insightful, shows deep understanding, would impress at ${targetCompany || 'a top company'}
- 7-8: Strong — good depth, specific examples, clear communication
- 5-6: Adequate — answers the question but lacks depth or specificity
- 3-4: Weak — vague, generic, or partially relevant
- 1-2: Poor — didn't answer the question, or gave misleading/incorrect information

Return a JSON object (no markdown, no code blocks, just pure JSON):
{
  "score": 7,
  "feedback": "Brief constructive feedback (2-3 sentences max)",
  "strengths": "What was good about the answer",
  "improvement": "What could be improved — be specific and actionable",
  "authenticity": "Does this answer align with their resume? Any red flags?",
  "followUp": "A natural follow-up question if the answer was interesting or needs clarification, or null if not needed"
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
        authenticity: '',
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
