import { notFound } from "next/navigation";
import { AppShell } from "@/components/nav";
import { csrfValue,db,requireUser } from "@/lib/server";
import { formatHebrewDate } from "@/lib/dates";

export const dynamic="force-dynamic";
export default async function Leader({params}:{params:Promise<{id:string}>}){
 const user=await requireUser();const id=Number((await params).id);
 const shift=db().prepare("SELECT id,date,slot,status,leader_id FROM shifts WHERE id=?").get(id) as {id:number;date:string;slot:string;status:string;leader_id:number}|undefined;
 if(!shift||(user.role!=="ADMIN"&&(shift.leader_id!==user.id||!["PUBLISHED","COMPLETED"].includes(shift.status))))notFound();
 const csrf=await csrfValue();const pickers=db().prepare(`SELECT u.id,u.name,COALESCE(q.quantity,0) quantity FROM shift_pickers sp JOIN users u ON u.id=sp.user_id LEFT JOIN quantities q ON q.shift_id=sp.shift_id AND q.user_id=sp.user_id WHERE sp.shift_id=? ORDER BY u.name`).all(id) as Array<{id:number;name:string;quantity:number}>;
 return <AppShell user={user}><h1>דיווח כמויות · {formatHebrewDate(shift.date)}</h1><form className="card stack" action="/api/actions" method="post"><input type="hidden" name="action" value="quantities"/><input type="hidden" name="csrf" value={csrf}/><input type="hidden" name="shiftId" value={id}/>{pickers.map(p=><div className="field" key={p.id}><label htmlFor={`q${p.id}`}>{p.name}</label><input className="input" id={`q${p.id}`} name={`quantity_${p.id}`} type="number" min="0" step="0.01" defaultValue={p.quantity} required/></div>)}<button className="btn">שמירת הדיווח</button></form></AppShell>;
}
