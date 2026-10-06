"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ImageInfo } from "@/lib/video";

export const DRAG_TYPE = "application/x-slate-image";

export function ImageLibrary({
  images,
  onUpload,
  onRemove,
}: {
  images: ImageInfo[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(true);
    try {
      await onUpload(list);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(false);
        upload(e.dataTransfer.files);
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-5">
        <h2 className="text-sm font-medium">
          Images <span className="ml-1 text-muted-foreground">{images.length}</span>
        </h2>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div
          className={cn(
            "rounded-xl border border-dashed transition-colors",
            dragOver && "border-primary bg-primary/5",
            images.length > 0 ? "p-2" : "p-0",
          )}
        >
          {images.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 py-16 text-sm text-muted-foreground"
            >
              <Upload className="size-6" />
              Drop images here or click to upload
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <ImageTile key={img.id} image={img} onRemove={() => onRemove(img.id)} />
              ))}
            </div>
          )}
        </div>
        {images.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Drag an image onto a player, or click a player to choose.
          </p>
        )}
      </div>
    </div>
  );
}

function ImageTile({ image, onRemove }: { image: ImageInfo; onRemove: () => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, image.id);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-lg border bg-card active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/images/${image.id}?thumb`}
        alt={image.name}
        draggable={false}
        className="aspect-video w-full bg-black object-cover"
      />
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs" title={image.name}>
          {image.name}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {image.width}×{image.height}
        </span>
      </div>
      <Button
        variant="destructive"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Delete ${image.name}`}
        className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
