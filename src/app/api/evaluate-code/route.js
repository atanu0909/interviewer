import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { code, language, problemStatement, expectedApproach, difficulty, targetRole } = await request.json();

    if (!code || code.trim().length < 5) {
      return NextResponse.json({
        score: 1,
        feedback: 'No meaningful code was provided.',
        correctness: false,
        timeComplexity: 'N/A',
        spaceComplexity: 'N/A',
        suggestions: ['Try writing a solution even if incomplete — partial credit is given.'],
        codeReview: '',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a senior software engineer conducting a technical interview for a "${targetRole}" position (${difficulty} level).

The candidate was asked to write code for this problem:
"""
${problemStatement}
"""

Expected language: ${language}
${expectedApproach ? `Expected approach/concepts: ${expectedApproach}` : ''}

Candidate's code submission:
\`\`\`${language}
${code}
\`\`\`

Evaluate the code thoroughly. Consider:
1. **Correctness**: Does it solve the problem? Handle edge cases?
2. **Efficiency**: Time and space complexity. Is it optimal for the difficulty level?
3. **Code Quality**: Clean code, meaningful variable names, readability
4. **Language Proficiency**: Proper use of ${language} idioms and features
5. **Edge Cases**: Does it handle null/empty inputs, boundary conditions?
6. **Approach**: Did they use the right data structures and algorithms?

For ${difficulty} level, adjust expectations:
- Junior: Basic correctness is enough, don't penalize for non-optimal solutions
- Mid: Expect reasonable efficiency and clean code
- Senior: Expect optimal solutions, clean architecture, and edge case handling

Return a JSON object (no markdown, no code blocks, just pure JSON):
{
  "score": 7,
  "feedback": "Concise overall feedback (2-3 sentences)",
  "correctness": true,
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "codeReview": "Detailed line-by-line review highlighting good practices and issues",
  "suggestions": ["Specific improvement 1", "Specific improvement 2"],
  "edgeCasesMissed": ["Edge case 1 not handled", "Edge case 2"],
  "betterApproach": "Brief description of a better approach if their solution isn't optimal, or null if it's good"
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
        feedback: 'Code submitted. Moving to next question.',
        correctness: false,
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        codeReview: '',
        suggestions: [],
        edgeCasesMissed: [],
        betterApproach: null,
      };
    }

    evaluation.score = Math.max(1, Math.min(10, evaluation.score || 5));

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Code evaluation error:', error);
    return NextResponse.json({
      score: 5,
      feedback: 'Unable to evaluate code right now.',
      correctness: false,
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      suggestions: [],
    });
  }
}
