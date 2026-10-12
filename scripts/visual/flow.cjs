// Drive the whole account journey by clicking, as a new parent would:
// sign in as a guest, choose a role, set a PIN (with a deliberate mismatch),
// add a child, hand the device over, try to get back without the PIN, unlock,
// open the child's report, reload, and open a second tab. Given the scenarios
// file (seed.ts), it then walks the parent report with a week of sessions:
// sections, a letter, the phone's back button, the period, reload, a deep
// link and Download.
//   node flow.cjs <puppeteer-core dir> <out dir> <base url> [scenarios.json]
// Its first run caught two race conditions and an unfocusable control that
// the unit tests and screenshots had all missed.
const path = require("node:path");
const puppeteer = require(path.join(process.argv[2], "node_modules/puppeteer-core"));
const OUT = process.argv[3], BASE = process.argv[4];
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "  ✓" : "  ✗", n, c ? "" : x); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.BROWSER || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    headless: true, userDataDir: path.join(OUT, ".flowprofile"), args: ["--no-first-run", "--mute-audio"] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844 });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem("__seeded")) { localStorage.clear(); sessionStorage.setItem("__seeded", "1"); } });

  const where = () => p.evaluate(() => location.pathname + location.search);
  const h1 = () => p.evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? "");
  const text = () => p.evaluate(() => document.body.innerText);
  async function click(label) {
    const done = await p.evaluate((label) => {
      const el = [...document.querySelectorAll("button, a")].find((e) => e.textContent.replace(/\s+/g, " ").trim().includes(label) && !e.disabled);
      if (!el) return false; el.click(); return true;
    }, label);
    if (!done) throw new Error(`no enabled button "${label}" on ${await where()}`);
    await sleep(500);
  }
  async function pin(digits) { for (const d of digits) await click(d); await sleep(700); }

  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  ok("a new visitor sees the sign-in screen", (await text()).includes("Start Learning"));

  await click("Start Learning"); await sleep(800);
  ok("a new guest is asked parent or teacher", (await where()) === "/setup/role", await where());

  await click("I'm a parent"); await sleep(600);
  ok("then asked to choose a PIN", (await where()) === "/setup/pin" && (await h1()).includes("Choose"), await h1());
  await pin("2468");
  ok("asked to enter it again", (await h1()).includes("once more"), await h1());
  await pin("1357");
  ok("a mismatch is caught and it starts over", (await text()).includes("didn't match"));
  await pin("2468"); await pin("2468");
  ok("matching PINs land on the adult home", (await where()) === "/home", await where());
  ok("…which offers to add the first child", (await text()).includes("Add your first child"));

  await click("Add a child");
  ok("adding a child starts with their name", (await where()) === "/profile/name", await where());
  await p.type("input", "Kiran"); await click("Next");
  ok("then their age", (await where()) === "/profile/age", await where());
  await click("6"); await sleep(900);
  ok("then an avatar", (await where()) === "/profile/avatar", await where());
  await p.evaluate(() => [...document.querySelectorAll("button")].find((e) => e.textContent.includes("🐼"))?.click()); await sleep(300);
  await click("Let's go"); await sleep(900);
  ok("and the child appears on the adult home", (await where()) === "/home" && (await text()).includes("Kiran"), await where());
  ok("with their age and no letters yet", (await text()).includes("Age 6") && (await text()).includes("0 of 33"));

  await click("Play as Kiran"); await sleep(900);
  ok("'Play as' hands the device to the child", (await where()) === "/resume" && (await h1()).includes("Kiran"), await h1());
  ok("the child's screen has no Sign out", !(await text()).includes("Sign out"));

  await p.goto(BASE + "/home", { waitUntil: "networkidle0" }); await sleep(600);
  ok("a child cannot type their way to the adult home", (await where()).startsWith("/unlock"), await where());
  await p.goto(BASE + "/report", { waitUntil: "networkidle0" }); await sleep(600);
  ok("…or to a report", (await where()).startsWith("/unlock"), await where());

  await pin("1111");
  ok("a wrong PIN is refused", (await text()).includes("not the PIN"));
  await pin("2468");
  ok("the right PIN goes where the adult was heading", (await where()) === "/report", await where());
  await sleep(800);
  ok("the report is Kiran's (empty: nothing played yet)",
    (await text()).includes("Kiran") && (await text()).includes("No sessions yet"), (await text()).slice(0, 120));
  await click("Back to your children"); await sleep(600);
  ok("and back to the children", (await where()) === "/home", await where());

  await p.reload({ waitUntil: "networkidle0" }); await sleep(700);
  ok("reloading the tab keeps the adult area open", (await where()) === "/home", await where());

  await click("Play as Kiran"); await sleep(700);
  const p2 = await b.newPage();
  await p2.setViewport({ width: 390, height: 844 });
  await p2.goto(BASE + "/", { waitUntil: "networkidle0" }); await sleep(800);
  ok("a NEW tab opens for the child, locked", (await p2.evaluate(() => location.pathname)) === "/resume",
    await p2.evaluate(() => location.pathname));

  await p.screenshot({ path: path.join(OUT, "flow-end.png") });

  // ── The parent report, with Aarav's week (scenarios.json → "report") ──
  if (process.argv[5]) {
    const { scenarios } = JSON.parse(require("node:fs").readFileSync(process.argv[5], "utf8"));
    const r = await b.newPage();
    await r.setViewport({ width: 390, height: 844 });
    r.on("pageerror", (e) => errors.push(e.message));
    await r.evaluateOnNewDocument((seed) => {
      if (!sessionStorage.getItem("__report")) {
        localStorage.clear();
        for (const [k, v] of Object.entries(seed)) {
          if (k.startsWith("session:")) sessionStorage.setItem(k.slice(8), v);
          else localStorage.setItem(k, v);
        }
        sessionStorage.setItem("__report", "1");
      }
      // Download opens the print dialog; count it instead.
      window.print = () => { window.__printed = (window.__printed || 0) + 1; };
    }, scenarios.report);
    const q = () => r.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
    const rtext = () => r.evaluate(() => document.body.innerText);
    const press = async (sel) => {
      const done = await r.evaluate((sel) => {
        const el = sel.startsWith("text=")
          ? [...document.querySelectorAll("button")].find((e) => e.textContent.replace(/\s+/g, " ").trim().includes(sel.slice(5)))
          : document.querySelector(sel);
        if (!el) return false; el.click(); return true;
      }, sel);
      if (!done) throw new Error(`nothing to press for ${sel} at ${await r.evaluate(() => location.search)}`);
      await sleep(500);
    };
    const depth = () => r.evaluate(() => history.length);

    await r.goto(BASE + "/report?range=all", { waitUntil: "networkidle0" }); await sleep(900);
    ok("the parent report opens on Aarav's summary",
      (await rtext()).includes("Aarav") &&
      (await r.$$eval("h2", (h) => h.map((x) => x.textContent))).filter((t) => ["Letters", "Skills", "Practice", "Mix-ups"].includes(t)).length === 4,
      (await rtext()).slice(0, 160));
    await press('button[aria-label="Letters: open"]');
    ok("a card opens its section, in the address", (await q()).view === "letters", JSON.stringify(await q()));
    await press('button[aria-label^="क · learned"]');
    ok("a letter opens its view: view=letter:क", (await q()).view === "letter:क", JSON.stringify(await q()));
    ok("…over the whole history", (await rtext()).includes("The whole history"));
    await r.goBack({ waitUntil: "networkidle0" }); await sleep(500);
    ok("the phone's back button goes up a level", (await q()).view === "letters", JSON.stringify(await q()));
    await press("text=Summary");
    ok("the report's own ‹ goes up too", (await q()).view === undefined && (await q()).range === "all", JSON.stringify(await q()));
    const before = await depth();
    await press('button[aria-pressed="false"]');
    ok("changing the period changes the address…", (await q()).range === "week", JSON.stringify(await q()));
    ok("…without a history entry to step back through", (await depth()) === before, `${before} → ${await depth()}`);

    await r.goto(BASE + "/report?range=all&view=" + encodeURIComponent("pair:क-ख"), { waitUntil: "networkidle0" }); await sleep(900);
    ok("a deep link opens a pair", (await rtext()).includes("Which way round") && (await rtext()).includes("mix-ups in all"));
    await r.reload({ waitUntil: "networkidle0" }); await sleep(900);
    ok("and survives a reload", (await q()).view === "pair:क-ख" && (await rtext()).includes("Which way round"), JSON.stringify(await q()));
    await r.goto(BASE + "/report?range=all&view=skill:sound", { waitUntil: "networkidle0" }); await sleep(900);
    ok("a skill by address, with its letters", (await rtext()).includes("Sound → letter") && (await rtext()).includes("By letter"));
    await r.goto(BASE + "/report?range=all&view=nonsense", { waitUntil: "networkidle0" }); await sleep(900);
    ok("a view that does not exist shows the summary", (await rtext()).includes("Mix-ups") && !(await rtext()).includes("‹ Summary"));

    await press("text=Download"); await sleep(900);
    ok("Download lays out the document and opens printing once",
      (await r.evaluate(() => window.__printed)) === 1 && (await rtext()).includes("Aarav: practice report"));
    await r.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await sleep(400);
    ok("…then the report comes back", (await rtext()).includes("Download") && !(await rtext()).includes("Back to the report"));
    await r.screenshot({ path: path.join(OUT, "flow-report.png") });
  } else {
    console.log("  (no scenarios file: the report walk is skipped)");
  }
  ok("no runtime errors along the way", errors.length === 0, errors.join(" | "));
  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("  ✗ flow broke:", e.message); process.exit(1); });
