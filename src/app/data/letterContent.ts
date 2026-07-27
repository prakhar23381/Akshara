export interface LetterContent {
  letter: string;
  pronunciationHint: string;
  mouthEmoji: string;
  exampleWords: { word: string; image: string; meaning: string }[];
}

export const LETTER_CONTENT: Record<string, LetterContent> = {
  "क": {
    letter: "क",
    pronunciationHint: "Sound starts at back of throat, like 'k' in 'kite'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "कमल", image: "🪷", meaning: "Lotus" },
      { word: "कलम", image: "🖊️", meaning: "Pen" },
      { word: "कबूतर", image: "🐦", meaning: "Pigeon" }
    ]
  },
  "ख": {
    letter: "ख",
    pronunciationHint: "Like 'क' but with a puff of air, like 'kh' in 'khan'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "खरगोश", image: "🐇", meaning: "Rabbit" },
      { word: "खत", image: "✉️", meaning: "Letter" },
      { word: "खिलौना", image: "🧸", meaning: "Toy" }
    ]
  },
  "ग": {
    letter: "ग",
    pronunciationHint: "Sound comes from the back of your throat",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "गाय",  image: "🐄", meaning: "Cow" },
      { word: "गाजर", image: "🥕", meaning: "Carrot" },
      { word: "गाना", image: "🎵", meaning: "Song" },
    ],
  },
  "घ": {
    letter: "घ",
    pronunciationHint: "Like ग but with a puff of breath",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "घर",   image: "🏡", meaning: "Home" },
      { word: "घड़ी", image: "⏰", meaning: "Clock" },
      { word: "घास",  image: "🌿", meaning: "Grass" },
    ],
  },
  "ङ": {
    letter: "ङ",
    pronunciationHint: "Nasal sound, hummed from the back of the throat",
    mouthEmoji: "😌",
    exampleWords: [
      { word: "गंगा", image: "🌊", meaning: "Ganges (nasal)" }
    ]
  },
  "च": {
    letter: "च",
    pronunciationHint: "Touch tongue to the roof of your mouth, like 'ch' in 'chair'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "चम्मच", image: "🥄", meaning: "Spoon" },
      { word: "चरखा", image: "🪵", meaning: "Spinning wheel" },
      { word: "चश्मा", image: "👓", meaning: "Glasses" }
    ]
  },
  "छ": {
    letter: "छ",
    pronunciationHint: "Like 'च' but with a puff of air, like 'chh' in 'umbrella'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "छतरी", image: "☔", meaning: "Umbrella" },
      { word: "छत", image: "🏠", meaning: "Roof" },
      { word: "छड़ी", image: "🪄", meaning: "Stick" }
    ]
  },
  "ज": {
    letter: "ज",
    pronunciationHint: "Touch tongue to roof of mouth, like 'j' in 'jug'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "जहाज", image: "🚢", meaning: "Ship" },
      { word: "जग", image: "🥛", meaning: "Jug" },
      { word: "जूता", image: "👞", meaning: "Shoe" }
    ]
  },
  "झ": {
    letter: "झ",
    pronunciationHint: "Like 'ज' but with a puff of air, like 'jh' in 'waterfall'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "झंडा", image: "🚩", meaning: "Flag" },
      { word: "झाड़ू", image: "🧹", meaning: "Broom" },
      { word: "झूला", image: "🎡", meaning: "Swing" }
    ]
  },
  "ञ": {
    letter: "ञ",
    pronunciationHint: "Nasal sound from the center of the mouth",
    mouthEmoji: "😌",
    exampleWords: [
      { word: "चंचल", image: "🧒", meaning: "Playful" }
    ]
  },
  "ट": {
    letter: "ट",
    pronunciationHint: "Curl tongue back to touch the roof of the mouth, like retroflex 't'",
    mouthEmoji: "😛",
    exampleWords: [
      { word: "टमाटर", image: "🍅", meaning: "Tomato" },
      { word: "टब", image: "🛁", meaning: "Tub" },
      { word: "टोपी", image: "🧢", meaning: "Hat" }
    ]
  },
  "ठ": {
    letter: "ठ",
    pronunciationHint: "Like 'ट' but with a puff of air, like 'th' in 'lighthouse'",
    mouthEmoji: "😛",
    exampleWords: [
      { word: "ठठेरा", image: "🛠️", meaning: "Coppersmith" },
      { word: "ठप्पा", image: "🖃", meaning: "Stamp" },
      { word: "ठेला", image: "🛒", meaning: "Cart" }
    ]
  },
  "ड": {
    letter: "ड",
    pronunciationHint: "Curl tongue back and make a hard 'd' sound",
    mouthEmoji: "😛",
    exampleWords: [
      { word: "डमरू", image: "🪘", meaning: "Small drum" },
      { word: "डगर", image: "🛣️", meaning: "Path" },
      { word: "डाकिया", image: "✉️", meaning: "Postman" }
    ]
  },
  "ढ": {
    letter: "ढ",
    pronunciationHint: "Like 'ड' but with a puff of air",
    mouthEmoji: "😛",
    exampleWords: [
      { word: "ढोलक", image: "🥁", meaning: "Drum" },
      { word: "ढक्कन", image: "🫙", meaning: "Lid" },
      { word: "ढाल", image: "🛡️", meaning: "Shield" }
    ]
  },
  "ण": {
    letter: "ण",
    pronunciationHint: "Nasal retroflex sound, curl tongue back",
    mouthEmoji: "😌",
    exampleWords: [
      { word: "बाण", image: "🏹", meaning: "Arrow" },
      { word: "वीणा", image: "🎸", meaning: "Lute" }
    ]
  },
  "त": {
    letter: "त",
    pronunciationHint: "Touch tongue to front teeth, like dental 't'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "तरबूज", image: "🍉", meaning: "Watermelon" },
      { word: "तकिया", image: "🛏️", meaning: "Pillow" },
      { word: "ताला", image: "🔒", meaning: "Lock" }
    ]
  },
  "थ": {
    letter: "थ",
    pronunciationHint: "Like 'त' but with a puff of air, like 'th' in 'think'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "थर्मस", image: "🧪", meaning: "Flask" },
      { word: "थाली", image: "🍽️", meaning: "Plate" },
      { word: "थैला", image: "🛍️", meaning: "Bag" }
    ]
  },
  "द": {
    letter: "द",
    pronunciationHint: "Touch tongue to front teeth, like dental 'd'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "दवात", image: "🧪", meaning: "Inkpot" },
      { word: "दरवाजा", image: "🚪", meaning: "Door" },
      { word: "दरजी", image: "🪡", meaning: "Tailor" }
    ]
  },
  "ध": {
    letter: "ध",
    pronunciationHint: "Touch tongue to teeth, add a breathy sound",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "धन",    image: "💰", meaning: "Wealth" },
      { word: "धरती",  image: "🌍", meaning: "Earth" },
      { word: "धनुष",  image: "🏹", meaning: "Bow" },
    ],
  },
  "न": {
    letter: "न",
    pronunciationHint: "Nasal dental sound, tongue on teeth, like 'n' in 'net'",
    mouthEmoji: "😌",
    exampleWords: [
      { word: "नल", image: "🚰", meaning: "Tap" },
      { word: "नदी", image: "🏞️", meaning: "River" },
      { word: "नमक", image: "🧂", meaning: "Salt" }
    ]
  },
  "प": {
    letter: "प",
    pronunciationHint: "Press lips together and release, like 'p' in 'pen'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "पतंग", image: "🪁", meaning: "Kite" },
      { word: "पपीता", image: "🍈", meaning: "Papaya" },
      { word: "पत्ता", image: "🍃", meaning: "Leaf" }
    ]
  },
  "फ": {
    letter: "फ",
    pronunciationHint: "Like 'प' but with a puff of air, like 'ph' in 'phone'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "फल", image: "🍎", meaning: "Fruits" },
      { word: "फूल", image: "🌸", meaning: "Flower" },
      { word: "फव्वारा", image: "⛲", meaning: "Fountain" }
    ]
  },
  "ब": {
    letter: "ब",
    pronunciationHint: "Press your lips together, then open them",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "बस",    image: "🚌", meaning: "Bus" },
      { word: "बकरी",  image: "🐐", meaning: "Goat" },
      { word: "बादल",  image: "☁️", meaning: "Cloud" },
    ],
  },
  "भ": {
    letter: "भ",
    pronunciationHint: "Like 'ब' but with a puff of air, breathy 'bh'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "भालू", image: "🐻", meaning: "Bear" },
      { word: "भवन", image: "🏢", meaning: "Building" },
      { word: "भगत", image: "🙏", meaning: "Devotee" }
    ]
  },
  "म": {
    letter: "म",
    pronunciationHint: "Press your lips together, hum through your nose",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "मछली", image: "🐟", meaning: "Fish" },
      { word: "मकान", image: "🏠", meaning: "House" },
      { word: "माँ",   image: "👩", meaning: "Mother" },
    ],
  },
  "य": {
    letter: "य",
    pronunciationHint: "Soft sound from center of tongue, like 'y' in 'yak'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "यज्ञ", image: "🔥", meaning: "Sacrifice" },
      { word: "याक", image: "🐂", meaning: "Yak" },
      { word: "यात्री", image: "🧳", meaning: "Traveler" }
    ]
  },
  "र": {
    letter: "र",
    pronunciationHint: "Tap tongue briefly against roof of mouth, rolled 'r'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "रथ", image: "🛒", meaning: "Chariot" },
      { word: "रबर", image: "🧼", meaning: "Eraser" },
      { word: "रस्सी", image: "🪢", meaning: "Rope" }
    ]
  },
  "ल": {
    letter: "ल",
    pronunciationHint: "Touch tongue behind front teeth, like 'l' in 'lion'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "लट्टू", image: "🪀", meaning: "Spinning top" },
      { word: "लड़का", image: "👦", meaning: "Boy" },
      { word: "लकड़ी", image: "🪵", meaning: "Wood" }
    ]
  },
  "व": {
    letter: "व",
    pronunciationHint: "Touch top teeth to bottom lip, like 'v' in 'van'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "वन", image: "🌳", meaning: "Forest" },
      { word: "वकील", image: "⚖️", meaning: "Lawyer" },
      { word: "वृक्ष", image: "🌲", meaning: "Tree" }
    ]
  },
  "श": {
    letter: "श",
    pronunciationHint: "Soft breathy sound, like 'sh' in 'shoe'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "शलगम", image: "🧅", meaning: "Turnip" },
      { word: "शीशा", image: "🪞", meaning: "Mirror" },
      { word: "शहनाई", image: "🎺", meaning: "Clarinet" }
    ]
  },
  "ष": {
    letter: "ष",
    pronunciationHint: "Breathy sh-sound, curl tongue slightly back",
    mouthEmoji: "😛",
    exampleWords: [
      { word: "षट्कोण", image: "⬡", meaning: "Hexagon" }
    ]
  },
  "स": {
    letter: "स",
    pronunciationHint: "Hissing sound through teeth, like 's' in 'sun'",
    mouthEmoji: "😀",
    exampleWords: [
      { word: "सपेरा", image: "🐍", meaning: "Snake charmer" },
      { word: "सेब", image: "🍎", meaning: "Apple" },
      { word: "सूरज", image: "☀️", meaning: "Sun" }
    ]
  },
  "ह": {
    letter: "ह",
    pronunciationHint: "Soft breathy sigh from the throat, like 'h' in 'hat'",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "हल", image: "🚜", meaning: "Plough" },
      { word: "हाथी", image: "🐘", meaning: "Elephant" },
      { word: "हाथ", image: "✋", meaning: "Hand" }
    ]
  }
};

