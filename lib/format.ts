const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-07-31" -> "31 Jul 2026" (no Date objects, so server and client always agree)
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// "2024-01-01" -> "Jan 2024"
export function formatMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// "2024-H2" -> "2024 H2"
export const formatHalf = (h: string) => h.replace("-", " ");

export const formatNumber = (n: number) => n.toLocaleString("en-GB");
