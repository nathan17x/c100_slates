import { promises as fs } from "fs";
import { imageToBid, uploadFrame } from "./bid";
import { imagePath, readState, updateState } from "./store";
import { PLAYER_COUNT, type SlotState } from "./video";

// One upload at a time per device — the delay handler doesn't like parallel writes.
// Kept on globalThis so route handlers and the startup task share the same queues.
const g = globalThis as unknown as { __deviceQueues?: Map<string, Promise<unknown>> };
const deviceQueues = (g.__deviceQueues ??= new Map());

function enqueue<T>(deviceId: string, task: () => Promise<T>): Promise<T> {
  const prev = deviceQueues.get(deviceId) ?? Promise.resolve();
  const run = prev.then(task, task);
  deviceQueues.set(deviceId, run.catch(() => undefined));
  return run;
}

export class SendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Encode an image and upload it to one player, recording the result on the device's slot. */
export async function sendToPlayer(
  deviceId: string,
  handler: number,
  imageId: string,
): Promise<SlotState> {
  if (!Number.isInteger(handler) || handler < 0 || handler >= PLAYER_COUNT) {
    throw new SendError("Invalid player", 400);
  }
  const state = await readState();
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) throw new SendError("C100 no longer exists", 404);
  const image = state.images.find((i) => i.id === imageId);
  if (!image) throw new SendError("Image no longer exists", 404);

  let slot: SlotState;
  try {
    await enqueue(device.id, async () => {
      const png = await fs.readFile(imagePath(image.id));
      const frame = await imageToBid(png, device.standard, device.colorspace, device.host);
      await uploadFrame(device.host, handler, frame);
    });
    slot = { imageId, imageName: image.name, sentAt: new Date().toISOString(), status: "ok" };
  } catch (err) {
    const e = err as Error;
    const message =
      e.name === "TimeoutError" ? "Timed out" : (e.cause as Error | undefined)?.message || e.message;
    slot = {
      imageId,
      imageName: image.name,
      sentAt: new Date().toISOString(),
      status: "error",
      error: message,
    };
  }

  await updateState((s) => {
    const d = s.devices.find((d) => d.id === deviceId);
    if (d) d.slots[handler] = slot;
  });
  return slot;
}
