/**
 * Swaps `localStorage` and `sessionStorage` for in-memory copies.
 *
 * The lab is served from the same origin as the dev app, so without this the
 * fixtures would write over the guest child, sessions and PIN you play with
 * at localhost:5173. Each lab page — the workbench and every frame — gets its
 * own empty storage that vanishes on reload.
 *
 * Fails closed: if the browser refuses the swap, this throws and the lab does
 * not load, rather than running against real storage.
 */
class MemoryStorage {
  private data = new Map<string, string>();

  constructor(seed: Record<string, string>) {
    Object.entries(seed).forEach(([k, v]) => this.data.set(k, v));
  }
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(String(k), String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

export function isolateStorage(seed: Record<string, string> = {}): void {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    const store = new MemoryStorage(name === "localStorage" ? seed : {});
    Object.defineProperty(window, name, { value: store, configurable: true, enumerable: true });
    if ((window[name] as unknown) !== store) throw new Error(`Could not isolate ${name}`);
  }
}
