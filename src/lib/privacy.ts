export function maskNationalId(value: string): string {
  return `•••••${value.slice(-4)}`;
}
