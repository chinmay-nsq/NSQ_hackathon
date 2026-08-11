"use client";

import { Coins } from "lucide-react";
import { decodeAnswer } from "@/lib/quizCipher";
import { QuizQuestion } from "@/lib/types";
import { QuestionCard } from "@/components/adventures/QuizRunner";

const COINS_PER_CORRECT = 5;

/** Read-only view of an already-completed quiz — shows what was picked and what was correct, per question. */
export function QuizReview({ questions, answers }: { questions: QuizQuestion[]; answers: number[] }) {
  const correctCount = questions.reduce((count, q, i) => {
    const correctIndex = decodeAnswer({ string: q.string, number: q.number });
    return count + (answers[i] === correctIndex ? 1 : 0);
  }, 0);

  return (
    <div className="mx-auto mt-6 w-full max-w-xl space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
        <Coins className="size-4 text-currency" />
        <span className="font-medium">
          {correctCount} / {questions.length} correct — earned {correctCount * COINS_PER_CORRECT} coins
        </span>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard
            key={i}
            question={q}
            answeredState={
              answers[i] !== undefined
                ? { selected: answers[i], correct: answers[i] === decodeAnswer({ string: q.string, number: q.number }) }
                : null
            }
            onSelect={() => {}}
            interactive={false}
          />
        ))}
      </div>
    </div>
  );
}
