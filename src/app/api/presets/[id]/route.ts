import { parseEntries } from "@/lib/presets";
import { updateState } from "@/lib/store";

export async function PATCH(req: Request, ctx: RouteContext<"/api/presets/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { name?: string; entries?: unknown; applyOnStartup?: boolean };

  const entries = body.entries === undefined ? undefined : parseEntries(body.entries);
  if (entries === null) return Response.json({ error: "Invalid players" }, { status: 400 });
  if (body.name !== undefined && !body.name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const preset = await updateState((s) => {
    const p = s.presets.find((p) => p.id === id);
    if (!p) return null;
    if (body.name !== undefined) p.name = body.name.trim();
    if (entries) p.entries = entries;
    if (body.applyOnStartup !== undefined) p.applyOnStartup = !!body.applyOnStartup;
    p.updatedAt = new Date().toISOString();
    return p;
  });
  if (!preset) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(preset);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/presets/[id]">) {
  const { id } = await ctx.params;
  await updateState((s) => {
    s.presets = s.presets.filter((p) => p.id !== id);
  });
  return Response.json({ ok: true });
}
