import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { PickerService } from "@/lib/services/picker";
import { findBank, findBranch, searchBanks, searchBranches } from "@/lib/israeli-banks";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function picker() {
  return Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1)").run("קוטף", "p@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
}

describe("רשימת בנקים וסניפים", () => {
  it("מוצא בנק לפי מספר או שם", () => {
    expect(findBank("12")?.name).toContain("הפועלים");
    expect(searchBanks("12")[0]?.code).toBe(12);
    expect(searchBanks("לאומי")[0]?.code).toBe(10);
    expect(searchBanks("מזרחי").map(b => b.code)).toContain(20);
  });
  it("מוצא סניף לפי מספר, שם או עיר", () => {
    const leumi = findBank(10)!;
    expect(leumi.branches.length).toBeGreaterThan(100);
    const first = leumi.branches[0]!;
    expect(searchBranches(leumi, String(first[0]))[0]?.number).toBe(first[0]);
    expect(searchBranches(leumi, "ירושלים").length).toBeGreaterThan(0);
    expect(findBranch(10, first[0])?.name).toBe(first[1]);
  });
});

describe("פרטי חשבון בנק", () => {
  it("שומר פרטים וממלא שמות רשמיים של בנק וסניף", () => {
    const id = picker(), service = new PickerService(db);
    const branch = findBank(12)!.branches[0]!;
    service.updateBankDetails(id, { accountHolder: "ישראל ישראלי", bankNumber: "12", bankName: "x", branchNumber: String(branch[0]), branchName: "x", accountNumber: "123-456" });
    const saved = service.bankDetails(id)!;
    expect(saved).toMatchObject({ accountHolder: "ישראל ישראלי", bankNumber: "12", branchNumber: String(branch[0]), accountNumber: "123456" });
    expect(saved.bankName).toContain("הפועלים");
    expect(saved.branchName).toContain(branch[1]);
  });
  it("דורש את כל השדות אם אחד מולא", () => {
    const id = picker(), service = new PickerService(db);
    expect(() => service.updateBankDetails(id, { accountHolder: "", bankNumber: "12", branchNumber: "", accountNumber: "" })).toThrow();
    expect(() => service.updateBankDetails(id, { accountHolder: "א", bankNumber: "12", branchNumber: "1", accountNumber: "12ab" })).toThrow();
  });
  it("מאפשר לנקות את כל הפרטים", () => {
    const id = picker(), service = new PickerService(db);
    service.updateBankDetails(id, { accountHolder: "א", bankNumber: "12", branchNumber: "9999", branchName: "סניף ידני", accountNumber: "1" });
    expect(service.bankDetails(id)?.branchName).toBe("סניף ידני");
    service.updateBankDetails(id, {});
    expect(service.bankDetails(id)).toMatchObject({ accountHolder: "", bankNumber: "", bankName: "", branchNumber: "", accountNumber: "" });
  });
});
