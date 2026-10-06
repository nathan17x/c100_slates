import sharp from "sharp";
import { resolutionFor, type Colorspace, type Standard } from "./video";

// Ported from upload_batch.js — converts an image into the Lawo/Arkona BID
// frame format (JSON header + packed 10-bit YCbCr) for the delay handlers.

function getMatrix(cs: Colorspace): number[] {
  switch (cs) {
    case "BT601":
      return [
        +0.255785137, +0.502160192, +0.097523436, -0.147643909, -0.289856106, +0.4375, +0.43749997,
        -0.366351664, -0.071148358,
      ];
    case "BT709":
      return [
        +0.181787118, +0.612002313, +0.061679296, -0.100192644, -0.337307364, +0.4375, +0.4375,
        -0.397444427, -0.040055554,
      ];
    case "BT2020":
    case "BT2100":
      return [
        +0.224732, +0.58001, +0.0507278, -0.122176, -0.315325, +0.4375, +0.4375, -0.402314,
        -0.0351865,
      ];
  }
}

function roundClamp(v: number, min: number, max: number) {
  const r = Math.round(v);
  return r < min ? min : r > max ? max : r;
}

function isInterlaced(std: Standard) {
  return /^HD1080(i|sF)/.test(std);
}

/**
 * Convert an arbitrary image to a BID buffer. The image is letterboxed onto
 * black at the resolution implied by `standard`, and alpha is flattened.
 */
export async function imageToBid(
  input: Buffer,
  standard: Standard,
  colorspace: Colorspace,
  hostname: string,
): Promise<Buffer> {
  const { width, height } = resolutionFor(standard);

  const { data: rgb } = await sharp(input)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const m = getMatrix(colorspace).map((v) => (v * 1024.0) / 255.0);

  const d = new Date();
  const interlace = isInterlaced(standard);
  const hdr = {
    Date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
    Time: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`,
    Interlace: interlace,
    Blanking: false,
    Hostname: hostname,
    Frames: 1,
    HTotal: 2640,
    VTotal: 1125,
    HActive: width,
    VActive: height,
    Standard: standard,
  };

  const json = JSON.stringify(hdr);
  const jsonExtra = 8 - (json.length % 8);
  const headerLen = json.length + jsonExtra;
  const lineLen = (width / 2) * 5;
  const lineStride = (lineLen + 63) & -64;
  const buf = Buffer.alloc(headerLen + lineStride * height);
  buf.write(json, 0, "latin1");

  // 4:4:4 source, packed as 4:2:2 (every other chroma sample), 10-bit,
  // 5 bytes per pixel pair: Cb, Y0, Cr, Y1.
  for (let y = 0; y < height; ++y) {
    const yDst = interlace ? (y & 1) * (height >> 1) + (y >> 1) : y;
    let o = headerLen + yDst * lineStride;
    let s = y * width * 3;
    for (let x = 0; x < width; x += 2) {
      const r0 = rgb[s], g0 = rgb[s + 1], b0 = rgb[s + 2];
      const r1 = rgb[s + 3], g1 = rgb[s + 4], b1 = rgb[s + 5];
      s += 6;

      const y0 = roundClamp(m[0] * r0 + m[1] * g0 + m[2] * b0, 0, 876) + 64;
      const y1 = roundClamp(m[0] * r1 + m[1] * g1 + m[2] * b1, 0, 876) + 64;
      const cb = roundClamp(m[3] * r0 + m[4] * g0 + m[5] * b0, -448, 448) + 512;
      const cr = roundClamp(m[6] * r0 + m[7] * g0 + m[8] * b0, -448, 448) + 512;

      buf[o] = cb & 0xff;
      buf[o + 1] = ((cb >> 8) & 0x03) | ((y0 << 2) & 0xfc);
      buf[o + 2] = ((y0 >> 6) & 0x0f) | ((cr << 4) & 0xf0);
      buf[o + 3] = ((cr >> 4) & 0x3f) | ((y1 << 6) & 0xc0);
      buf[o + 4] = (y1 >> 2) & 0xff;
      o += 5;
    }
  }
  return buf;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  404: "DMA failed",
  412: "Precondition failed",
  413: "Payload too large, try to allocate more frames",
  415: "Unsupported media type",
};

export async function uploadFrame(baseUrl: string, handler: number, frame: Buffer) {
  const url = new URL("/delayhandler/video", baseUrl);
  url.searchParams.set("action", "write");
  url.searchParams.set("handler", String(handler));
  url.searchParams.set("store", "frame");

  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(frame),
    signal: AbortSignal.timeout(30_000),
  });
  await res.arrayBuffer().catch(() => undefined);
  if (res.status >= 400) {
    throw new Error(`${res.status} ${STATUS_MESSAGES[res.status] ?? res.statusText}`);
  }
}
