import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithAI, streamTextWithAI, isAIConfigured } from '@/lib/ai/client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatSSEEvent } from '@/lib/ai/sse';
import type { DistractorBreakdown, ExplainRequest, ExplainResponse } from '@/types';

export type { DistractorBreakdown, ExplainRequest, ExplainResponse };

const SYSTEM_PROMPT = `You are a world-class academic tutor and cognitive science specialist.
When a student answers a question (or requests deeper rationale), your job is to explain the conceptual nuance:
1. Why the correct answer is the right choice.
2. Specifically WHY each other option (distractor) is wrong (e.g. cognitive trap, inverted causality, unrelated phase, or superficial similarity).

You MUST respond strictly with a valid JSON object matching this schema:
{
  "misconception": "Clear summary of the central cognitive trap or misunderstanding tested by this question.",
  "correctPrinciple": "The precise conceptual, physical, or causal mechanism why the correct answer is right.",
  "keyTakeaway": "One punchy, memorable, active-recall sentence to permanently lock in the distinction.",
  "distractors": [
    {
      "option": "Exact option text",
      "isCorrect": false,
      "explanation": "1-2 concise sentences explaining specifically why this option is wrong or misleading."
    }
  ]
}

RULES:
- Provide an entry in "distractors" for every option provided in the options list.
- For the correct option, set isCorrect: true and explain why it fits.
- For all other options, set isCorrect: false and explain the specific trap.
- Do NOT repeat the question word for word.
- Write like a top-tier professor (concise, analytical, clear).
- Keep total length under 280 words.
- Return ONLY the raw JSON object. No markdown code blocks, no backticks, no preamble.`;

