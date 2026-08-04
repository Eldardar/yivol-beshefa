import { z } from "zod";

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
export const passwordChangeSchema=z.object({password:passwordSchema,confirmation:z.string()}).strict().refine(x=>x.password===x.confirmation,{message:"הסיסמאות אינן זהות",path:["confirmation"]});

export const availabilitySchema = z.object({
  date: isoDate,
  status: z.enum(["AVAILABLE", "MAYBE", "UNAVAILABLE"])
}).strict();
export const availabilityMonthSchema = z.object({
  entries: z.array(availabilitySchema).min(1)
}).strict();

export const shiftSchema = z.object({
  date: isoDate,
  slot: z.enum(["MORNING", "EVENING"]),
  seasonId: id,
  pickerIds: z.array(id).min(1).transform((items) => [...new Set(items)]),
  leaderId: id,
  vehicleIds: z.array(id).transform((items) => [...new Set(items)]),
  goal: z.coerce.number().finite().nonnegative(),
  notes: z.string().trim().max(4000)
}).strict();

export type ShiftInput = z.input<typeof shiftSchema>;

export const farmSchema=z.object({name:text(150),contactPerson:text(150),phone:text(30),address:text(300),navigationUrl:z.union([z.literal(""),z.string().url().refine(v=>/^https?:/.test(v))]).default(""),notes:z.string().trim().max(2000).default("")}).strict();
export const seasonSchema=z.object({farmId:id,crop:text(150),startDate:isoDate,endDate:isoDate,notes:z.string().trim().max(2000).default("")}).strict().refine(x=>x.startDate<=x.endDate,{message:"תאריך הסיום חייב להיות אחרי ההתחלה"});
export const vehicleSchema=z.object({number:text(50),name:text(150),notes:z.string().trim().max(2000).default("")}).strict();
