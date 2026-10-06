import { promises as fs } from "fs";
import sharp from "sharp";
import { IMAGE_DIR, imagePath, newId, thumbPath, updateState } from "@/lib/store";
import type { ImageInfo } from "@/lib/video";

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "No files" }, { status: 400 });

  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const added: ImageInfo[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const id = newId();
      const input = Buffer.from(await file.arrayBuffer());
      // Normalize everything to PNG so the encoder always gets the same input.
      const png = await sharp(input).rotate().png().toBuffer({ resolveWithObject: true });
      await fs.writeFile(imagePath(id), png.data);
      await sharp(png.data)
        .resize(480, 270, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
        .webp({ quality: 80 })
        .toFile(thumbPath(id));
      added.push({
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        width: png.info.width,
        height: png.info.height,
        size: png.data.length,
        createdAt: new Date().toISOString(),
      });
    } catch {
      errors.push(`${file.name}: not a supported image`);
    }
  }

  await updateState((s) => {
    s.images.push(...added);
  });
  return Response.json({ added, errors });
}
