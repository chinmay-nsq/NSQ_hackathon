/**
 * Decodes a quiz question's obfuscated correct-answer index. Must stay
 * byte-for-byte identical to the backend's algorithm
 * (backend/src/utils/quizCipher.ts) — a random 10-digit `number` is reduced
 * to a single digit by repeated digit-summing, that digit indexes into
 * `string`, and the character found there (a/b/c/d) identifies the correct
 * option (index 0-3).
 *
 * This is obfuscation, not real security — grading happens client-side by
 * design, so this logic (and thus the answer key) is readable in the
 * shipped bundle. It only prevents a raw glance at the network response
 * from revealing the answer.
 */

const OPTION_LETTERS = ["a", "b", "c", "d"];

/** Repeatedly sums the digits of `n` until a single digit (0-9) remains. */
export function digitalRoot(n: number): number {
  let value = Math.abs(Math.trunc(n));
  if (value === 0) return 0;
  while (value >= 10) {
    value = String(value)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

/** Recovers the correct option index (0-3) from a `{ string, number }` pair. */
export function decodeAnswer(payload: { string: string; number: string }): number {
  const position = digitalRoot(Number(payload.number));
  const clampedPosition = Math.min(position, payload.string.length - 1);
  const letter = payload.string[clampedPosition];
  const index = OPTION_LETTERS.indexOf(letter);
  return index === -1 ? 0 : index;
}
