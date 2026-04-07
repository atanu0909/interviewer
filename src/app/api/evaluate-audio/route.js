import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const {
      audioBase64,
      mimeType,
      question,
      category,
      resumeContext,
      resumeText,
      targetRole,
      difficulty,
      targetCompany,
    } = await request.json();

    if (!audioBase64) {
      return NextResponse.json({
        score: 1,
        feedback: 'No audio was recorded.',
        transcript: '',
        followUp: null,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Category-specific evaluation guidance
    let categoryGuidance = '';
    if (category === 'resume' || category === 'project' || category === 'experience') {
      categoryGuidance = `
IMPORTANT — This is a RESUME-BASED question. Evaluate specifically:
- Does the answer match what's actually on their resume? Cross-reference with the resume text below.
- Are they giving specific details (project names, metrics, tech stack) or being vague?
- Do they show genuine understanding of what they claim to have worked on?
- PENALIZE vague/generic answers that don't reference specific work they did
- REWARD concrete details, metrics, and genuine reflection on their experience`;
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
- Did they describe a specific Situation?
- Did they explain their Task/role clearly?
- Did they detail Actions THEY specifically took?
- Did they share measurable Results?
- PENALIZE generic/hypothetical answers without specific examples`;
    } else if (category === 'situational') {
      categoryGuidance = `
This is a SITUATIONAL question. Evaluate:
- Is their proposed approach practical and professional?
- Do they consider multiple stakeholders?
- Do they show good judgment and decision-making?`;
    }

    const prompt = `You are an expert interviewer evaluating a candidate's SPOKEN response for a "${targetRole}" position at ${targetCompany || 'a top tech company'} (${difficulty} level).

Question asked: "${question}"
Category: ${category}

The candidate's response is provided as an audio recording. Listen carefully to their answer.

${resumeText ? `=== CANDIDATE'S FULL RESUME (use this to verify claims and cross-reference) ===
"""
${resumeText}
"""
` : ''}
${resumeContext ? `Resume summary: Skills: ${JSON.stringify(resumeContext.skills || {})}; Projects: ${JSON.stringify((resumeContext.projects || []).map(p => p.name))}; Experience: ${JSON.stringify((resumeContext.experience || []).map(e => e.title + ' at ' + e.company))}` : ''}

${categoryGuidance}

IMPORTANT: Since you are analyzing the AUDIO directly, also evaluate:
- **Speaking confidence**: Does the candidate sound confident or uncertain/hesitant?
- **Clarity**: Is their speech clear and well-articulated?
- **Fluency**: Do they speak smoothly or are there many filler words (um, uh, like, you know)?
- **Pace**: Are they speaking at an appropriate pace — not too fast (nervous) or too slow (unsure)?
- **Tone**: Does their tone convey enthusiasm and engagement?

Evaluate the answer on a scale of 1-10 considering:
- Relevance and directness (Did they actually answer the question?)
- Depth and completeness (Surface-level vs. deep understanding)
- Specificity (Concrete examples vs. vague generalities)
- Communication quality (Well-structured, clear speech)
- Technical accuracy (for technical questions)
- Authenticity (Does the answer feel genuine? Does it match their resume?)
- Speaking quality (confidence, clarity, fluency)

Scoring guide:
- 9-10: Exceptional — specific, insightful, confident delivery
- 7-8: Strong — good depth, clear communication, mostly confident
- 5-6: Adequate — answers the question but lacks depth or confidence
- 3-4: Weak — vague, hesitant, or partially relevant
- 1-2: Poor — no substantial answer, very unclear, or inaudible

Return a JSON object (no markdown, no code blocks, just pure JSON):
{
  "score": 7,
  "transcript": "Full transcription of what the candidate said — word for word",
  "feedback": "Brief constructive feedback (2-3 sentences max)",
  "strengths": "What was good about the answer and delivery",
  "improvement": "What could be improved — be specific and actionable",
  "authenticity": "Does this answer align with their resume? Any red flags?",
  "confidence": "high|medium|low — how confident did they sound?",
  "speakingPace": "fast|normal|slow",
  "clarity": "excellent|good|fair|poor",
  "fillerWords": "none|few|moderate|many",
  "speakingFeedback": "Brief feedback specifically about their speaking quality (1 sentence)",
  "followUp": "A natural follow-up question if the answer was interesting or needs clarification, or null if not needed"
}`;

    // Build multimodal content with inline audio
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();

    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = JSON.parse(jsonMatch[0]);
    } catch {
      evaluation = {
        score: 5,
        transcript: 'Unable to transcribe audio.',
        feedback: 'Audio was received but evaluation had an issue. Moving to next question.',
        strengths: '',
        improvement: '',
        authenticity: '',
        confidence: 'medium',
        speakingPace: 'normal',
        clarity: 'fair',
        fillerWords: 'few',
        speakingFeedback: '',
        followUp: null,
      };
    }

    // Ensure score is within bounds
    evaluation.score = Math.max(1, Math.min(10, evaluation.score || 5));

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Audio evaluation error:', error);
    return NextResponse.json({
      score: 5,
      transcript: '',
      feedback: 'Unable to evaluate audio right now. There may have been an issue with the recording.',
      confidence: 'medium',
      speakingPace: 'normal',
      clarity: 'fair',
      fillerWords: 'few',
      speakingFeedback: '',
      followUp: null,
    });
  }
}
