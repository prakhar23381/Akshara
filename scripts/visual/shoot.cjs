// Screenshot the built app in a headless Chromium, with seeded sessions.
// See scripts/visual/README.md. Usage:
//   node shoot.cjs <puppeteer-core dir> <scenarios.json> <out dir> <base url> [shot-prefix,...]
// BROWSER=<path to a Chromium-family browser> overrides the default (Brave).
//
// Report lab shots run only when asked for by a "lab" prefix, against the dev
// server (the lab is never built), and need no scenarios file — pass "-":
//   node shoot.cjs <puppeteer-core dir> - <out dir> http://localhost:5173 lab
const path = require("node:path"), fs = require("node:fs");
const puppeteer = require(path.join(process.argv[2], "node_modules/puppeteer-core"));
const { scenarios } = process.argv[3] === "-" ? { scenarios: {} } : JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const OUT = process.argv[4], BASE = process.argv[5];
const want = (process.argv[6] || "").split(",").filter(Boolean);
const VIEW = { phone: [390, 844], small: [360, 640], tablet: [820, 1180], desktop: [1440, 900], landscape: [740, 360], wide: [1728, 1000] };
const APP_SHOTS = [
  // name, scenario, path, viewport, height override (report is one scroll container: a tall viewport shows all of it)
  ["acct-role", "role", "/", "phone"],
  ["acct-pinsetup", "pin-setup", "/", "phone"],
  ["acct-home-phone", "home", "/", "phone"],
  ["acct-home-desktop", "home", "/", "desktop"],
  ["acct-unlock", "unlock", "/unlock?next=/home", "phone"],
  ["acct-nopin", "no-pin", "/", "phone"],
  ["acct-resume", "child-resume", "/", "phone"],
  ["acct-legacy", "legacy", "/", "phone"],
  ["acct-report-locked", "unlock", "/report", "phone"],
  ["report-phone", "report", "/report", "phone", 3600],
  ["report-tablet", "report", "/report", "tablet", 2300],
  ["report-desktop", "report", "/report", "desktop", 1700],
  ["matras-small", "play-matras", "/play", "small"],
  ["memory-small", "play-memory", "/play", "small"],
  ["memory-tablet", "play-memory", "/play", "tablet"],
  ["identify-small", "play-identify", "/play", "small"],
  ["identify-tablet", "play-identify", "/play", "tablet"],
  ["wordfill-small", "play-word_fill", "/play", "small"],
  ["wordspelling-small", "play-word_spelling", "/play", "small"],
  ["wordspelling-tablet", "play-word_spelling", "/play", "tablet"],
  ["wordfill-tablet", "play-word_fill", "/play", "tablet"],
  ["identify-desktop", "play-identify", "/play", "desktop"],
  ["identify-hint-small", "play-identify", "/play", "small", undefined, 19500],
  ["landscape-identify", "play-identify", "/play", "landscape"],
];
// Every lab scenario at every size, plus the workbench itself. The lab seeds
// its own data, so these use no scenario.
const LAB_SCENARIOS = ["new", "first", "week", "month", "struggling", "class"];
const LAB_SHOTS = [
  ...LAB_SCENARIOS.flatMap((sc) =>
    ["phone", "tablet", "desktop"].map((vp) => [`lab-${sc}-${vp}`, null, `/lab.html?frame=1&scenario=${sc}`, vp])),
  ["lab-workbench", null, "/lab.html?scenario=week&size=all", "wide", undefined, 2500],
];
const SHOTS = (want.some((w) => w.startsWith("lab")) ? LAB_SHOTS : APP_SHOTS)
  .filter(([n]) => want.length === 0 || want.some((w) => n.startsWith(w)));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.BROWSER || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    headless: true,
    userDataDir: path.join(OUT, ".profile"),            // throwaway; never the user's own profile
    args: ["--no-first-run", "--disable-extensions", "--hide-scrollbars", "--mute-audio"],
  });
  for (const [name, scen, route, vp, tall, wait] of SHOTS) {
    const page = await browser.newPage();
    const [w, h] = VIEW[vp];
    await page.setViewport({ width: w, height: tall ?? h, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument((entries) => {
      localStorage.clear();
      sessionStorage.clear();
      // "session:"-prefixed keys belong in sessionStorage (e.g. the adult unlock).
      for (const [k, v] of Object.entries(entries)) {
        if (k.startsWith("session:")) sessionStorage.setItem(k.slice(8), v);
        else localStorage.setItem(k, v);
      }
      window.speechSynthesis && (window.speechSynthesis.speak = () => {});
    }, scen ? scenarios[scen] : {});
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(BASE + route, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, wait ?? 900));   // let entry animations settle (or the hint ladder run)
    const file = path.join(OUT, name + ".png");
    await page.screenshot({ path: file });
    // Layout facts a picture can hide: horizontal overflow, and centring of the option grid.
    const facts = await page.evaluate(() => {
      const doc = document.documentElement;
      const grid = document.querySelector("main .grid");
      const r = grid ? grid.getBoundingClientRect() : null;
      return {
        url: location.pathname,
        hOverflow: doc.scrollWidth > doc.clientWidth,
        gridLeftGap: r ? Math.round(r.left) : null,
        gridRightGap: r ? Math.round(window.innerWidth - r.right) : null,
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        path: location.pathname + location.search,
      };
    });
    console.log(`${name.padEnd(20)} ${JSON.stringify(facts)}${errors.length ? "  ERRORS: " + errors.slice(0, 2).join(" | ") : ""}`);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("shoot failed:", e.message); process.exit(1); });
