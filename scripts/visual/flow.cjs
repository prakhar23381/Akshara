// Drive the whole account journey by clicking, as a new parent would:
// sign in as a guest, choose a role, set a PIN (with a deliberate mismatch),
// add a child, hand the device over, try to get back without the PIN, unlock,
// open the child's report, reload, and open a second tab.
//   node flow.cjs <puppeteer-core dir> <out dir> <base url>
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
  ok("the report is Kiran's (empty: nothing played yet)", (await text()).includes("No sessions recorded yet"), (await text()).slice(0, 120));
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
  ok("no runtime errors along the way", errors.length === 0, errors.join(" | "));
  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("  ✗ flow broke:", e.message); process.exit(1); });
