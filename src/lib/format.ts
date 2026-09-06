export function formatMoney(value: number): string {
  return `₪${value.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}
