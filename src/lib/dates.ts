const dateFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"long",day:"numeric"});
const dateTimeFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
export function formatHebrewDate(iso:string):string{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);if(!match)return iso;return dateFormatter.format(new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),12)));}
export function formatHebrewDateTime(value:string):string{const normalized=value.includes("T")?value:`${value.replace(" ","T")}Z`;const date=new Date(normalized);return Number.isNaN(date.getTime())?value:dateTimeFormatter.format(date);}
export function jerusalemDate(now=new Date()):string{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);const value=(type:string)=>parts.find(part=>part.type===type)?.value;if(!value("year")||!value("month")||!value("day"))throw new Error("לא ניתן לחשב תאריך מקומי");return `${value("year")}-${value("month")}-${value("day")}`;}
export function nextJerusalemMonth(now=new Date()):{start:string;end:string}{const today=jerusalemDate(now),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));return {start:new Date(Date.UTC(year,month,1)).toISOString().slice(0,10),end:new Date(Date.UTC(year,month+1,1)).toISOString().slice(0,10)};}
export const AVAILABILITY_WINDOW_DAYS=60;
export function availabilityWindow(now=new Date()):{start:string;end:string}{
 const today=jerusalemDate(now);
 const [year,month,day]=today.split("-").map(Number) as [number,number,number];
 const start=new Date(Date.UTC(year,month-1,day+1)).toISOString().slice(0,10);
 return {start,end:new Date(Date.UTC(year,month-1,day+1+AVAILABILITY_WINDOW_DAYS)).toISOString().slice(0,10)};
}
export function monthEditableDates(year:number,month:number,window:{start:string;end:string}):string[]{
 const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
 const dates:string[]=[];
 for(let day=1;day<=daysInMonth;day++){
  const date=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  if(date>=window.start && date<window.end) dates.push(date);
 }
 return dates;
}
export function shiftMonthKey(key:string,delta:number):string{
 const [year,month]=key.split("-").map(Number) as [number,number];
 const target=new Date(Date.UTC(year,month-1+delta,1));
 return `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,"0")}`;
}
