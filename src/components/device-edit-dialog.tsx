"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Device } from "@/lib/video";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  onSave: (patch: Partial<Device>) => void;
};

export function DeviceEditDialog({ open, onOpenChange, device, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit C100</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so the fields reset from `device` each time. */}
        <EditForm device={device} onSave={onSave} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  device,
  onSave,
  onDone,
}: {
  device: Device;
  onSave: (patch: Partial<Device>) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(device.name);
  const [host, setHost] = useState(new URL(device.host).host);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, host });
        onDone();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`name-${device.id}`}>Name</Label>
        <Input id={`name-${device.id}`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`host-${device.id}`}>IP address</Label>
        <Input
          id={`host-${device.id}`}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="font-mono"
        />
      </div>
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
