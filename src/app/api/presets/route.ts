import { parseEntries } from "@/lib/presets";
import { newId, updateState } from "@/lib/store";
import type { Preset } from "@/lib/video";

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; entries?: unknown; applyOnStartup?: boolean };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  const entries = parseEntries(body.entries ?? []);
  if (!entries) return Response.json({ error: "Invalid players" }, { status: 400 });

  const now = new Date().toISOString();
  const preset: Preset = {
    id: newId(),
    name,
    entries,
    applyOnStartup: !!body.applyOnStartup,
    createdAt: now,
    updatedAt: now,
  };
  await updateState((s) => {
    s.presets.push(preset);
  });
  return Response.json(preset);
}
