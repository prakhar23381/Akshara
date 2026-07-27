export interface StrokePath {
  path: string;
  duration: number; // duration of animation in seconds
}

export const LETTER_STROKES: Record<string, StrokePath[]> = {
  "क": [
    { path: "M 200 120 L 200 330", duration: 0.8 },
    { path: "M 200 200 C 130 200 130 260 200 260 C 270 260 270 200 200 200", duration: 1.2 },
    { path: "M 200 200 C 260 200 280 270 230 310", duration: 0.9 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ख": [
    { path: "M 130 160 C 130 120 180 120 180 180 L 180 250 C 180 290 250 290 250 250 L 250 160", duration: 1.5 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 250 200 C 200 200 200 260 250 260", duration: 0.9 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ग": [
    { path: "M 170 120 L 170 270 A 20 20 0 1 1 150 250 L 170 250", duration: 1.2 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "घ": [
    { path: "M 140 150 C 140 210 220 210 220 250 C 220 290 270 290 270 250", duration: 1.4 },
    { path: "M 270 120 L 270 330", duration: 0.8 },
    { path: "M 100 120 L 320 120", duration: 0.6 }
  ],
  "ङ": [
    { path: "M 200 120 L 200 150", duration: 0.4 },
    { path: "M 200 150 C 130 180 170 230 200 230 C 250 230 250 280 200 310 C 150 330 150 310 150 310", duration: 1.5 },
    { path: "M 270 230 A 5 5 0 1 1 269.9 230", duration: 0.3 },
    { path: "M 120 120 L 280 120", duration: 0.6 }
  ],
  "च": [
    { path: "M 130 210 L 200 210 C 200 270 260 270 260 210", duration: 1.2 },
    { path: "M 260 120 L 260 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "छ": [
    { path: "M 140 150 C 140 210 200 210 200 250 C 200 300 140 300 140 250 Q 140 200 190 200", duration: 1.6 },
    { path: "M 190 120 L 190 200", duration: 0.5 },
    { path: "M 100 120 L 250 120", duration: 0.6 }
  ],
  "ज": [
    { path: "M 130 180 C 130 250 210 250 210 210 L 260 210", duration: 1.3 },
    { path: "M 260 120 L 260 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "झ": [
    { path: "M 200 120 L 200 150 C 130 180 170 230 200 230 C 250 230 250 280 200 310 C 150 330 150 310 150 310 L 180 340", duration: 1.8 },
    { path: "M 200 230 L 260 230", duration: 0.5 },
    { path: "M 260 120 L 260 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ञ": [
    { path: "M 160 170 C 120 170 120 270 160 270", duration: 1.0 },
    { path: "M 160 220 L 250 220", duration: 0.5 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ट": [
    { path: "M 200 120 L 200 160", duration: 0.4 },
    { path: "M 200 160 C 130 180 140 300 230 300", duration: 1.2 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ठ": [
    { path: "M 200 120 L 200 160", duration: 0.4 },
    { path: "M 200 230 A 70 70 0 1 1 199.9 230", duration: 1.4 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ड": [
    { path: "M 200 120 L 200 150", duration: 0.4 },
    { path: "M 200 150 C 130 180 170 230 200 230 C 250 230 250 280 200 310 C 150 330 150 310 150 310", duration: 1.5 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ढ": [
    { path: "M 200 120 L 200 160", duration: 0.4 },
    { path: "M 200 160 C 130 180 140 300 210 300 Q 250 300 250 270 Q 250 240 220 240 L 210 240", duration: 1.6 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ण": [
    { path: "M 150 120 L 150 240 A 30 30 0 0 0 210 240 L 210 120", duration: 1.2 },
    { path: "M 270 120 L 270 330", duration: 0.8 },
    { path: "M 100 120 L 320 120", duration: 0.6 }
  ],
  "त": [
    { path: "M 250 200 L 170 200 C 170 250 170 330 170 330", duration: 1.2 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "थ": [
    { path: "M 150 160 C 150 120 190 120 190 180 L 190 230 C 190 280 250 280 250 230", duration: 1.5 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 200 120 L 300 120", duration: 0.5 }
  ],
  "द": [
    { path: "M 200 120 L 200 160", duration: 0.4 },
    { path: "M 200 160 C 130 180 140 280 210 280 Q 240 280 240 250 Q 240 220 210 220 L 230 330", duration: 1.6 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ध": [
    { path: "M 140 160 C 140 120 180 120 180 180 C 180 220 220 220 220 250 C 220 290 270 290 270 250", duration: 1.6 },
    { path: "M 270 120 L 270 330", duration: 0.8 },
    { path: "M 220 120 L 300 120", duration: 0.5 }
  ],
  "न": [
    { path: "M 140 240 A 20 20 0 1 1 140 200 L 250 220", duration: 1.2 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "प": [
    { path: "M 160 120 L 160 240 A 40 40 0 0 0 240 240 L 240 120", duration: 1.2 },
    { path: "M 240 120 L 240 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "फ": [
    { path: "M 160 120 L 160 240 A 40 40 0 0 0 240 240 L 240 120 M 240 200 C 290 200 290 290 290 290", duration: 1.6 },
    { path: "M 240 120 L 240 330", duration: 0.8 },
    { path: "M 100 120 L 320 120", duration: 0.6 }
  ],
  "ब": [
    { path: "M 250 220 A 40 45 0 1 1 249.9 220", duration: 1.2 },
    { path: "M 180 190 L 230 250", duration: 0.6 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "भ": [
    { path: "M 130 160 C 130 120 170 120 170 180 L 170 280 C 170 310 130 310 130 280 L 250 280", duration: 1.6 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 200 120 L 300 120", duration: 0.5 }
  ],
  "म": [
    { path: "M 150 150 L 150 270 Q 150 300 130 300 Q 110 300 110 270 Q 110 250 140 250 L 270 250", duration: 1.5 },
    { path: "M 270 120 L 270 330", duration: 0.8 },
    { path: "M 100 120 L 320 120", duration: 0.6 }
  ],
  "य": [
    { path: "M 150 160 C 150 210 210 210 210 260 C 210 290 260 290 260 250", duration: 1.4 },
    { path: "M 260 120 L 260 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "र": [
    { path: "M 150 160 C 150 120 220 120 220 200 C 220 240 150 260 150 330", duration: 1.3 },
    { path: "M 100 120 L 280 120", duration: 0.6 }
  ],
  "ल": [
    { path: "M 140 240 C 140 200 190 200 190 240 C 190 200 240 200 240 240", duration: 1.4 },
    { path: "M 240 120 L 240 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "व": [
    { path: "M 250 220 A 40 45 0 1 1 249.9 220", duration: 1.2 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "श": [
    { path: "M 140 150 C 140 120 190 120 190 180 L 190 240 C 190 280 140 280 140 240 L 200 330", duration: 1.5 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 120 120 L 300 120", duration: 0.6 }
  ],
  "ष": [
    { path: "M 160 120 L 160 240 A 40 40 0 0 0 240 240 L 240 120", duration: 1.2 },
    { path: "M 170 170 L 230 230", duration: 0.6 },
    { path: "M 240 120 L 240 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "स": [
    { path: "M 150 160 C 150 120 220 120 220 200 C 220 240 150 260 150 330", duration: 1.3 },
    { path: "M 180 240 L 250 240", duration: 0.5 },
    { path: "M 250 120 L 250 330", duration: 0.8 },
    { path: "M 100 120 L 300 120", duration: 0.6 }
  ],
  "ह": [
    { path: "M 200 120 L 200 150", duration: 0.4 },
    { path: "M 200 150 C 140 170 140 230 200 230 C 240 230 240 260 200 260", duration: 1.3 },
    { path: "M 160 230 C 160 280 230 280 230 320", duration: 1.0 },
    { path: "M 120 120 L 280 120", duration: 0.6 }
  ]
};
