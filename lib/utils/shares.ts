export function formatShareDraft(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}
