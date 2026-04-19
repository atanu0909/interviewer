import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { question, partialTranscript, silenceDuration } = await request.json();

    // Quick check — if user said almost nothing or no transcript (audio mode)
    if (!partialTranscript || partialTranscript.trim().length < 5) {
      if (silenceDuration >= 12) {
        return NextResponse.json({
          action: 'skip',
          message: "No worries! Let's move on to the next question.",
        });
      }
      if (silenceDuration >= 10) {
        return NextResponse.json({
          action: 'encourage',
          message: "Take your time. You can also click 'Skip' to move to the next question.",
        });
      }
      return NextResponse.json({
        action: 'encourage',
        message: "Take your time. It's okay to think about it. Start speaking when you're ready.",
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a supportive interviewer. The candidate paused while answering.

Question: "${question}"
What they said so far: "${partialTranscript}"
Silence duration: ${silenceDuration} seconds

Determine if the candidate:
1. Seems STUCK (doesn't know the answer or is confused)
2. Is THINKING (gave partial answer, might continue)
3. Has essentially FINISHED (gave a reasonable answer)

Return a JSON object (no markdown, no code blocks):
{
  "action": "hint|encourage|wait|finished",
  "hint": "A subtle hint to help them (only if action is hint)",
  "message": "An encouraging or guiding message"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let detection;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      detection = JSON.parse(jsonMatch[0]);
    } catch {
      detection = {
        action: 'encourage',
        message: "Take your time. You're doing great!",
      };
    }

    return NextResponse.json(detection);
  } catch (error) {
    console.error('Stuck detection error:', error);
    return NextResponse.json({
      action: 'encourage',
      message: "Take your time. You can also say 'skip' to move to the next question.",
    });
  }
}
