export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { applyStartupPresets } = await import("./lib/presets");
  // Don't block server start — this can take minutes if the C100s are still booting.
  applyStartupPresets().catch((err) => console.error("[startup] failed:", err));
}
