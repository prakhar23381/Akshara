import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const consonants = {
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "nga",
    "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha", "ञ": "nya",
    "ट": "tta", "ठ": "ttha", "ड": "dda", "ढ": "ddha", "ण": "nna",
    "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va",
    "श": "sha", "ष": "ssha", "स": "sa", "ह": "ha"
};

const outputDir = path.join(__dirname, "public", "audio");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function download(letter, filename) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(letter)}&tl=hi&total=1&idx=0&textlen=${letter.length}&client=tw-ob`;
    const dest = path.join(outputDir, `${filename}.mp3`);
    console.log(`Downloading '${letter}' -> ${dest}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(dest, buffer);
    } catch (e) {
        console.error(`Error downloading ${letter}:`, e);
    }
}

async function run() {
    for (const [letter, filename] of Object.entries(consonants)) {
        await download(letter, filename);
        // Add a small delay to avoid rate-limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log("All audio files downloaded successfully!");
}

run();
