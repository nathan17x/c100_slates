"use client";

import { useState } from "react";
import { AlertTriangle, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImagePickerDialog } from "@/components/image-picker-dialog";
import { DRAG_TYPE } from "@/components/image-library";
import { timeAgo } from "@/lib/time";
import type { ImageInfo, SlotState } from "@/lib/video";

export function PlayerSlot({
  index,
  slot,
  image,
  images,
  busy,
  onSend,
}: {
  index: number;
  slot: SlotState | null;
  image: ImageInfo | undefined;
  images: ImageInfo[];
  busy: boolean;
  onSend: (imageId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const failed = slot?.status === "error";

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData(DRAG_TYPE);
          if (id) onSend(id);
        }}
        className={cn(
          "group relative aspect-video w-full overflow-hidden rounded-lg border bg-black/40 transition-all outline-none",
          "hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50",
          !busy && failed && "border-red-500/60",
          dragOver && "scale-[1.03] border-primary ring-3 ring-primary/40",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/images/${image.id}?thumb`}
            alt={image.name}
            className={cn("size-full object-cover", (busy || failed) && "opacity-40")}
            draggable={false}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
            <ImagePlus className="size-5" />
          </div>
        )}

        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90">
          {index + 1}
        </span>

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
        {!busy && failed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="size-6 text-red-400" />
          </div>
        )}
      </button>

      <div className="flex min-h-4 items-center justify-between gap-2 px-0.5 text-xs">
        {slot ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn("truncate", failed ? "text-red-400" : "text-muted-foreground")}
                />
              }
            >
              {slot.imageName}
            </TooltipTrigger>
            <TooltipContent>
              {failed ? `Failed: ${slot.error}` : `Sent ${timeAgo(slot.sentAt)}`}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/50">Player {index + 1}</span>
        )}
      </div>

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={`Send to player ${index + 1}`}
        images={images}
        currentId={slot?.status === "ok" ? slot.imageId : undefined}
        onPick={(id) => {
          setPickerOpen(false);
          onSend(id);
        }}
      />
    </div>
  );
}
