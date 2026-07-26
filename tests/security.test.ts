import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, createSessionToken, hashToken, safeReturnPath } from "@/lib/security";
import { availabilitySchema, userCreateSchema, shiftSchema } from "@/lib/schemas";
import { jerusalemDate,nextJerusalemMonth } from "@/lib/dates";
import { requestBodyIssue } from "@/lib/http";

describe("אבטחה", () => {
  it("גיבוב סיסמה אינו שומר טקסט גלוי", async () => { const h=await hashPassword("Strong!Pass123"); expect(h).not.toContain("Strong!Pass123"); expect(await verifyPassword("Strong!Pass123",h)).toBe(true); });
  it("אסימון הפעלה אקראי ובמסד נשמר רק גיבוב", () => { const a=createSessionToken(); const b=createSessionToken(); expect(a).not.toBe(b); expect(a.length).toBeGreaterThan(40); expect(hashToken(a)).not.toBe(a); });
  it("מונע הפניה פתוחה", () => { expect(safeReturnPath("https://evil.example")).toBe("/"); expect(safeReturnPath("//evil.example")).toBe("/"); expect(safeReturnPath("/admin/shifts")).toBe("/admin/shifts"); });
  it("דוחה שדות לא מוכרים והזרקה המונית", () => { expect(() => userCreateSchema.parse({name:"שם",email:"a@b.co",phone:"0500000000",role:"PICKER",password:"Strong!Pass123",active:true,isSuperuser:true})).toThrow(); });
  it("דוחה תאריך לוח שנה שאינו קיים",()=>{expect(()=>availabilitySchema.parse({date:"2026-02-30",status:"AVAILABLE"})).toThrow("תאריך אינו תקין");});
  it("דוחה כמויות שליליות", () => { expect(() => shiftSchema.parse({date:"2026-08-10",slot:"MORNING",seasonId:1,pickerIds:[1],leaderId:1,vehicleIds:[],goal:-1,notes:""})).toThrow(); });
  it("מחשב יום וחודש לפי ירושלים גם בגבול UTC",()=>{const instant=new Date("2026-07-31T21:30:00Z");expect(jerusalemDate(instant)).toBe("2026-08-01");expect(nextJerusalemMonth(instant)).toEqual({start:"2026-09-01",end:"2026-10-01"});});
  it("דוחה גוף ללא אורך, גוף גדול וסוג תוכן שגוי לפני פענוח",()=>{const allowed=["application/json"] as const;expect(requestBodyIssue(new Request("http://local"),100,allowed)?.status).toBe(413);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"101","content-type":"application/json"}}),100,allowed)?.status).toBe(413);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"2","content-type":"text/plain"}}),100,allowed)?.status).toBe(415);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"2","content-type":"application/json; charset=utf-8"}}),100,allowed)).toBeUndefined();});
});
