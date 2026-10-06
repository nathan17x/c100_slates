export const STANDARDS = [
  "HD1080p59_94",
  "HD1080p60",
  "HD1080p50",
  "HD1080p29_97",
  "HD1080p30",
  "HD1080p25",
  "HD1080p24",
  "HD1080p23_98",
  "HD1080i59_94",
  "HD1080i60",
  "HD1080i50",
  "HD720p59_94",
  "HD720p60",
  "HD720p50",
  "HD2160p59_94",
  "HD2160p60",
  "HD2160p50",
] as const;
export type Standard = (typeof STANDARDS)[number];

export const COLORSPACES = ["BT2020", "BT2100", "BT709", "BT601"] as const;
export type Colorspace = (typeof COLORSPACES)[number];

export const DEFAULT_STANDARD: Standard = "HD1080p59_94";
export const DEFAULT_COLORSPACE: Colorspace = "BT2020";
export const PLAYER_COUNT = 8;

export function resolutionFor(std: Standard) {
  if (std.startsWith("HD720")) return { width: 1280, height: 720 };
  if (std.startsWith("HD2160")) return { width: 3840, height: 2160 };
  return { width: 1920, height: 1080 };
}

/** "HD1080p59_94" → "1080p 59.94" */
export function standardLabel(std: Standard) {
  return std.replace(/^HD/, "").replace(/(\d+)([pi]|sF)/, "$1$2 ").replace("_", ".");
}

export type SlotState = {
  imageId: string;
  imageName: string;
  sentAt: string;
  status: "ok" | "error";
  error?: string;
};

export type Device = {
  id: string;
  name: string;
  host: string;
  standard: Standard;
  colorspace: Colorspace;
  slots: (SlotState | null)[];
};

export type ImageInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  size: number;
  createdAt: string;
};

export type PresetEntry = {
  deviceId: string;
  handler: number;
  imageId: string;
};

export type ApplyResult = {
  at: string;
  ok: number;
  failed: number;
  errors: string[];
};

export type Preset = {
  id: string;
  name: string;
  entries: PresetEntry[];
  applyOnStartup: boolean;
  createdAt: string;
  updatedAt: string;
  lastApplied?: ApplyResult;
};

export type AppState = {
  devices: Device[];
  images: ImageInfo[];
  presets: Preset[];
};