const STREAMING_SYSTEM_PROMPT = `You are a world-class academic tutor and cognitive science specialist.
When a student answers a question (or requests deeper rationale), guide them with a 3-part Socratic rationale.

Structure your response using these EXACT three markdown headings:

### 1. Why The Correct Answer Is Right
Explain the precise conceptual mechanism and causal principle that makes the correct answer right.

### 2. Cognitive Trap & Distractor Analysis
Analyze the central cognitive trap or misunderstanding tested by this question, and explain specifically why each wrong option (distractor) is misleading.

### 3. Anchor Takeaway
One punchy, memorable, active-recall sentence to permanently lock in the distinction.

RULES:
- Always include all three headings in order.
- Write like a top-tier professor (concise, analytical, clear).
- Keep total length under 280 words.
- Do not preamble or add concluding remarks.`;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`explain:${ip}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many explanation requests. Please wait ${rateCheck.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }
    const body = (await req.json()) as ExplainRequest;
    const { question, chosenAnswer, correctAnswer, explanation, cardType, options, stream } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: 'question and correctAnswer are required.' },
        { status: 400 }
      );
    }

    const optionsList = Array.isArray(options) && options.length > 0 ? options : [];
    const optionsContext = optionsList.length > 0
      ? `\nAvailable Multiple-Choice Options:\n${optionsList.map((opt, i) => `  ${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}`
      : '';

    const prompt = `Question: "${question}"
Student's Chosen Option: "${chosenAnswer || 'Unspecified / Skipped'}"
Correct Answer: "${correctAnswer}"
Reference Explanation: "${explanation || 'None provided'}"
Question Type: ${cardType || 'Conceptual question'}${optionsContext}

Analyze the distinction, breakdown why each distractor is wrong, and produce the Socratic rationale.`;

    // -------------------------------------------------------------------------
    // Streaming Socratic Path (Server-Sent Events)
    // -------------------------------------------------------------------------
    if (stream) {
      const encoder = new TextEncoder();

      if (isAIConfigured()) {
        try {
          const aiStream = await streamTextWithAI({
            systemPrompt: STREAMING_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
            signal: req.signal,
          });

          const readable = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = aiStream.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value) {
                    controller.enqueue(
                      encoder.encode(formatSSEEvent({ type: 'delta', text: value }))
                    );
                  }
                }
                controller.enqueue(encoder.encode(formatSSEEvent({ type: 'done' })));
                controller.close();
              } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : 'Streaming error';
                controller.enqueue(
                  encoder.encode(formatSSEEvent({ type: 'error', message: errMsg }))
                );
                controller.close();
              } finally {
                reader.releaseLock();
              }
            },
            cancel() {
              aiStream.cancel().catch(() => {});
            },
          });

          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
            },
          });
        } catch (streamErr) {
          console.warn('[Explain API] AI streaming error, falling back to heuristic stream:', streamErr);
        }
      }

      // Heuristic streaming fallback (Offline / Dev / Provider error)
      const heuristicText = `### 1. Why The Correct Answer Is Right\n${
        explanation && explanation.trim()
          ? explanation
          : `"${correctAnswer}" is the precise correct principle because it directly drives the fundamental mechanism described in the prompt.`
      }\n\n### 2. Cognitive Trap & Distractor Analysis\n${
        chosenAnswer && chosenAnswer.trim() && chosenAnswer !== correctAnswer
          ? `"${chosenAnswer}" is a plausible distractor that often trips up students. It represents a related concept or alternative phase, but fails to satisfy the precise causal conditions required.`
          : 'Common traps in this question arise from confusing superficial similarities in terminology with the underlying operational mechanism.'
      }\n\n### 3. Anchor Takeaway\n${
        chosenAnswer && chosenAnswer.trim() && chosenAnswer !== correctAnswer
          ? `Distinguish between "${chosenAnswer}" and "${correctAnswer}" by isolating the exact cause-and-effect relationship.`
          : `Anchor "${correctAnswer}" to its primary definition to avoid near-neighbor distractor traps.`
      }`;

      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const words = heuristicText.split(' ');
          for (let i = 0; i < words.length; i++) {
            if (req.signal.aborted) break;
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(formatSSEEvent({ type: 'delta', text: chunk })));
            await new Promise((r) => setTimeout(r, 15));
          }
          if (!req.signal.aborted) {
            controller.enqueue(encoder.encode(formatSSEEvent({ type: 'done' })));
          }
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // -------------------------------------------------------------------------
    // Non-Streaming Path (Existing Behavior Preserved)
    // -------------------------------------------------------------------------
    if (isAIConfigured()) {
      try {
        const optionsContext = optionsList.length > 0
          ? `\nAvailable Multiple-Choice Options:\n${optionsList.map((opt, i) => `  ${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}`
          : '';

        const prompt = `Question: "${question}"
Student's Chosen Option: "${chosenAnswer || 'Unspecified / Skipped'}"
Correct Answer: "${correctAnswer}"
Reference Explanation: "${explanation || 'None provided'}"
Question Type: ${cardType || 'Conceptual question'}${optionsContext}

Analyze the distinction, breakdown why each distractor is wrong, and produce the JSON explanation.`;

        const responseText = await generateTextWithAI({
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
        });
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.misconception && parsed.correctPrinciple && parsed.keyTakeaway) {
          const parsedDistractors: DistractorBreakdown[] = Array.isArray(parsed.distractors)
            ? parsed.distractors
            : [];

          return NextResponse.json<ExplainResponse>({
            misconception: parsed.misconception,
            correctPrinciple: parsed.correctPrinciple,
            keyTakeaway: parsed.keyTakeaway,
            distractors: parsedDistractors,
            source: 'ai',
          });
        }
      } catch (aiErr) {
        console.warn('[Explain API] AI provider error, falling back to heuristic:', aiErr);
      }
    }

    // Heuristic Fallback (Offline / Dev / No API key)
    const hasChosen = chosenAnswer && chosenAnswer.trim() && chosenAnswer !== correctAnswer;
    const heuristicDistractors: DistractorBreakdown[] = optionsList.map((opt) => {
      const isCorrect = opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      if (isCorrect) {
        return {
          option: opt,
          isCorrect: true,
          explanation: explanation && explanation.trim()
            ? explanation
            : `"${opt}" is the correct principle because it directly satisfies the fundamental mechanism required by the question.`,
        };
      }
      return {
        option: opt,
        isCorrect: false,
        explanation: `"${opt}" is an incorrect distractor. It either confuses superficial terminology, inverts the causal relationship, or introduces conditions not applicable here.`,
      };
    });

    const fallbackResponse: ExplainResponse = {
      misconception: hasChosen
        ? `"${chosenAnswer}" is a plausible distractor that often trips up students. It represents a related concept or alternative phase, but fails to satisfy the precise causal conditions required.`
        : 'Common traps in this question arise from confusing superficial similarities in terminology with the underlying operational mechanism.',
      correctPrinciple:
        explanation && explanation.trim()
          ? explanation
          : `"${correctAnswer}" is the precise correct principle because it directly drives the fundamental mechanism described in the prompt.`,
      keyTakeaway: hasChosen
        ? `Distinguish between "${chosenAnswer}" and "${correctAnswer}" by isolating the exact cause-and-effect relationship.`
        : `Anchor "${correctAnswer}" to its primary definition to avoid near-neighbor distractor traps.`,
      distractors: heuristicDistractors,
      source: 'heuristic',
    };

    return NextResponse.json<ExplainResponse>(fallbackResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
