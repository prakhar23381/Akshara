import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { OptionGrid } from "../../../components/OptionGrid";
import { DISTRACTOR_POOLS } from "../../../lib/adaptiveEngine";
import { playSuccessSound, playErrorSound } from "../../../utils/soundEffects";
import type { StepProps } from "../types";

interface Card {
  id: number;
  letter: string;
  flipped: boolean;
  matched: boolean;
}

const PAIRS = 3;

/**
 * Match identical letter glyphs. The other pairs are the letters this child
 * confuses with the target, then the engine's pool — so the deck asks the child
 * to tell apart exactly the letters they mix up, rather than a fixed set.
 */
function buildDeck(target: string, confused: string[]): Card[] {
  const hard = DISTRACTOR_POOLS[target]?.hard ?? ["म", "ग", "ब"];
  const pool = [...confused, ...hard].filter(
    (l, i, arr) => l !== target && arr.indexOf(l) === i,
  );
  const letters = [target, ...pool.slice(0, PAIRS - 1)];
  while (letters.length < PAIRS) letters.push("म");

  const deck: Card[] = [];
  let id = 1;
  letters.forEach((letter) => {
    deck.push({ id: id++, letter, flipped: false, matched: false });
    deck.push({ id: id++, letter, flipped: false, matched: false });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function MemoryStep({ letter, levelConfig, onComplete }: StepProps) {
  const [cards, setCards] = useState<Card[]>(() =>
    buildDeck(letter, [
      ...(levelConfig.confused_letters ?? []),
      ...levelConfig.distractor_pool,
    ]),
  );
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const startedAt = useRef(Date.now());
  const busy = useRef(false);

  const solved = cards.length > 0 && cards.every((c) => c.matched);

  const flip = useCallback(
    (index: number) => {
      if (busy.current) return;
      const card = cards[index];
      if (!card || card.flipped || card.matched) return;

      const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
      const chosen = [...picked, index];
      setCards(next);
      setPicked(chosen);

      if (chosen.length < 2) return;

      setMoves((m) => m + 1);
      busy.current = true;
      const [a, b] = chosen;

      if (next[a].letter === next[b].letter) {
        playSuccessSound();
        setTimeout(() => {
          setCards((cur) =>
            cur.map((c, i) =>
              i === a || i === b ? { ...c, matched: true } : c,
            ),
          );
          setPicked([]);
          busy.current = false;
        }, 400);
      } else {
        playErrorSound();
        setTimeout(() => {
          setCards((cur) =>
            cur.map((c, i) =>
              i === a || i === b ? { ...c, flipped: false } : c,
            ),
          );
          setPicked([]);
          busy.current = false;
        }, 900);
      }
    },
    [cards, picked],
  );

  useEffect(() => {
    if (!solved) return;
    playSuccessSound();
  }, [solved]);

  return (
    <PlayLayout
      centerBody={false}
      footer={
        <AksharaButton
          fullWidth
          disabled={!solved}
          onClick={() =>
            onComplete({
              kind: "memory",
              moves,
              pairs: PAIRS,
              duration_ms: Date.now() - startedAt.current,
            })
          }
        >
          Next
        </AksharaButton>
      }
    >
      <div className="shrink-0 text-center">
        <h1 className="t-2 font-bold text-gray-800 tracking-wide">
          Find the matching pairs
        </h1>
        <p className="t--1 text-gray-500">
          {solved ? `Solved in ${moves} moves! 🎉` : `${moves} moves`}
        </p>
      </div>

      <OptionGrid
        squareCells
        items={cards}
        keyOf={(c) => String(c.id)}
        render={(card, i) => (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => flip(i)}
            className={`w-full h-full flex items-center justify-center border-4 transition-colors min-h-0 ${
              card.matched
                ? "bg-emerald-50 border-emerald-400"
                : card.flipped
                  ? "bg-white border-[#4A90E2]"
                  : "bg-[#4A90E2] border-[#357ABD]"
            }`}
            style={{ borderRadius: "var(--card-radius)" }}
          >
            {card.flipped || card.matched ? (
              <span
                className={`letter-glyph font-black ${
                  card.matched ? "text-emerald-600" : "text-gray-800"
                }`}
                style={{ fontSize: "clamp(1.25rem, 6vmin, 2.75rem)" }}
              >
                {card.letter}
              </span>
            ) : (
              <span className="t-1">❓</span>
            )}
          </motion.button>
        )}
      />
    </PlayLayout>
  );
}
