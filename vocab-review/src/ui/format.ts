export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function describeLevel(metadata: Record<string, unknown>): string | null {
  const system = typeof metadata.hsk_system === "string" ? metadata.hsk_system : null;
  const level = metadata.hsk_level;
  if (!system || level === undefined || level === null) return null;
  return `${system} · ${String(level).replace("-", "–")}`;
}
