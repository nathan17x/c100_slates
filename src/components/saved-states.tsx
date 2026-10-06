"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ImageOff, Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PLAYER_COUNT,
  type AppState,
  type Device,
  type ImageInfo,
  type Preset,
  type PresetEntry,
} from "@/lib/video";

export type PresetDraft = {
  id?: string;
  name: string;
  entries: PresetEntry[];
  applyOnStartup: boolean;
};

const players = Array.from({ length: PLAYER_COUNT }, (_, i) => i);

/** The image a player is currently showing, if the last send succeeded. */
function liveImageId(device: Device, handler: number) {
  const slot = device.slots[handler];
  return slot?.status === "ok" ? slot.imageId : undefined;
}

export function SavedStates({
  state,
  sending,
  onSave,
  onApply,
  onToggleStartup,
  onDelete,
}: {
  state: AppState;
  sending: Map<string, string>;
  onSave: (draft: PresetDraft) => Promise<void>;
  onApply: (preset: Preset) => Promise<void>;
  onToggleStartup: (id: string, on: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<PresetDraft | null>(null);

  if (draft) {
    return (
      <PresetEditor
        initial={draft}
        state={state}
        onCancel={() => setDraft(null)}
        onSave={async (d) => {
          await onSave(d);
          setDraft(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          A saved state remembers which image is on each chosen player, so you can put them all back
          in one click.
        </p>
        <Button
          onClick={() => setDraft({ name: "", entries: [], applyOnStartup: false })}
          disabled={state.devices.length === 0}
        >
          <Plus />
          New saved state
        </Button>
      </div>

      {state.presets.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {state.devices.length === 0
            ? "Add a C100 on the Players tab first."
            : "No saved states yet. Send images to some players, then save them here."}
        </div>
      )}

      {state.presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          state={state}
          applying={preset.entries.some((e) => sending.has(`${e.deviceId}:${e.handler}`))}
          onApply={() => onApply(preset)}
          onEdit={() =>
            setDraft({
              id: preset.id,
              name: preset.name,
              entries: preset.entries,
              applyOnStartup: preset.applyOnStartup,
            })
          }
          onToggleStartup={(on) => onToggleStartup(preset.id, on)}
          onDelete={() => onDelete(preset.id)}
        />
      ))}
    </div>
  );
}

function Thumb({
  image,
  missing,
  className,
}: {
  image?: ImageInfo;
  missing?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-md border bg-black/40",
        missing && "border-red-500/60",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${image.id}?thumb`}
          alt={image.name}
          draggable={false}
          className="size-full object-cover"
        />
      ) : missing ? (
        <div className="flex size-full items-center justify-center text-red-400">
          <ImageOff className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

function PresetCard({
  preset,
  state,
  applying,
  onApply,
  onEdit,
  onToggleStartup,
  onDelete,
}: {
  preset: Preset;
  state: AppState;
  applying: boolean;
  onApply: () => void;
  onEdit: () => void;
  onToggleStartup: (on: boolean) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const devices = state.devices.filter((d) => preset.entries.some((e) => e.deviceId === d.id));
  const missingImages = preset.entries.filter((e) => !state.images.some((i) => i.id === e.imageId));
  const last = preset.lastApplied;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{preset.name}</CardTitle>
        <div className="text-xs text-muted-foreground">
          {preset.entries.length} player{preset.entries.length === 1 ? "" : "s"} on {devices.length}{" "}
          C100{devices.length === 1 ? "" : "s"}
          {missingImages.length > 0 && (
            <span className="text-red-400">
              {" "}
              · {missingImages.length} image{missingImages.length === 1 ? "" : "s"} deleted
            </span>
          )}
        </div>
        <CardAction className="flex items-center gap-1.5">
          <Button size="sm" onClick={onApply} disabled={applying || preset.entries.length === 0}>
            {applying ? <Loader2 className="animate-spin" /> : <Play />}
            Apply
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit">
            <Pencil />
          </Button>
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size={confirmDelete ? "sm" : "icon-sm"}
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            aria-label="Delete"
          >
            <Trash2 />
            {confirmDelete && "Delete?"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {devices.map((device) => (
          <div key={device.id} className="flex flex-col gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">{device.name}</div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {players.map((h) => {
                const entry = preset.entries.find(
                  (e) => e.deviceId === device.id && e.handler === h,
                );
                const image = entry && state.images.find((i) => i.id === entry.imageId);
                return (
                  <Tooltip key={h}>
                    <TooltipTrigger
                      render={
                        <div className={cn("relative", !entry && "opacity-30")}>
                          <Thumb image={image} missing={!!entry && !image} />
                          <span className="absolute top-1 left-1 rounded bg-black/70 px-1 font-mono text-[9px] text-white/90">
                            {h + 1}
                          </span>
                        </div>
                      }
                    />
                    <TooltipContent>
                      Player {h + 1}:{" "}
                      {!entry ? "not included" : image ? image.name : "image was deleted"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2.5">
          <Checkbox checked={preset.applyOnStartup} onCheckedChange={(c) => onToggleStartup(!!c)} />
          Apply this state when the container restarts
        </label>
        {last && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    "text-xs",
                    last.failed ? "text-red-400" : "text-muted-foreground",
                  )}
                />
              }
            >
              Last applied {timeAgo(last.at)} · {last.ok} ok
              {last.failed > 0 && `, ${last.failed} failed`}
            </TooltipTrigger>
            {last.errors.length > 0 && (
              <TooltipContent className="max-w-sm whitespace-pre-line">
                {last.errors.join("\n")}
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </CardFooter>
    </Card>
  );
}

function PresetEditor({
  initial,
  state,
  onCancel,
  onSave,
}: {
  initial: PresetDraft;
  state: AppState;
  onCancel: () => void;
  onSave: (draft: PresetDraft) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [applyOnStartup, setApplyOnStartup] = useState(initial.applyOnStartup);
  const [entries, setEntries] = useState<PresetEntry[]>(initial.entries);
  const [saving, setSaving] = useState(false);

  const find = (deviceId: string, handler: number) =>
    entries.find((e) => e.deviceId === deviceId && e.handler === handler);
  const imageById = (id?: string) => state.images.find((i) => i.id === id);

  const toggle = (device: Device, handler: number) => {
    if (find(device.id, handler)) {
      setEntries((es) => es.filter((e) => !(e.deviceId === device.id && e.handler === handler)));
      return;
    }
    const imageId = liveImageId(device, handler);
    if (imageId && imageById(imageId)) {
      setEntries((es) => [...es, { deviceId: device.id, handler, imageId }]);
    }
  };

  const setAll = (device: Device, on: boolean) =>
    setEntries((es) => {
      const others = es.filter((e) => e.deviceId !== device.id);
      if (!on) return others;
      const mine = players.flatMap((h) => {
        const existing = es.find((e) => e.deviceId === device.id && e.handler === h);
        if (existing) return [existing];
        const imageId = liveImageId(device, h);
        return imageId && imageById(imageId) ? [{ deviceId: device.id, handler: h, imageId }] : [];
      });
      return [...others, ...mine];
    });

  // Re-snapshot every selected player from what it's currently showing.
  const recapture = () =>
    setEntries((es) =>
      es.map((e) => {
        const device = state.devices.find((d) => d.id === e.deviceId);
        const live = device && liveImageId(device, e.handler);
        return live && imageById(live) ? { ...e, imageId: live } : e;
      }),
    );

  const changed = entries.some((e) => {
    const device = state.devices.find((d) => d.id === e.deviceId);
    const live = device && liveImageId(device, e.handler);
    return live && live !== e.imageId;
  });

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await onSave({ id: initial.id, name: name.trim(), entries, applyOnStartup });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preset-name" className="text-xs font-medium text-muted-foreground">
            {initial.id ? "Edit saved state" : "New saved state"}
          </label>
          <Input
            id="preset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Game day ISOs"
            className="w-72"
            autoFocus
            required
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {changed && (
            <Button type="button" variant="outline" onClick={recapture}>
              Use what&apos;s on the players now
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim() || entries.length === 0}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Save
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Click players to include them. Each player saves the image it is currently showing. Players
        with nothing sent to them can&apos;t be selected.
      </p>

      {state.devices.map((device) => {
        const selectedCount = entries.filter((e) => e.deviceId === device.id).length;
        return (
          <Card key={device.id} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {device.name}
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  {new URL(device.host).host}
                </span>
              </CardTitle>
              <CardAction className="flex items-center gap-1">
                <span className="mr-2 text-xs text-muted-foreground">{selectedCount} selected</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAll(device, true)}>
                  All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAll(device, false)}>
                  None
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {players.map((h) => {
                  const entry = find(device.id, h);
                  const liveId = liveImageId(device, h);
                  const live = imageById(liveId);
                  const saved = entry && imageById(entry.imageId);
                  const shown = entry ? saved : live;
                  const selectable = !!entry || !!live;
                  return (
                    <div key={h} className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={!selectable}
                        onClick={() => toggle(device, h)}
                        className={cn(
                          "relative rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          entry ? "ring-2 ring-primary" : "opacity-50 hover:opacity-80",
                          !selectable && "cursor-not-allowed opacity-25 hover:opacity-25",
                        )}
                      >
                        <Thumb image={shown} missing={!!entry && !saved} className="rounded-lg" />
                        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90">
                          {h + 1}
                        </span>
                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-[4px] border",
                            entry
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/40 bg-black/60",
                          )}
                        >
                          {entry && <Check className="size-3" />}
                        </span>
                      </button>
                      <div className="truncate px-0.5 text-xs">
                        {entry ? (
                          saved ? (
                            <span>{saved.name}</span>
                          ) : (
                            <span className="text-red-400">Image was deleted</span>
                          )
                        ) : live ? (
                          <span className="text-muted-foreground">{live.name}</span>
                        ) : (
                          <span className="text-muted-foreground/50">Empty</span>
                        )}
                      </div>
                      {entry && live && live.id !== entry.imageId && (
                        <div className="-mt-1 truncate px-0.5 text-[11px] text-amber-400/80">
                          Now showing: {live.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <Checkbox checked={applyOnStartup} onCheckedChange={(c) => setApplyOnStartup(!!c)} />
        Apply this state when the container restarts
      </label>
    </form>
  );
}
