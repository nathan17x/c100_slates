import { normalizeHost, updateState } from "@/lib/store";
import { COLORSPACES, STANDARDS, type Colorspace, type Standard } from "@/lib/video";

export async function PATCH(req: Request, ctx: RouteContext<"/api/devices/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<{
    name: string;
    host: string;
    standard: string;
    colorspace: string;
  }>;

  let host: string | null | undefined;
  if (body.host !== undefined) {
    host = normalizeHost(body.host);
    if (!host) return Response.json({ error: "Invalid IP address or host" }, { status: 400 });
  }
  if (body.standard && !STANDARDS.includes(body.standard as Standard)) {
    return Response.json({ error: "Unknown standard" }, { status: 400 });
  }
  if (body.colorspace && !COLORSPACES.includes(body.colorspace as Colorspace)) {
    return Response.json({ error: "Unknown colorspace" }, { status: 400 });
  }

  const device = await updateState((s) => {
    const d = s.devices.find((d) => d.id === id);
    if (!d) return null;
    if (body.name?.trim()) d.name = body.name.trim();
    if (host) d.host = host;
    if (body.standard) d.standard = body.standard as Standard;
    if (body.colorspace) d.colorspace = body.colorspace as Colorspace;
    return d;
  });
  if (!device) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(device);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/devices/[id]">) {
  const { id } = await ctx.params;
  await updateState((s) => {
    s.devices = s.devices.filter((d) => d.id !== id);
    for (const p of s.presets) p.entries = p.entries.filter((e) => e.deviceId !== id);
  });
  return Response.json({ ok: true });
}
