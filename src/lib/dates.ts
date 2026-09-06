const dateFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"long",day:"numeric"});
const dateTimeFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
export function formatHebrewDate(iso:string):string{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);if(!match)return iso;return dateFormatter.format(new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),12)));}
export function formatHebrewDateTime(value:string):string{const normalized=value.includes("T")?value:`${value.replace(" ","T")}Z`;const date=new Date(normalized);return Number.isNaN(date.getTime())?value:dateTimeFormatter.format(date);}
export function jerusalemDate(now=new Date()):string{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);const value=(type:string)=>parts.find(part=>part.type===type)?.value;if(!value("year")||!value("month")||!value("day"))throw new Error("לא ניתן לחשב תאריך מקומי");return `${value("year")}-${value("month")}-${value("day")}`;}
export function jerusalemHour(now=new Date()):number{return Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jerusalem",hour:"2-digit",hourCycle:"h23"}).format(now));}
const jerusalemWallClockFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
function jerusalemWallClock(instant:Date):string{const parts=jerusalemWallClockFormatter.formatToParts(instant);const value=(type:string)=>parts.find(part=>part.type===type)?.value;return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;}
export function jerusalemInstant(date:string,time:string):Date{
 const target=`${date}T${time}:00`;
 let guess=new Date(`${target}Z`);
 for(let i=0;i<2;i++){const errorMs=Date.parse(`${target}Z`)-Date.parse(`${jerusalemWallClock(guess)}Z`);guess=new Date(guess.getTime()+errorMs);}
 return guess;
}
export function timeOfDayGreeting(hour:number):string{
 if(hour>=5&&hour<12) return "איך עובר עליך היום?";
 if(hour>=12&&hour<14) return "איך עובר עליך הצהריים?";
 if(hour>=14&&hour<18) return "איך עובר עליך אחר הצהריים?";
 if(hour>=18&&hour<22) return "איך עובר עליך הערב?";
 return "איך עובר עליך הלילה?";
}
export function timeOfDayWish(hour:number):string{
 if(hour>=5&&hour<12) return "שיהיה לך אחלה יום";
 if(hour>=12&&hour<14) return "שיהיה לך אחלה צהריים";
 if(hour>=14&&hour<18) return "שיהיה לך אחלה אחר צהריים";
 if(hour>=18&&hour<22) return "שיהיה לך אחלה ערב";
 return "שיהיה לך אחלה לילה";
}
export function nextJerusalemMonth(now=new Date()):{start:string;end:string}{const today=jerusalemDate(now),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));return {start:new Date(Date.UTC(year,month,1)).toISOString().slice(0,10),end:new Date(Date.UTC(year,month+1,1)).toISOString().slice(0,10)};}
export function currentJerusalemWeek(now=new Date()):{start:string;end:string}{
 const today=jerusalemDate(now);
 const [year,month,day]=today.split("-").map(Number) as [number,number,number];
 const dow=new Date(Date.UTC(year,month-1,day)).getUTCDay();
 return {start:new Date(Date.UTC(year,month-1,day-dow)).toISOString().slice(0,10),end:new Date(Date.UTC(year,month-1,day-dow+7)).toISOString().slice(0,10)};
}
export function monthRange(year:number,month:number):{start:string;end:string}{return {start:new Date(Date.UTC(year,month-1,1)).toISOString().slice(0,10),end:new Date(Date.UTC(year,month,1)).toISOString().slice(0,10)};}
export function currentJerusalemMonth(now=new Date()):{start:string;end:string}{const today=jerusalemDate(now);return monthRange(Number(today.slice(0,4)),Number(today.slice(5,7)));}
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
export const ADMIN_AVAILABILITY_DAYS=14;
export function adminAvailabilityWindow(now=new Date()):{start:string;end:string}{
 const today=jerusalemDate(now);
 const [year,month,day]=today.split("-").map(Number) as [number,number,number];
 return {start:today,end:new Date(Date.UTC(year,month-1,day+ADMIN_AVAILABILITY_DAYS)).toISOString().slice(0,10)};
}
export function shiftMonthKey(key:string,delta:number):string{
 const [year,month]=key.split("-").map(Number) as [number,number];
 const target=new Date(Date.UTC(year,month-1+delta,1));
 return `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,"0")}`;
}
