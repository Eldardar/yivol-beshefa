import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, createSessionToken, hashToken, safeReturnPath } from "@/lib/security";
import { availabilitySchema, israeliIdSchema, passwordSchema, pickerCreateSchema, shiftSchema } from "@/lib/schemas";
import { jerusalemDate,nextJerusalemMonth } from "@/lib/dates";
import { requestBodyIssue, requestUrl } from "@/lib/http";
import { maskNationalId } from "@/lib/privacy";

describe("אבטחה", () => {
  it("גיבוב סיסמה אינו שומר טקסט גלוי", async () => { const h=await hashPassword("Strong!Pass123"); expect(h).not.toContain("Strong!Pass123"); expect(await verifyPassword("Strong!Pass123",h)).toBe(true); });
  it("מקבל סיסמה בת שמונה תווים ודוחה שבעה",()=>{expect(passwordSchema.parse("Aa1!bcde")).toBe("Aa1!bcde");expect(()=>passwordSchema.parse("Aa1!bcd")).toThrow("לפחות 8 תווים");});
  it("אסימון הפעלה אקראי ובמסד נשמר רק גיבוב", () => { const a=createSessionToken(); const b=createSessionToken(); expect(a).not.toBe(b); expect(a.length).toBeGreaterThan(40); expect(hashToken(a)).not.toBe(a); });
  it("מונע הפניה פתוחה", () => { expect(safeReturnPath("https://evil.example")).toBe("/"); expect(safeReturnPath("//evil.example")).toBe("/"); expect(safeReturnPath("/admin/shifts")).toBe("/admin/shifts"); });
  it("מאמת תעודת זהות ישראלית בת תשע ספרות",()=>{expect(israeliIdSchema.parse("316250257")).toBe("316250257");expect(()=>israeliIdSchema.parse("316250258")).toThrow("תעודת זהות אינה תקינה");expect(()=>israeliIdSchema.parse("123")).toThrow("תעודת זהות אינה תקינה");});
  it("ממסך תעודת זהות בתצוגה",()=>{expect(maskNationalId("316250257")).toBe("•••••0257");});
  it("דורש תעודת זהות ביצירת קוטף ודוחה שדות תפקיד והרשאות",()=>{const input={name:"שם",email:"a@b.co",phone:"0500000000",nationalId:"316250257",notes:""};expect(pickerCreateSchema.parse(input)).toEqual(input);expect(()=>pickerCreateSchema.parse({...input,role:"ADMIN"})).toThrow();expect(()=>pickerCreateSchema.parse({name:input.name,email:input.email,phone:input.phone,notes:input.notes})).toThrow();});
  it("דוחה תאריך לוח שנה שאינו קיים",()=>{expect(()=>availabilitySchema.parse({date:"2026-02-30",status:"AVAILABLE"})).toThrow("תאריך אינו תקין");});
  it("דוחה כמויות שליליות", () => { expect(() => shiftSchema.parse({date:"2026-08-10",slot:"MORNING",seasonId:1,pickerIds:[1],leaderId:1,vehicleIds:[],goal:-1,notes:""})).toThrow(); });
  it("מחשב יום וחודש לפי ירושלים גם בגבול UTC",()=>{const instant=new Date("2026-07-31T21:30:00Z");expect(jerusalemDate(instant)).toBe("2026-08-01");expect(nextJerusalemMonth(instant)).toEqual({start:"2026-09-01",end:"2026-10-01"});});
  it("דוחה גוף ללא אורך, גוף גדול וסוג תוכן שגוי לפני פענוח",()=>{const allowed=["application/json"] as const;expect(requestBodyIssue(new Request("http://local"),100,allowed)?.status).toBe(413);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"101","content-type":"application/json"}}),100,allowed)?.status).toBe(413);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"2","content-type":"text/plain"}}),100,allowed)?.status).toBe(415);expect(requestBodyIssue(new Request("http://local",{headers:{"content-length":"2","content-type":"application/json; charset=utf-8"}}),100,allowed)).toBeUndefined();});
  it("משתמש במקור ציבורי מפורש להפניות מאחורי פרוקסי ודוחה מקור לא בטוח",()=>{const previous=process.env.PUBLIC_ORIGIN;try{delete process.env.PUBLIC_ORIGIN;const req=new Request("http://127.0.0.1:3100/api/login");expect(requestUrl("/",req).href).toBe("http://127.0.0.1:3100/");process.env.PUBLIC_ORIGIN="https://demo.example";expect(requestUrl("/login",req).href).toBe("https://demo.example/login");for(const invalid of ["javascript:alert(1)","https://user:pass@demo.example","https://demo.example/path","https://demo.example?query=1","https://demo.example#fragment"]){process.env.PUBLIC_ORIGIN=invalid;expect(()=>requestUrl("/",req)).toThrow("PUBLIC_ORIGIN");}}finally{if(previous===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=previous;}});
});
