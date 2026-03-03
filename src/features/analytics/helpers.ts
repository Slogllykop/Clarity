export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
  return `${hours.toFixed(1)}h`;
}
