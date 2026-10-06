import { promises as fs } from "fs";
import path from "path";
import type { AppState } from "./video";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const IMAGE_DIR = path.join(DATA_DIR, "images");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export function imagePath(id: string) {
  return path.join(IMAGE_DIR, `${id}.png`);
}
export function thumbPath(id: string) {
  return path.join(IMAGE_DIR, `${id}.thumb.webp`);
}

async function load(): Promise<AppState> {
  try {
    const state = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    return { devices: [], images: [], presets: [], ...state };
  } catch {
    return { devices: [], images: [], presets: [] };
  }
}

async function save(state: AppState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_FILE);
}

// Serialize all read-modify-write cycles so concurrent requests don't clobber each other.
// Kept on globalThis because route handlers and instrumentation are separate bundles.
const g = globalThis as unknown as { __stateChain?: Promise<unknown> };

export function readState(): Promise<AppState> {
  return load();
}

export function updateState<T>(fn: (state: AppState) => T | Promise<T>): Promise<T> {
  const run = (g.__stateChain ?? Promise.resolve()).then(async () => {
    const state = await load();
    const result = await fn(state);
    await save(state);
    return result;
  });
  g.__stateChain = run.catch(() => undefined);
  return run;
}

/** Normalize "192.168.1.50", "192.168.1.50:8080" or "http://192.168.1.50/" to a base URL. */
export function normalizeHost(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function newId() {
  return crypto.randomUUID().slice(0, 8);
}
