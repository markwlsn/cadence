/**
 * /lib/ai/limits.ts — Pure input validation for POST /api/review/explain.
 *
 * Rejects oversized bodies (413) and wrongly typed fields (400), then trims
 * and caps each student-supplied field before it is placed into a prompt.
 */

export const MAX_BODY_CHARS = 20000;

export const FIELD_LIMITS = {
  question: 1000,
  chosenAnswer: 500,
  correctAnswer: 500,
  explanation: 2000,
  cardType: 50,
  option: 250,
  optionsCount: 8,
} as const;

export interface ValidatedExplainBody {
  question: string;
  chosenAnswer?: string;
  correctAnswer: string;
  explanation?: string;
  cardType?: string;
  options?: string[];
  stream?: boolean;
}

export type ExplainValidationResult =
  | { ok: true; data: ValidatedExplainBody }
  | { ok: false; status: 400 | 413; error: string };

const TOO_LARGE: ExplainValidationResult = {
  ok: false,
  status: 413,
  error: 'Card text is too long for the AI tutor.',
};

function bad(error: string): ExplainValidationResult {
  return { ok: false, status: 400, error };
}

/** Returns trimmed+capped string, undefined for missing/null, or null for wrong type. */
function optionalString(value: unknown, max: number): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, max);
}

/**
 * Validate a raw explain request body.
 * @param rawText The raw request body text.
 * @param contentLength The Content-Length header value, if any.
 */
export function validateExplainBody(
  rawText: string,
  contentLength: string | null
): ExplainValidationResult {
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > MAX_BODY_CHARS) return TOO_LARGE;
  }
  if (typeof rawText !== 'string') return bad('Invalid request body.');
  if (rawText.length > MAX_BODY_CHARS) return TOO_LARGE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return bad('Request body must be valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return bad('Request body must be a JSON object.');
  }
  const body = parsed as Record<string, unknown>;

  const question = optionalString(body.question, FIELD_LIMITS.question);
  const correctAnswer = optionalString(body.correctAnswer, FIELD_LIMITS.correctAnswer);
  const chosenAnswer = optionalString(body.chosenAnswer, FIELD_LIMITS.chosenAnswer);
  const explanation = optionalString(body.explanation, FIELD_LIMITS.explanation);
  const cardType = optionalString(body.cardType, FIELD_LIMITS.cardType);

  if (question === null || correctAnswer === null || chosenAnswer === null ||
      explanation === null || cardType === null) {
    return bad('Text fields must be strings.');
  }
  if (!question || !correctAnswer) {
    return bad('question and correctAnswer are required.');
  }

  let options: string[] | undefined;
  if (body.options !== undefined && body.options !== null) {
    if (!Array.isArray(body.options) || !body.options.every((o) => typeof o === 'string')) {
      return bad('options must be an array of strings.');
    }
    options = (body.options as string[])
      .slice(0, FIELD_LIMITS.optionsCount)
      .map((o) => o.trim().slice(0, FIELD_LIMITS.option));
  }

  let stream: boolean | undefined;
  if (body.stream !== undefined && body.stream !== null) {
    if (typeof body.stream !== 'boolean') return bad('stream must be a boolean.');
    stream = body.stream;
  }

  const data: ValidatedExplainBody = {
    question,
    ...(chosenAnswer !== undefined && { chosenAnswer }),
    correctAnswer,
    ...(explanation !== undefined && { explanation }),
    ...(cardType !== undefined && { cardType }),
    ...(options !== undefined && { options }),
    ...(stream !== undefined && { stream }),
  };
  return { ok: true, data };
}
