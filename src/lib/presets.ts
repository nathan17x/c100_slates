import { SendError, sendToPlayer } from "./send";
import { readState, updateState } from "./store";
import { PLAYER_COUNT, type ApplyResult, type Preset, type PresetEntry } from "./video";

const key = (e: { deviceId: string; handler: number }) => `${e.deviceId}:${e.handler}`;

/** Validate and de-duplicate entries from a request body (last one per player wins). */
export function parseEntries(input: unknown): PresetEntry[] | null {
  if (!Array.isArray(input)) return null;
  const byKey = new Map<string, PresetEntry>();
  for (const e of input) {
    if (
      typeof e?.deviceId !== "string" ||
      typeof e?.imageId !== "string" ||
      !Number.isInteger(e?.handler) ||
      e.handler < 0 ||
      e.handler >= PLAYER_COUNT
    ) {
      return null;
    }
    byKey.set(key(e), { deviceId: e.deviceId, handler: e.handler, imageId: e.imageId });
  }
  return [...byKey.values()];
}

type EntryOutcome = { ok: true } | { ok: false; error: string; retryable: boolean };

async function sendEntry(e: PresetEntry): Promise<EntryOutcome> {
  try {
    const slot = await sendToPlayer(e.deviceId, e.handler, e.imageId);
    return slot.status === "ok" ? { ok: true } : { ok: false, error: slot.error!, retryable: true };
  } catch (err) {
    const message = err instanceof SendError ? err.message : (err as Error).message;
    return { ok: false, error: message, retryable: false };
  }
}

async function describe(e: PresetEntry) {
  const state = await readState();
  const device = state.devices.find((d) => d.id === e.deviceId);
  return `${device?.name ?? "Unknown C100"} player ${e.handler + 1}`;
}

async function summarize(
  entries: PresetEntry[],
  outcomes: Map<string, EntryOutcome>,
): Promise<ApplyResult> {
  const errors: string[] = [];
  let ok = 0;
  for (const e of entries) {
    const o = outcomes.get(key(e));
    if (o?.ok) ok++;
    else if (o) errors.push(`${await describe(e)}: ${o.error}`);
  }
  return { at: new Date().toISOString(), ok, failed: entries.length - ok, errors };
}

async function recordResult(presetId: string, result: ApplyResult) {
  await updateState((s) => {
    const p = s.presets.find((p) => p.id === presetId);
    if (p) p.lastApplied = result;
  });
}

/** Send every image in a preset. Devices run in parallel; each device's players go in order. */
export async function applyPreset(presetId: string): Promise<ApplyResult | null> {
  const preset = (await readState()).presets.find((p) => p.id === presetId);
  if (!preset) return null;
  const outcomes = new Map<string, EntryOutcome>();
  await Promise.all(
    preset.entries.map(async (e) => outcomes.set(key(e), await sendEntry(e))),
  );
  const result = await summarize(preset.entries, outcomes);
  await recordResult(preset.id, result);
  return result;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// After a host reboot the C100s (or the network) may not be up yet, so keep retrying.
const RETRY_DELAYS_MS = [0, 10_000, 30_000, 60_000, 120_000, 300_000];

/** Apply every preset marked "apply on startup", retrying unreachable players. */
export async function applyStartupPresets(log = console) {
  const presets: Preset[] = (await readState()).presets.filter((p) => p.applyOnStartup);
  if (presets.length === 0) return;
  log.info(`[startup] applying ${presets.map((p) => `"${p.name}"`).join(", ")}`);

  // Merge in creation order; if presets overlap on a player, the later one wins.
  const merged = new Map<string, PresetEntry>();
  for (const p of presets) for (const e of p.entries) merged.set(key(e), e);

  const outcomes = new Map<string, EntryOutcome>();
  let pending = [...merged.values()];
  for (const delay of RETRY_DELAYS_MS) {
    if (pending.length === 0) break;
    if (delay) {
      log.info(`[startup] ${pending.length} player(s) failed, retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
    await Promise.all(pending.map(async (e) => outcomes.set(key(e), await sendEntry(e))));
    pending = pending.filter((e) => {
      const o = outcomes.get(key(e))!;
      return !o.ok && o.retryable;
    });
  }

  for (const p of presets) {
    const result = await summarize(p.entries, outcomes);
    await recordResult(p.id, result);
    log.info(`[startup] "${p.name}": ${result.ok} ok, ${result.failed} failed`);
    for (const err of result.errors) log.warn(`[startup]   ${err}`);
  }
}
