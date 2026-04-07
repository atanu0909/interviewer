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
- For project questions: Do they understand WHY they chose certain technologies? Can they explain trade-offs?
- RED FLAGS: Inability to explain their own project's architecture, contradicting resume claims, or giving textbook answers about technologies they claim to have used`;
    } else if (category === 'technical') {
      categoryGuidance = `
This is a TECHNICAL knowledge question for a "${targetRole}" role. Evaluate STRICTLY:
- Correctness of technical concepts — even minor inaccuracies matter
- Depth of understanding (not just surface-level definitions — do they know the WHY behind concepts?)
- Ability to explain clearly with REAL examples from their experience, not just textbook definitions
- Awareness of trade-offs and alternatives — a strong candidate knows when NOT to use something
- For ${difficulty} level: ${difficulty === 'junior' ? 'Accept fundamental understanding with minor gaps' : difficulty === 'mid' ? 'Expect solid understanding with practical examples' : 'Expect deep expertise with nuanced trade-offs and production experience'}
- PENALIZE: Reciting definitions without understanding, missing critical caveats, or not acknowledging limitations
- REWARD: Connecting concepts to real-world experience, mentioning edge cases, discussing when alternatives are better`;
    } else if (category === 'behavioral') {
      categoryGuidance = `
This is a BEHAVIORAL question. Evaluate using STAR method STRICTLY:
- Did they describe a specific Situation? (not hypothetical — it must be a REAL event)
- Did they explain their Task/role clearly? (what was THEIR responsibility specifically?)
- Did they detail Actions THEY specifically took? (not what "we" or "the team" did)
- Did they share measurable Results? (numbers, outcomes, impact)
- PENALIZE: Generic/hypothetical answers ("I would..." instead of "I did..."), team answers without individual contribution, no specific examples
- REWARD: Concrete situations with clear personal contribution, measurable impact, lessons learned, self-awareness about things they would do differently
- For ${difficulty}: ${difficulty === 'junior' ? 'Accept college/personal project examples' : difficulty === 'mid' ? 'Expect professional work examples' : 'Expect leadership and high-impact examples'}`;
    } else if (category === 'situational') {
      categoryGuidance = `
This is a SITUATIONAL question for a "${targetRole}". Evaluate:
- Is their proposed approach practical, structured, and professional?
- Do they consider multiple stakeholders (users, team, management)?
- Do they prioritize correctly (e.g., users first, communication, then root cause)?
- Do they show good judgment and decision-making appropriate for ${difficulty} level?
- Do they mention communication/escalation when appropriate?
- PENALIZE: Jumping to solutions without understanding the situation, ignoring stakeholders, no mention of prevention
- REWARD: Structured thinking (triage → investigate → fix → communicate → prevent), considering trade-offs, mentioning postmortem/prevention`;
    } else if (category === 'follow-up') {
      categoryGuidance = `
This is a FOLLOW-UP question based on their previous answer. Evaluate:
- Did they go deeper than their original answer?
- Did they add new information or just repeat themselves?
- Does their deeper explanation remain consistent with their resume?
- REWARD: Additional details, new perspectives, honest admission of limitations
- PENALIZE: Contradicting their previous answer, repeating the same thing, becoming vague when probed deeper`;
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

Scoring guide (be STRICT — most candidates should score 5-7, not 8-10):
- 9-10: Exceptional — specific, insightful, shows deep understanding, would impress at ${targetCompany || 'a top company'}. Reserve this for truly outstanding answers.
- 7-8: Strong — good depth, specific examples, clear communication. This is a GOOD answer.
- 5-6: Adequate — answers the question but lacks depth, specificity, or has minor inaccuracies. MOST average answers should be here.
- 3-4: Weak — vague, generic, or partially relevant. Surface-level knowledge only.
- 1-2: Poor — didn't answer the question, or gave misleading/incorrect information

Return a JSON object (no markdown, no code blocks, just pure JSON):
{
  "score": 7,
  "feedback": "Brief constructive feedback (2-3 sentences max). Be specific — tell them EXACTLY what was good and what was missing.",
  "strengths": "What was good about the answer — be specific",
  "improvement": "What could be improved — be specific and actionable, not generic advice",
  "authenticity": "Does this answer align with their resume? Any red flags? Be honest.",
  "followUp": "A natural follow-up question if the answer was interesting, incomplete, or needs verification. This should dig DEEPER into what they said — not change topic. Set to null only if the answer was perfect or the interview should move on."
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
