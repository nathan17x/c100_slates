import { newId, normalizeHost, updateState } from "@/lib/store";
import { DEFAULT_COLORSPACE, DEFAULT_STANDARD, PLAYER_COUNT, type Device } from "@/lib/video";

export async function POST(req: Request) {
  const body = (await req.json()) as { host?: string; name?: string };
  const host = normalizeHost(body.host ?? "");
  if (!host) return Response.json({ error: "Invalid IP address or host" }, { status: 400 });

  const device: Device = {
    id: newId(),
    name: body.name?.trim() || new URL(host).hostname,
    host,
    standard: DEFAULT_STANDARD,
    colorspace: DEFAULT_COLORSPACE,
    slots: Array(PLAYER_COUNT).fill(null),
  };
  await updateState((s) => {
    s.devices.push(device);
  });
  return Response.json(device);
}
