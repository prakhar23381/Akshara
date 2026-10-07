/**
 * Minimal test runner.
 *
 * The project has no test framework, and pulling one in for a handful of pure
 * logic checks would weigh more than the checks themselves. This bundles each
 * tests/*.test.ts with esbuild (already a dependency via vite) and runs it under
 * node with the few browser globals those modules touch.
 *
 *   npm test
 */
import { execFileSync } from "node:child_process";
import { readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const files = readdirSync("tests").filter((f) => f.endsWith(".test.ts"));
if (files.length === 0) {
  console.log("no tests found");
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "akshara-tests-"));
let failed = 0;

for (const file of files) {
  const out = join(dir, file.replace(/\.ts$/, ".cjs"));
  const shim = join(dir, file.replace(/\.ts$/, ".shim.cjs"));

  execFileSync(
    "./node_modules/.bin/esbuild",
    [
      `tests/${file}`,
      "--bundle",
      "--format=cjs",
      "--platform=node",
      `--outfile=${out}`,
      "--log-level=error",
      "--define:import.meta.env.VITE_API_URL=undefined",
      '--define:import.meta.env.VITE_SUPABASE_URL=""',
      '--define:import.meta.env.VITE_SUPABASE_KEY=""',
    ],
    { stdio: "inherit" },
  );

  const shimSource = [
    "const store = new Map();",
    "globalThis.localStorage = {",
    "  getItem: (k) => (store.has(k) ? store.get(k) : null),",
    "  setItem: (k, v) => store.set(k, String(v)),",
    "  removeItem: (k) => store.delete(k),",
    "};",
    'globalThis.window = { location: { hostname: "test.local" }, addEventListener() {} };',
    `require(${JSON.stringify(out)});`,
  ].join("\n");
  writeFileSync(shim, shimSource);

  console.log(`\n=== ${file} ===`);
  try {
    execFileSync("node", [shim], { stdio: "inherit" });
  } catch {
    failed += 1;
  }
}

rmSync(dir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} test file(s) failed`);
  process.exit(1);
}
console.log("\nall test files passed");
