const PREFIX = "pdfbuddy:tool:";

export function loadToolSettings(toolId: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(PREFIX + toolId);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function saveToolSettings(toolId: string, values: Record<string, string>) {
  try {
    localStorage.setItem(PREFIX + toolId, JSON.stringify(values));
  } catch {
    // localStorage can be unavailable (private browsing, quota) — not worth failing the tool over
  }
}
