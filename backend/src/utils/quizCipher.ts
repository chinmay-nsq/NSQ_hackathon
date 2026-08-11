/**
 * Obfuscates a quiz question's correct-answer index so the raw API payload
 * never contains an obvious `correctIndex` field. The scheme: a random
 * 10-digit `number` is reduced to a single digit by repeated digit-summing
 * (e.g. 1234067895 -> ... -> 1); that digit is used as a character position
 * into a randomly-generated `string`, and the character at that position is
 * set to match the correct option's letter (a/b/c/d for option index 0-3).
 *
 * This is obfuscation, not real security — the algorithm is simple and
 * (by design, per product decision) also ships in the frontend bundle for
 * local grading, so a motivated user can read it in devtools. It only
 * prevents a raw glance at the network response from revealing the answer.
 */

const OPTION_LETTERS = ["a", "b", "c", "d"];
const STRING_LENGTH = 16;
const STRING_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Repeatedly sums the digits of `n` until a single digit (1-9) remains. */
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

function randomDigitString(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function randomChar(): string {
  return STRING_ALPHABET[Math.floor(Math.random() * STRING_ALPHABET.length)];
}

/** Builds the `{ string, number }` pair such that decoding it yields `correctOptionIndex`. */
export function encodeAnswer(correctOptionIndex: number): { string: string; number: string } {
  if (correctOptionIndex < 0 || correctOptionIndex > 3) {
    throw new Error("correctOptionIndex must be 0-3");
  }

  const numberStr = randomDigitString(10);
  const position = digitalRoot(Number(numberStr));

  const chars = Array.from({ length: STRING_LENGTH }, () => randomChar());
  const clampedPosition = Math.min(position, STRING_LENGTH - 1);
  chars[clampedPosition] = OPTION_LETTERS[correctOptionIndex];

  return { string: chars.join(""), number: numberStr };
}

/** Recovers the correct option index (0-3) from a previously-encoded `{ string, number }` pair. */
export function decodeAnswer(payload: { string: string; number: string }): number {
  const position = digitalRoot(Number(payload.number));
  const clampedPosition = Math.min(position, payload.string.length - 1);
  const letter = payload.string[clampedPosition];
  const index = OPTION_LETTERS.indexOf(letter);
  return index === -1 ? 0 : index;
}