// Maps each Hindi letter to its audio file in /public/audio/
export const LETTER_AUDIO: Record<string, string> = {
  "क": "/audio/ka.mp3",
  "ख": "/audio/kha.mp3",
  "ग": "/audio/ga.mp3",
  "घ": "/audio/gha.mp3",
  "ङ": "/audio/nga.mp3",
  "च": "/audio/cha.mp3",
  "छ": "/audio/chha.mp3",
  "ज": "/audio/ja.mp3",
  "झ": "/audio/jha.mp3",
  "ञ": "/audio/nya.mp3",
  "ट": "/audio/tta.mp3",
  "ठ": "/audio/ttha.mp3",
  "ड": "/audio/dda.mp3",
  "ढ": "/audio/ddha.mp3",
  "ण": "/audio/nna.mp3",
  "त": "/audio/ta.mp3",
  "थ": "/audio/tha.mp3",
  "द": "/audio/da.mp3",
  "ध": "/audio/dha.mp3",
  "न": "/audio/na.mp3",
  "प": "/audio/pa.mp3",
  "फ": "/audio/pha.mp3",
  "ब": "/audio/ba.mp3",
  "भ": "/audio/bha.mp3",
  "म": "/audio/ma.mp3",
  "य": "/audio/ya.mp3",
  "र": "/audio/ra.mp3",
  "ल": "/audio/la.mp3",
  "व": "/audio/va.mp3",
  "श": "/audio/sha.mp3",
  "ष": "/audio/ssha.mp3",
  "स": "/audio/sa.mp3",
  "ह": "/audio/ha.mp3"
};

export function getLetterAudio(letter: string): string | null {
  return LETTER_AUDIO[letter] ?? null;
}

export function getLetterContent(letter: string): LetterContent {
  return (
    LETTER_CONTENT[letter] ?? {
      letter,
      pronunciationHint: "Listen carefully and repeat",
      mouthEmoji: "😮",
      exampleWords: [],
    }
  );
}
