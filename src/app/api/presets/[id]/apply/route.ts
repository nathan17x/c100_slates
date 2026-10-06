import { applyPreset } from "@/lib/presets";

export async function POST(_req: Request, ctx: RouteContext<"/api/presets/[id]/apply">) {
  const { id } = await ctx.params;
  const result = await applyPreset(id);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(result);
}
