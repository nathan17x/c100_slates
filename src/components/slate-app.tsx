"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MonitorPlay } from "lucide-react";
import { AddDeviceForm } from "@/components/add-device-form";
import { DeviceCard } from "@/components/device-card";
import { ImageLibrary } from "@/components/image-library";
import { SavedStates, type PresetDraft } from "@/components/saved-states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppState, ApplyResult, Device, ImageInfo, Preset, SlotState } from "@/lib/video";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(res.status === 502 && "status" in data)) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

type Tab = "players" | "states";

// The active tab lives in the URL hash so a reload keeps you on the same tab.
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const useTab = () =>
  useSyncExternalStore(
    subscribeHash,
    (): Tab => (window.location.hash === "#states" ? "states" : "players"),
    (): Tab => "players",
  );

export function SlateApp() {
  const [state, setState] = useState<AppState | null>(null);
  // "deviceId:handler" → imageId currently being sent
  const [sending, setSending] = useState<Map<string, string>>(new Map());
  const tab = useTab();

  const reload = useCallback(
    () =>
      api<AppState>("/api/state")
        .then(setState)
        .catch((e) => toast.error(`Failed to load: ${e.message}`)),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const changeTab = (t: Tab) => {
    history.replaceState(null, "", t === "states" ? "#states" : window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const markSending = (keys: [string, string][], on: boolean) =>
    setSending((s) => {
      const next = new Map(s);
      for (const [k, imageId] of keys) {
        if (on) next.set(k, imageId);
        else next.delete(k);
      }
      return next;
    });

  const setDevice = (device: Device) =>
    setState((s) => s && { ...s, devices: s.devices.map((d) => (d.id === device.id ? device : d)) });

  const addDevice = async (host: string, name: string) => {
    const device = await api<Device>("/api/devices", { method: "POST", ...json({ host, name }) });
    setState((s) => s && { ...s, devices: [...s.devices, device] });
  };

  const updateDevice = async (id: string, patch: Partial<Device>) => {
    try {
      setDevice(await api<Device>(`/api/devices/${id}`, { method: "PATCH", ...json(patch) }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeDevice = async (id: string) => {
    await api(`/api/devices/${id}`, { method: "DELETE" });
    await reload(); // also prunes this device from saved states
  };

  const uploadImages = async (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    try {
      const { added, errors } = await api<{ added: ImageInfo[]; errors: string[] }>(
        "/api/images",
        { method: "POST", body: form },
      );
      setState((s) => s && { ...s, images: [...s.images, ...added] });
      errors.forEach((e) => toast.error(e));
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    }
  };

  const removeImage = async (id: string) => {
    await api(`/api/images/${id}`, { method: "DELETE" });
    setState((s) => s && { ...s, images: s.images.filter((i) => i.id !== id) });
  };

  const send = useCallback(async (deviceId: string, handler: number, imageId: string) => {
    const key = `${deviceId}:${handler}`;
    markSending([[key, imageId]], true);
    try {
      const slot = await api<SlotState>("/api/send", {
        method: "POST",
        ...json({ deviceId, handler, imageId }),
      });
      setState((s) => {
        if (!s) return s;
        return {
          ...s,
          devices: s.devices.map((d) =>
            d.id === deviceId ? { ...d, slots: d.slots.map((x, i) => (i === handler ? slot : x)) } : d,
          ),
        };
      });
      if (slot.status === "error") toast.error(`Player ${handler + 1}: ${slot.error}`);
    } catch (e) {
      toast.error(`Player ${handler + 1}: ${(e as Error).message}`);
    } finally {
      markSending([[key, imageId]], false);
    }
  }, []);

  const setPreset = (preset: Preset) =>
    setState((s) => {
      if (!s) return s;
      const exists = s.presets.some((p) => p.id === preset.id);
      return {
        ...s,
        presets: exists
          ? s.presets.map((p) => (p.id === preset.id ? preset : p))
          : [...s.presets, preset],
      };
    });

  const savePreset = async ({ id, ...body }: PresetDraft) => {
    const preset = id
      ? await api<Preset>(`/api/presets/${id}`, { method: "PATCH", ...json(body) })
      : await api<Preset>("/api/presets", { method: "POST", ...json(body) });
    setPreset(preset);
    toast.success(`Saved “${preset.name}”`);
  };

  const togglePresetStartup = async (id: string, applyOnStartup: boolean) => {
    try {
      setPreset(await api<Preset>(`/api/presets/${id}`, { method: "PATCH", ...json({ applyOnStartup }) }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deletePreset = async (id: string) => {
    await api(`/api/presets/${id}`, { method: "DELETE" });
    setState((s) => s && { ...s, presets: s.presets.filter((p) => p.id !== id) });
  };

  const applyPreset = async (preset: Preset) => {
    const keys = preset.entries.map(
      (e) => [`${e.deviceId}:${e.handler}`, e.imageId] as [string, string],
    );
    markSending(keys, true);
    try {
      const result = await api<ApplyResult>(`/api/presets/${preset.id}/apply`, { method: "POST" });
      if (result.failed === 0) toast.success(`Applied “${preset.name}” to ${result.ok} players`);
      else
        toast.error(`“${preset.name}”: ${result.failed} of ${result.ok + result.failed} failed`, {
          description: result.errors.slice(0, 4).join("\n"),
        });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      markSending(keys, false);
      await reload();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b px-5">
        <div className="flex items-center gap-2.5">
          <MonitorPlay className="size-5 text-muted-foreground" />
          <h1 className="font-semibold tracking-tight">C100 Slates</h1>
        </div>
        <Tabs value={tab} onValueChange={(v) => changeTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="players" className="px-3">
              Players
            </TabsTrigger>
            <TabsTrigger value="states" className="px-3">
              Saved states
              {!!state?.presets.length && (
                <span className="text-xs text-muted-foreground">{state.presets.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {tab === "players" ? (
        <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <AddDeviceForm onAdd={addDevice} />
            {state && state.devices.length === 0 && (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Add a C100 by IP address to get started.
              </div>
            )}
            {state?.devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                images={state.images}
                sending={sending}
                onSend={send}
                onUpdate={(patch) => updateDevice(device.id, patch)}
                onRemove={() => removeDevice(device.id)}
              />
            ))}
          </section>

          <aside className="flex min-h-0 flex-col border-t lg:w-[400px] lg:border-t-0 lg:border-l xl:w-[460px]">
            <ImageLibrary
              images={state?.images ?? []}
              onUpload={uploadImages}
              onRemove={removeImage}
            />
          </aside>
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          {state && (
            <SavedStates
              state={state}
              sending={sending}
              onSave={savePreset}
              onApply={applyPreset}
              onToggleStartup={togglePresetStartup}
              onDelete={deletePreset}
            />
          )}
        </main>
      )}
    </div>
  );
}
