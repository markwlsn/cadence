import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithAI, isAIConfigured } from '@/lib/ai/client';

export interface ExplainRequest {
  question: string;
  chosenAnswer?: string;
  correctAnswer: string;
  explanation?: string;
  cardType?: string;
}

export interface ExplainResponse {
  misconception: string;
  correctPrinciple: string;
  keyTakeaway: string;
  source: 'ai' | 'heuristic';
}

const SYSTEM_PROMPT = `You are a world-class academic tutor and cognitive science specialist.
When a student answers a question incorrectly (or requests deeper rationale), your job is to explain the conceptual nuance without patronizing the student.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "misconception": "Clear explanation of why the chosen answer is incorrect, explaining the cognitive trap, common confusion, or scenario where it does not apply.",
  "correctPrinciple": "The precise conceptual, physical, or causal mechanism why the correct answer is the right choice.",
  "keyTakeaway": "One punchy, memorable, active-recall sentence to permanently lock in the distinction."
}

RULES:
- Do NOT repeat the question word for word.
- Write like a top-tier professor (concise, analytical, clear).
- Keep total length under 180 words.
- Return ONLY the raw JSON object. No markdown code blocks, no backticks, no preamble.`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as ExplainRequest;
    const { question, chosenAnswer, correctAnswer, explanation, cardType } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: 'question and correctAnswer are required.' },
        { status: 400 }
      );
    }

    if (isAIConfigured()) {
      try {
        const prompt = `Question: "${question}"
Student's Chosen Option: "${chosenAnswer || 'Unspecified / Skipped'}"
Correct Answer: "${correctAnswer}"
Reference Explanation: "${explanation || 'None provided'}"
Question Type: ${cardType || 'Conceptual question'}

Analyze the distinction and produce the JSON explanation.`;

        const responseText = await generateTextWithAI({
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
        });
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.misconception && parsed.correctPrinciple && parsed.keyTakeaway) {
          return NextResponse.json<ExplainResponse>({
            misconception: parsed.misconception,
            correctPrinciple: parsed.correctPrinciple,
            keyTakeaway: parsed.keyTakeaway,
            source: 'ai',
          });
        }
      } catch (aiErr) {
        console.warn('[Explain API] AI provider error, falling back to heuristic:', aiErr);
      }
    }

    // Heuristic Fallback (Offline / Dev / No API key)
    const hasChosen = chosenAnswer && chosenAnswer.trim() && chosenAnswer !== correctAnswer;
    const fallbackResponse: ExplainResponse = {
      misconception: hasChosen
        ? `"${chosenAnswer}" is a plausible distractor that often trips up students. It represents a related concept or alternative phase, but it fails to satisfy the specific conditions or causal mechanism demanded by the question.`
        : 'Common traps in this question arise from confusing superficial similarities in terminology with the underlying operational mechanism.',
      correctPrinciple:
        explanation && explanation.trim()
          ? explanation
          : `"${correctAnswer}" is the precise correct principle because it directly drives the fundamental mechanism described in the prompt.`,
      keyTakeaway: hasChosen
        ? `Distinguish between "${chosenAnswer}" and "${correctAnswer}" by isolating the exact cause-and-effect relationship.`
        : `Anchor "${correctAnswer}" to its primary definition to avoid near-neighbor distractor traps.`,
      source: 'heuristic',
    };

    return NextResponse.json<ExplainResponse>(fallbackResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
