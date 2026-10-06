import { promises as fs } from "fs";
import { imagePath, readState, thumbPath, updateState } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  const thumb = new URL(req.url).searchParams.has("thumb");
  const exists = (await readState()).images.some((i) => i.id === id);
  if (!exists) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(thumb ? thumbPath(id) : imagePath(id));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": thumb ? "image/webp" : "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  await updateState((s) => {
    s.images = s.images.filter((i) => i.id !== id);
  });
  await Promise.all([fs.rm(imagePath(id), { force: true }), fs.rm(thumbPath(id), { force: true })]);
  return Response.json({ ok: true });
}
