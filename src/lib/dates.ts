const dateFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"long",day:"numeric"});
const dateTimeFormatter=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
export function formatHebrewDate(iso:string):string{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);if(!match)return iso;return dateFormatter.format(new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),12)));}
export function formatHebrewDateTime(value:string):string{const normalized=value.includes("T")?value:`${value.replace(" ","T")}Z`;const date=new Date(normalized);return Number.isNaN(date.getTime())?value:dateTimeFormatter.format(date);}
