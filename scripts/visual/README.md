# Visual checks — see the app before calling a UI change done

The agent environment has no visible browser, so for a long time every layout
claim was made by reading CSS. This renders the **production build** in a
headless Chromium-family browser (Brave or Chrome, whichever is installed) with
a throwaway profile, at real device sizes, with realistic sessions already in
storage.

Its first run, on 2026-10-10, caught four report defects and showed that
device-feedback items 3b/4b had never been scheduled. Reading the code had
missed all of them.

## Seed data comes from the real engine

`seed.ts` bundles the app's own `planSession`, `analyzeLocally`,
`buildLearnerProfile` and `upsertSession`, and plays a week of sessions for one
guest child. Every session is configured by the planner from the history
before it, so the report shows genuine planner reasoning, confusions and
targeted letters, not hand-typed JSON. It also parks an in-progress session at
each play step (matras, memory, identify, word_fill, word_spelling).

## Running it

Nothing here is a project dependency. Install puppeteer-core anywhere (it
drives an existing browser and downloads none):

```bash
mkdir -p /tmp/pptr && (cd /tmp/pptr && npm i --ignore-scripts puppeteer-core@23)

# 1. scenarios, from the real engine
./node_modules/.bin/esbuild scripts/visual/seed.ts --bundle --platform=node --format=cjs \
  --outfile=/tmp/seed.cjs --log-level=error \
  '--define:import.meta.env.VITE_API_URL=undefined' \
  '--define:import.meta.env.VITE_SUPABASE_URL=""' '--define:import.meta.env.VITE_SUPABASE_KEY=""'
node scripts/visual/shim.cjs /tmp/seed.cjs > /tmp/scenarios.json

# 2. build, serve, shoot
npm run build && (./node_modules/.bin/vite preview --port 4173 --strictPort &)
mkdir -p /tmp/shots
node scripts/visual/shoot.cjs /tmp/pptr /tmp/scenarios.json /tmp/shots http://localhost:4173
# optional: only some shots — e.g. … http://localhost:4173 report,identify
pkill -f "vite preview --port 4173"
```

Use `BROWSER=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome` to
use Chrome instead.

Each shot also prints measured facts: horizontal overflow, the option grid's
left and right gaps (equal means centred), the page title, and any console
errors. A `favicon.ico` 404 is expected, because the app ships no favicon.

## What it cannot tell you

Touch, audio and text-to-speech, real Android fonts and performance. Those
still need a real device.
