"use client";

import { useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Coins, X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { decodeAnswer } from "@/lib/quizCipher";
import { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COINS_PER_CORRECT = 5;
const OPTION_LABELS = ["A", "B", "C", "D"];

export interface QuizResult {
  answers: number[];
  correctCount: number;
}

export interface AnsweredState {
  selected: number;
  correct: boolean;
}

export function QuestionCard({
  question,
  answeredState,
  onSelect,
  interactive,
}: {
  question: QuizQuestion;
  answeredState: AnsweredState | null;
  onSelect: (optionIndex: number) => void;
  interactive: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="mb-4 flex items-start gap-2 text-sm font-medium">{question.question}</p>
      <div className="grid gap-2">
        {question.options.map((option, oi) => {
          const isSelected = answeredState?.selected === oi;
          const revealCorrect =
            answeredState && oi === decodeAnswer({ string: question.string, number: question.number });
          const isWrongPick = answeredState && isSelected && !answeredState.correct;

          return (
            <button
              key={oi}
              type="button"
              disabled={!interactive || Boolean(answeredState)}
              onClick={() => onSelect(oi)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                !answeredState && interactive && "border-border hover:bg-muted/50",
                !answeredState && !interactive && "border-border",
                revealCorrect && "border-success bg-success/10",
                isWrongPick && "border-destructive bg-destructive/10"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  !answeredState && "border-muted-foreground/40 text-muted-foreground",
                  revealCorrect && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-destructive bg-destructive text-destructive-foreground"
                )}
              >
                {revealCorrect ? (
                  <Check className="size-3.5" />
                ) : isWrongPick ? (
                  <X className="size-3.5" />
                ) : (
                  OPTION_LABELS[oi]
                )}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the 5-question skill quiz, one question at a time — dot
 * indicators and Prev/Next step between questions. Picking an option grades
 * and locks it immediately (no changing your answer) — correct turns green
 * right away, wrong flashes red and shakes/vibrates. Once all 5 are
 * answered, submits the batch result to the parent for the actual
 * /complete API call.
 */
export function QuizRunner({
  questions,
  onSubmit,
  submitting,
}: {
  questions: QuizQuestion[];
  onSubmit: (result: QuizResult) => void;
  submitting: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState<(AnsweredState | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const activeCardRef = useRef<HTMLDivElement>(null);

  const allAnswered = answered.every((a) => a !== null);
  const correctCount = answered.filter((a) => a?.correct).length;

  useGSAP(
    () => {
      if (!activeCardRef.current) return;
      gsap.fromTo(
        activeCardRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" }
      );
    },
    { dependencies: [current] }
  );

  function selectOption(optionIndex: number) {
    if (answered[current]) return;

    const q = questions[current];
    const correctIndex = decodeAnswer({ string: q.string, number: q.number });
    const correct = optionIndex === correctIndex;

    setAnswered((prev) => {
      const next = [...prev];
      next[current] = { selected: optionIndex, correct };
      return next;
    });

    if (!correct) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(200);
      }
      // Shake only the question card, never document.body — a transform on
      // <body> creates a new containing block for every `position: fixed`
      // descendant (the sidebar), which visually breaks it out of the
      // viewport and makes it look like it scrolls with the page.
      if (activeCardRef.current) {
        gsap.fromTo(
          activeCardRef.current,
          { x: 0 },
          {
            x: 0,
            keyframes: { x: [-10, 8, -6, 4, -2, 0] },
            duration: 0.45,
            ease: "power1.inOut",
          }
        );
      }
    }

    // Auto-advance to the next unanswered question after a beat, so the
    // user sees the correct/incorrect state before moving on.
    if (current < questions.length - 1) {
      window.setTimeout(() => setCurrent((c) => Math.min(c + 1, questions.length - 1)), 700);
    }
  }

  function handleSubmit() {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    const answers = answered.map((a) => a!.selected);
    onSubmit({ answers, correctCount });
  }

  function goTo(index: number) {
    setCurrent(Math.max(0, Math.min(index, questions.length - 1)));
  }

  return (
    <div className="mt-6 w-full space-y-4">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Question {current + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => {
            const a = answered[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to question ${i + 1}`}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i === current
                    ? "bg-primary"
                    : a
                      ? a.correct
                        ? "bg-success"
                        : "bg-destructive"
                      : "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>
      </div>

      <div ref={activeCardRef} className="mx-auto w-full max-w-xl">
        <QuestionCard
          question={questions[current]}
          answeredState={answered[current]}
          onSelect={selectOption}
          interactive={true}
        />
      </div>

      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current === 0}
          onClick={() => goTo(current - 1)}
          className="font-mono text-xs tracking-wide uppercase"
        >
          <ChevronLeft />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current === questions.length - 1}
          onClick={() => goTo(current + 1)}
          className="font-mono text-xs tracking-wide uppercase"
        >
          Next
          <ChevronRight />
        </Button>
      </div>

      {allAnswered && (
        <div className="mx-auto w-full max-w-xl space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <Coins className="size-4 text-currency" />
            <span className="font-medium">
              {correctCount} / {questions.length} correct — +{correctCount * COINS_PER_CORRECT} coins
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitted || submitting}
            className="glow-primary font-mono text-xs tracking-wide uppercase"
          >
            {submitting ? "Submitting…" : submitted ? "Submitted" : "Finish quiz"}
          </Button>
        </div>
      )}
    </div>
  );
}
