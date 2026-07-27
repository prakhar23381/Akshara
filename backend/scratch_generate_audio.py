import os
import sys

# Ensure gtts is installed
try:
    from gtts import gTTS
except ImportError:
    print("gTTS is not installed. Installing it now...")
    import subprocess
    import importlib
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gtts"])
        importlib.invalidate_caches()
        from gtts import gTTS
    except Exception as e:
        print(f"Failed to install or import gTTS: {e}")
        print("Please manually run: pip install gtts")
        sys.exit(1)

consonants = {
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "nga",
    "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha", "ञ": "nya",
    "ट": "tta", "ठ": "ttha", "ड": "dda", "ढ": "ddha", "ण": "nna",
    "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va",
    "श": "sha", "ष": "ssha", "स": "sa", "ह": "ha"
}

# Use a relative path from the script's location to the public/audio directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(os.path.dirname(backend_dir), "public", "audio")
os.makedirs(output_dir, exist_ok=True)

print(f"Generating audio clips in: {output_dir}")

for letter, filename in consonants.items():
    dest_path = os.path.join(output_dir, f"{filename}.mp3")
    print(f"Generating audio for '{letter}' -> {dest_path}")
    try:
        # Using Hindi voice
        tts = gTTS(text=letter, lang='hi', slow=False)
        tts.save(dest_path)
    except Exception as e:
        print(f"Error generating audio for {letter}: {e}")

print("Audio generation complete!")
