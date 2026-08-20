import { z } from "zod";
import { UNITS } from "@/lib/units";

export const unitSchema = z.enum(UNITS);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך אינו תקין").refine(value=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!match)return false;const year=Number(match[1]!),month=Number(match[2]!),day=Number(match[3]!);const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;},"תאריך אינו תקין");
const id = z.coerce.number().int().positive();
const text = (max: number) => z.string().trim().min(1).max(max);
export const passwordSchema=z.string().min(8,"הסיסמה חייבת להכיל לפחות 8 תווים").max(128).regex(/[a-z]/,"נדרשת אות קטנה באנגלית").regex(/[A-Z]/,"נדרשת אות גדולה באנגלית").regex(/\d/,"נדרשת ספרה").regex(/[^A-Za-z0-9]/,"נדרש תו מיוחד");
export const israeliIdSchema=z.string().trim().regex(/^\d{9}$/,"תעודת זהות אינה תקינה").refine(value=>value.split("").reduce((sum,digit,index)=>{const product=Number(digit)*(index%2===0?1:2);return sum+(product>9?product-9:product);},0)%10===0,"תעודת זהות אינה תקינה");

export const pickerCreateSchema = z.object({
  name: text(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: text(30),
  nationalId: israeliIdSchema,
  notes: z.string().trim().max(2000).default("")
}).strict();
export const userUpdateSchema = z.object({
  name: text(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: text(30),
  nationalId: z.union([z.literal(""), israeliIdSchema]).default(""),
  notes: z.string().trim().max(2000).default("")
}).strict();
export const passwordChangeSchema=z.object({password:passwordSchema,confirmation:z.string()}).strict().refine(x=>x.password===x.confirmation,{message:"הסיסמאות אינן זהות",path:["confirmation"]});
export const forgotPasswordSchema=z.object({email:z.string().trim().toLowerCase().email().max(254)}).strict();
export const resetPasswordSchema=z.object({token:z.string().min(1).max(512),password:passwordSchema,confirmation:z.string()}).strict().refine(x=>x.password===x.confirmation,{message:"הסיסמאות אינן זהות",path:["confirmation"]});
export const changePasswordSelfSchema=z.object({currentPassword:z.string().min(1).max(128),password:passwordSchema,confirmation:z.string()}).strict().refine(x=>x.password===x.confirmation,{message:"הסיסמאות אינן זהות",path:["confirmation"]});
export const personalDetailsSchema=z.object({dateOfBirth:z.union([isoDate,z.literal("")]).default(""),favoriteFruit:z.string().trim().max(100).default("")}).strict();

export const availabilitySchema = z.object({
  date: isoDate,
  status: z.enum(["AVAILABLE", "MAYBE", "UNAVAILABLE"]).nullable()
}).strict();
export const availabilityMonthSchema = z.object({
  entries: z.array(availabilitySchema).min(1)
}).strict();
export const adminAvailabilityUpdateSchema = z.object({
  userId: id,
  entries: z.array(availabilitySchema).min(1)
}).strict();

const goalLineSchema = z.object({ unit: unitSchema, goal: z.coerce.number().finite().nonnegative() }).strict();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה אינה תקינה");

export const shiftReportSchema = z.object({
  startHour: timeSchema,
  endHour: timeSchema,
  teamLeaderDetails: z.string().trim().max(2000)
}).strict();

export const shiftSchema = z.object({
  date: isoDate,
  slot: z.enum(["MORNING", "EVENING", "PRE_DAWN"]),
  plantationFieldId: id,
  pickerIds: z.array(id).min(1).transform((items) => [...new Set(items)]),
  leaderId: id,
  vehicleIds: z.array(id).transform((items) => [...new Set(items)]),
  goals: z.array(goalLineSchema).min(1).refine((items) => new Set(items.map((x) => x.unit)).size === items.length, "כל יחידת מידה יכולה להופיע פעם אחת ביעד"),
  notes: z.string().trim().max(4000)
}).strict();

export type ShiftInput = z.input<typeof shiftSchema>;

export const farmSchema=z.object({name:text(150),contactPerson:text(150),phone:text(30),address:text(300),navigationUrl:z.union([z.literal(""),z.string().url().refine(v=>/^https?:/.test(v))]).default(""),notes:z.string().trim().max(2000).default("")}).strict();
export const plantationFieldSchema=z.object({farmId:id,name:text(150),fruitType:text(150),fruitSubtype:text(150),size:z.union([z.literal(""),z.coerce.number().positive()]).optional().default("").transform(v=>v===""?null:v),location:z.string().trim().max(300).default(""),details:z.string().trim().max(2000).default("")}).strict();
export const vehicleSchema=z.object({number:text(50),name:text(150),notes:z.string().trim().max(2000).default("")}).strict();
