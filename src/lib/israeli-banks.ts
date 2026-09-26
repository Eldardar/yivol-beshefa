import { ISRAELI_BANKS } from "@/lib/israeli-banks-data";

export type Bank = (typeof ISRAELI_BANKS)[number];
export type Branch = { number: number; name: string; city: string };

export const BANKS: readonly Bank[] = ISRAELI_BANKS;

export function findBank(number: string | number): Bank | undefined {
  const code = Number(number);
  return BANKS.find(b => b.code === code);
}

export function bankBranches(bank: Bank): Branch[] {
  return bank.branches.map(([number, name, city]) => ({ number, name, city }));
}

export function findBranch(bankNumber: string | number, branchNumber: string | number): Branch | undefined {
  const bank = findBank(bankNumber);
  const code = Number(branchNumber);
  const hit = bank?.branches.find(b => b[0] === code);
  return hit && { number: hit[0], name: hit[1], city: hit[2] };
}

const normalize = (s: string) => s.replace(/["'׳״\-]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Matches a query against a number and free-text names; exact number matches rank first. */
function rank(query: string, number: number, texts: string[]): number {
  const q = normalize(query);
  if (!q) return 3;
  if (/^\d+$/.test(q)) {
    const n = String(number);
    return n === String(Number(q)) ? 0 : n.startsWith(q) ? 1 : -1;
  }
  const hay = texts.map(normalize);
  if (hay.some(t => t.startsWith(q) || t.includes(` ${q}`))) return 1;
  return hay.some(t => t.includes(q)) ? 2 : -1;
}

export function searchBanks(query: string): Bank[] {
  return BANKS.map(b => ({ b, r: rank(query, b.code, [b.name]) }))
    .filter(x => x.r >= 0)
    .sort((x, y) => x.r - y.r || x.b.code - y.b.code)
    .map(x => x.b);
}

export function searchBranches(bank: Bank, query: string, limit = 50): Branch[] {
  return bankBranches(bank)
    .map(b => ({ b, r: rank(query, b.number, [b.name, b.city]) }))
    .filter(x => x.r >= 0)
    .sort((x, y) => x.r - y.r || x.b.number - y.b.number)
    .slice(0, limit)
    .map(x => x.b);
}
