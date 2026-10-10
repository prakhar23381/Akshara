import { useRef, useState } from "react";
import { motion } from "motion/react";
import { PlayLayout } from "../PlayLayout";
import { AksharaButton } from "../../../components/AksharaButton";
import { useSession } from "../../../contexts/SessionContext";
import { MATRAS, standalone } from "../../../lib/akshara";
import { speakHindi } from "../../../utils/speech";
import type { StepProps } from "../types";

/**
 * The barakhadi in three sittings. Short and long forms sit side by side —
 * ि beside ी, ु beside ू — because mixing those pairs up is one of the most
 * common reading errors in dyslexia, and seeing them together is the point.
 */
const GROUPS: number[][] = [
  [0, 1, 2, 3], //  अ  ा  ि  ी
  [4, 5, 6, 7], //  ु  ू  े  ै
  [8, 9, 10, 11], // ो  ौ  ं  ः
];

/**
 * Matras as separate things.
 *
 * Report 9 was that matras appeared on the letter rather than separately —
 * there was no notion of a matra anywhere in the app. Hindi teaches them as
 * the barakhadi: the consonant, the vowel sign on its own, and the syllable
 * they make together. This step shows exactly those three, one row per matra:
 *
 *     क  +  ◌ा  =  का
 *           आ
 *
 * The sign is printed on a dotted circle, the standard way to show a combining
 * mark by itself, with the vowel it stands for beneath it. Tapping a row says
 * the syllable aloud.
 *
 * Generated from the consonant, so it covers every letter with no per-letter
 * content. Each session shows the next group of four, so the twelve are covered
 * over three sessions rather than crammed onto one phone screen.
 */
export function MatraStep({ letter, onComplete }: StepProps) {
  const { session } = useSession();
  const group = GROUPS[((session?.session_number ?? 1) - 1) % GROUPS.length];
  const rows = group.map((i) => MATRAS[i]);

  const [heard, setHeard] = useState<Set<number>>(() => new Set());
  const startedAt = useRef(Date.now());
  const allHeard = heard.size === rows.length;

  function hear(i: number, syllable: string) {
    speakHindi(syllable);
    setHeard((h) => new Set(h).add(i));
  }

  return (
    <PlayLayout
      centerBody={false}
      footer={
        <AksharaButton
          fullWidth
          disabled={!allHeard}
          onClick={() =>
            onComplete({ kind: "viewed", dwell_ms: Date.now() - startedAt.current })
          }
        >
          Next
        </AksharaButton>
      }
    >
      <div className="shrink-0 text-center">
        <h1 className="t-2 font-bold text-gray-800 tracking-wide">
          Matras with “{letter}”
        </h1>
        <p className="t--1 text-gray-500">Tap each one to hear it 👂</p>
      </div>

      <div
        className="flex-1 min-h-0 w-full grid"
        style={{
          gap: "var(--gap-screen)",
          gridAutoRows: "minmax(0, 1fr)",
          maxWidth: "var(--cta-max)",
          marginInline: "auto",
        }}
      >
        {rows.map((m, i) => {
          const syllable = letter + m.sign;
          const done = heard.has(i);
          return (
            <motion.button
              key={m.vowel}
              whileTap={{ scale: 0.97 }}
              onClick={() => hear(i, syllable)}
              aria-label={`${letter} plus ${m.vowel} makes ${syllable}`}
              className={`min-h-0 w-full grid items-center border-4 transition-colors ${
                done ? "bg-emerald-50 border-emerald-300" : "bg-white border-gray-300"
              }`}
              style={{
                borderRadius: "var(--card-radius)",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                paddingInline: "var(--pad-screen)",
                columnGap: "calc(var(--gap-screen) / 2)",
              }}
            >
              <span className="letter-glyph glyph-md font-bold text-gray-800">{letter}</span>
              <span className="t-1 text-gray-400">+</span>
              <span className="flex flex-col items-center leading-none">
                {m.sign ? (
                  <span className="letter-glyph glyph-md font-bold text-[#E76F51]">
                    {standalone(m.sign)}
                  </span>
                ) : (
                  // The inherent अ has no sign — show that there is nothing to add.
                  <span className="glyph-md text-gray-300">—</span>
                )}
                <span className="letter-glyph t--1 text-gray-500 mt-1">{m.vowel}</span>
              </span>
              <span className="t-1 text-gray-400">=</span>
              <span className="letter-glyph glyph-md font-bold text-[#4A90E2]">
                {syllable}
              </span>
            </motion.button>
          );
        })}
      </div>
    </PlayLayout>
  );
}
