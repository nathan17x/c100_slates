"use client";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ImageInfo } from "@/lib/video";

export function ImagePickerDialog({
  open,
  onOpenChange,
  title,
  images,
  currentId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  images: ImageInfo[];
  currentId?: string;
  onPick: (imageId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {images.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No images yet — upload some in the library on the right.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-0.5 sm:grid-cols-3">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onPick(img.id)}
                className={cn(
                  "group flex flex-col gap-1.5 rounded-lg p-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  img.id === currentId && "bg-muted",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images/${img.id}?thumb`}
                  alt={img.name}
                  className="aspect-video w-full rounded-md border bg-black object-cover"
                />
                <span className="truncate px-0.5 text-xs">{img.name}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
