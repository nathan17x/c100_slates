"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeviceEditDialog } from "@/components/device-edit-dialog";
import { PlayerSlot } from "@/components/player-slot";
import {
  COLORSPACES,
  STANDARDS,
  standardLabel,
  type Device,
  type ImageInfo,
} from "@/lib/video";

const standardItems = STANDARDS.map((s) => ({ value: s, label: standardLabel(s) }));
const colorspaceItems = COLORSPACES.map((c) => ({ value: c, label: c }));

function useOnline(deviceId: string, host: string) {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch(`/api/devices/${deviceId}/ping`)
        .then((r) => r.json())
        .then((d) => !cancelled && setOnline(!!d.online))
        .catch(() => !cancelled && setOnline(false));
    check();
    const t = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [deviceId, host]);
  return online;
}

export function DeviceCard({
  device,
  images,
  sending,
  onSend,
  onUpdate,
  onRemove,
}: {
  device: Device;
  images: ImageInfo[];
  sending: Map<string, string>;
  onSend: (deviceId: string, handler: number, imageId: string) => void;
  onUpdate: (patch: Partial<Device>) => void;
  onRemove: () => void;
}) {
  const online = useOnline(device.id, device.host);
  const pending = (i: number) => sending.get(`${device.id}:${i}`);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    online === null && "bg-muted-foreground/40",
                    online === true && "bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60",
                    online === false && "bg-red-500",
                  )}
                />
              }
            />
            <TooltipContent>
              {online === null ? "Checking…" : online ? "Reachable" : "Unreachable"}
            </TooltipContent>
          </Tooltip>
          <span className="truncate">{device.name}</span>
          <Badge variant="secondary" className="font-mono font-normal">
            {new URL(device.host).host}
          </Badge>
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          <Select
            items={standardItems}
            value={device.standard}
            onValueChange={(v) => v && onUpdate({ standard: v })}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {standardItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={colorspaceItems}
            value={device.colorspace}
            onValueChange={(v) => v && onUpdate({ colorspace: v })}
          >
            <SelectTrigger size="sm" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorspaceItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Edit">
            <Pencil />
          </Button>
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size={confirmDelete ? "sm" : "icon-sm"}
            onClick={() => (confirmDelete ? onRemove() : setConfirmDelete(true))}
            aria-label="Remove"
          >
            <Trash2 />
            {confirmDelete && "Remove?"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {device.slots.map((slot, i) => (
            <PlayerSlot
              key={i}
              index={i}
              slot={slot}
              image={images.find((img) => img.id === (pending(i) ?? slot?.imageId))}
              images={images}
              busy={pending(i) !== undefined}
              onSend={(imageId) => onSend(device.id, i, imageId)}
            />
          ))}
        </div>
      </CardContent>
      <DeviceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        device={device}
        onSave={onUpdate}
      />
    </Card>
  );
}
