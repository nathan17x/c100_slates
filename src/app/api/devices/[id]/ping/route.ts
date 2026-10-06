import { readState } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/devices/[id]/ping">) {
  const { id } = await ctx.params;
  const device = (await readState()).devices.find((d) => d.id === id);
  if (!device) return Response.json({ online: false }, { status: 404 });
  try {
    await fetch(device.host, { method: "GET", signal: AbortSignal.timeout(3000) });
    return Response.json({ online: true });
  } catch {
    return Response.json({ online: false });
  }
}
