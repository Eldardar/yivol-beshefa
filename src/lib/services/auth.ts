import type Database from "better-sqlite3";
import { createSessionToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from "@/lib/security";
import { timingSafeEqual } from "node:crypto";

const GENERIC_ERROR="פרטי ההתחברות שגויים";
const LIMIT=5,MAX_IN_FLIGHT=8,WINDOW_MS=15*60_000,MAX_KEYS=10_000;
type Attempts={failures:number;inFlight:number;resetAt:number};
type LimitKey={key:string;failureLimit:number;inFlightLimit:number;clearOnSuccess:boolean;trackFailures?:boolean};
const attempts=new Map<string,Attempts>();
let dummyHashPromise:Promise<string>|undefined;
export type SessionUser={id:number;email:string;name:string;role:"ADMIN"|"PICKER";mustChangePassword:boolean};
const globalKdfKey=():LimitKey=>({key:"global",failureLimit:Number.POSITIVE_INFINITY,inFlightLimit:MAX_IN_FLIGHT,clearOnSuccess:false,trackFailures:false});

function pruneAttempts(now:number){for(const [key,value] of attempts)if(value.resetAt<=now&&value.inFlight===0)attempts.delete(key);}
function current(key:string,now:number):Attempts{const value=attempts.get(key);return !value||value.resetAt<=now?{failures:0,inFlight:value?.inFlight??0,resetAt:now+WINDOW_MS}:value;}
function reserve(keys:LimitKey[],now:number):void{
 pruneAttempts(now);const target=new Set(keys.map(x=>x.key));
 for(const item of keys){const value=current(item.key,now);if(value.failures+value.inFlight>=item.failureLimit||value.inFlight>=item.inFlightLimit)throw new Error("ניסיונות רבים מדי, נסו שוב מאוחר יותר");}
 const missing=keys.filter(item=>!attempts.has(item.key)).length;
 while(attempts.size+missing>MAX_KEYS){const candidate=[...attempts].find(([key,value])=>!target.has(key)&&value.inFlight===0)?.[0];if(!candidate)throw new Error("ניסיונות רבים מדי, נסו שוב מאוחר יותר");attempts.delete(candidate);}
 for(const item of keys){const value=current(item.key,now);attempts.delete(item.key);attempts.set(item.key,{...value,inFlight:value.inFlight+1});}
}
function finish(keys:LimitKey[],failed:boolean):void{for(const item of keys){const value=attempts.get(item.key);if(!value)continue;const next={...value,inFlight:Math.max(0,value.inFlight-1),failures:failed&&item.trackFailures!==false?value.failures+1:!failed&&item.clearOnSuccess?0:value.failures};attempts.delete(item.key);if(next.inFlight>0||next.failures>0)attempts.set(item.key,next);}}

export class AuthService{
 constructor(private readonly db:Database.Database){}
 private getDummyHash(){dummyHashPromise??=hashPassword(createSessionToken());return dummyHashPromise;}
 async login(emailRaw:string,password:string,ip?:string):Promise<{token:string;csrf:string;expires:string;user:SessionUser}>{
  const now=Date.now(),email=normalizeEmail(emailRaw);const keys:LimitKey[]=[{key:`account:${email}`,failureLimit:LIMIT,inFlightLimit:LIMIT,clearOnSuccess:true},...(ip?[{key:`ip:${ip}`,failureLimit:LIMIT,inFlightLimit:LIMIT,clearOnSuccess:false}]:[]),globalKdfKey()];reserve(keys,now);let succeeded=false;
  try{
   if(email.length<3||email.length>254||password.length<1||password.length>256)throw new Error(GENERIC_ERROR);
   const row=this.db.prepare("SELECT id,email,name,role,password_hash,active,must_change_password FROM users WHERE email=?").get(email) as {id:number;email:string;name:string;role:"ADMIN"|"PICKER";password_hash:string;active:number;must_change_password:number}|undefined;
   const valid=await verifyPassword(password,row?.password_hash??await this.getDummyHash());
   if(!row||!row.active||!valid)throw new Error(GENERIC_ERROR);
   const token=createSessionToken(),csrf=createSessionToken(),expires=new Date(now+7*24*60*60_000).toISOString();
   this.db.transaction(()=>{this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date(now).toISOString());this.db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(row.id,hashToken(token),expires,hashToken(csrf));})();succeeded=true;
   return {token,csrf,expires,user:{id:row.id,email:row.email,name:row.name,role:row.role,mustChangePassword:Boolean(row.must_change_password)}};
  }finally{finish(keys,!succeeded);}
 }
 authenticate(token:string|undefined):SessionUser|undefined{if(!token)return undefined;const row=this.db.prepare(`SELECT u.id,u.email,u.name,u.role,u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).get(hashToken(token),new Date().toISOString()) as {id:number;email:string;name:string;role:"ADMIN"|"PICKER";must_change_password:number}|undefined;return row?{id:row.id,email:row.email,name:row.name,role:row.role,mustChangePassword:Boolean(row.must_change_password)}:undefined;}
 assertCsrf(token:string,csrf:string):void{const row=this.db.prepare("SELECT csrf_hash FROM sessions WHERE token_hash=? AND expires_at>?").get(hashToken(token),new Date().toISOString()) as {csrf_hash:string}|undefined;const supplied=Buffer.from(hashToken(csrf),"hex"),expected=row?Buffer.from(row.csrf_hash,"hex"):Buffer.alloc(32);if(!row||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error("בקשה לא תקינה");}
 async changePassword(userId:number,password:string):Promise<void>{const keys=[globalKdfKey()];reserve(keys,Date.now());try{const row=this.db.prepare("SELECT password_hash FROM users WHERE id=? AND active=1").get(userId) as {password_hash:string}|undefined;if(!row)throw new Error("המשתמש לא נמצא");if(await verifyPassword(password,row.password_hash))throw new Error("הסיסמה החדשה חייבת להיות שונה מהסיסמה הזמנית");const hash=await hashPassword(password);this.db.transaction(()=>{const result=this.db.prepare("UPDATE users SET password_hash=?,must_change_password=0 WHERE id=? AND active=1 AND password_hash=?").run(hash,userId,row.password_hash);if(result.changes!==1)throw new Error("הסיסמה השתנתה, יש לנסות שוב");this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(userId,"PASSWORD_CHANGE","USER",userId);}).immediate();}finally{finish(keys,false);}}
 async changePasswordSelf(userId:number,currentPassword:string,newPassword:string):Promise<void>{const keys=[globalKdfKey()];reserve(keys,Date.now());let succeeded=false;try{const row=this.db.prepare("SELECT password_hash FROM users WHERE id=? AND active=1").get(userId) as {password_hash:string}|undefined;if(!row)throw new Error("המשתמש לא נמצא");if(!await verifyPassword(currentPassword,row.password_hash))throw new Error("הסיסמה הנוכחית שגויה");if(await verifyPassword(newPassword,row.password_hash))throw new Error("הסיסמה החדשה חייבת להיות שונה מהנוכחית");succeeded=true;const hash=await hashPassword(newPassword);this.db.transaction(()=>{const result=this.db.prepare("UPDATE users SET password_hash=? WHERE id=? AND active=1 AND password_hash=?").run(hash,userId,row.password_hash);if(result.changes!==1)throw new Error("הסיסמה השתנתה, יש לנסות שוב");this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(userId,"PASSWORD_CHANGE","USER",userId);}).immediate();}finally{finish(keys,!succeeded);}}
 async requestPasswordReset(emailRaw:string,ip?:string):Promise<{token:string;userId:number}|undefined>{
  const now=Date.now(),email=normalizeEmail(emailRaw);
  const keys:LimitKey[]=[{key:`reset:${email}`,failureLimit:LIMIT,inFlightLimit:LIMIT,clearOnSuccess:false},...(ip?[{key:`reset-ip:${ip}`,failureLimit:LIMIT,inFlightLimit:LIMIT,clearOnSuccess:false}]:[]),globalKdfKey()];
  reserve(keys,now);
  try{
   const row=this.db.prepare("SELECT id FROM users WHERE email=? AND active=1").get(email) as {id:number}|undefined;
   if(!row)return undefined;
   const token=createSessionToken(),expires=new Date(now+30*60_000).toISOString();
   this.db.transaction(()=>{this.db.prepare("DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<=?").run(row.id,new Date(now).toISOString());this.db.prepare("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)").run(row.id,hashToken(token),expires);})();
   return {token,userId:row.id};
  }finally{finish(keys,true);}
 }
 async resetPasswordWithToken(rawToken:string,newPassword:string):Promise<void>{
  const row=this.db.prepare("SELECT id,user_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>? AND used_at IS NULL").get(hashToken(rawToken),new Date().toISOString()) as {id:number;user_id:number}|undefined;
  if(!row)throw new Error("קישור האיפוס אינו תקין או שפג תוקפו");
  const hash=await hashPassword(newPassword);
  this.db.transaction(()=>{
   const consumed=this.db.prepare("UPDATE password_reset_tokens SET used_at=? WHERE id=? AND used_at IS NULL").run(new Date().toISOString(),row.id);
   if(consumed.changes!==1)throw new Error("קישור האיפוס כבר נוצל");
   this.db.prepare("UPDATE users SET password_hash=?,must_change_password=0 WHERE id=? AND active=1").run(hash,row.user_id);
   this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.user_id);
   this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(row.user_id,"PASSWORD_RESET","USER",row.user_id);
  }).immediate();
 }
 logout(token:string):void{if(token)this.db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hashToken(token));}
}
