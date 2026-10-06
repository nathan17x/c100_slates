import { SendError, sendToPlayer } from "@/lib/send";

export async function POST(req: Request) {
  const { deviceId, handler, imageId } = (await req.json()) as {
    deviceId: string;
    handler: number;
    imageId: string;
  };
  try {
    const slot = await sendToPlayer(deviceId, handler, imageId);
    return Response.json(slot, { status: slot.status === "ok" ? 200 : 502 });
  } catch (e) {
    if (e instanceof SendError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
