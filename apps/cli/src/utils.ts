export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce(
      (max, row) => Math.max(max, (row[i] ?? "").length),
      0
    );
    return Math.max(h.length, maxDataWidth);
  });

  const separator = colWidths.map((w) => "-".repeat(w + 2)).join("+");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell ?? "").padEnd(colWidths[i])} `).join("|");

  console.log(formatRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function parseJsonArg(arg: string): unknown {
  try {
    return JSON.parse(arg);
  } catch {
    throw new Error(`Invalid JSON argument: ${arg}`);
  }
}
