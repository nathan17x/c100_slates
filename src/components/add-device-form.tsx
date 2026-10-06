"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddDeviceForm({ onAdd }: { onAdd: (host: string, name: string) => Promise<void> }) {
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;
    setBusy(true);
    try {
      await onAdd(host, name);
      setHost("");
      setName("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <Input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        placeholder="IP address, e.g. 192.168.1.50"
        className="w-64 font-mono"
        required
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        className="w-48"
      />
      <Button type="submit" disabled={busy || !host.trim()}>
        <Plus />
        Add C100
      </Button>
    </form>
  );
}
