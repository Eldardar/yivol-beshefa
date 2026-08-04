import { AppShell } from "@/components/nav";
import { CreatePicker } from "@/components/create-picker";
import { ResetPickerPassword } from "@/components/reset-picker-password";
import { csrfValue,db,requireAdmin } from "@/lib/server";
import { maskNationalId } from "@/lib/privacy";

export const dynamic="force-dynamic";
type Row={id:number;name:string;email:string;phone:string;national_id:string|null;role:"ADMIN"|"PICKER";active:number};

export default async function Users({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const user=await requireAdmin();const csrf=await csrfValue();const {saved,error}=await searchParams;
  const users=db().prepare("SELECT id,name,email,phone,national_id,role,active FROM users ORDER BY active DESC,role,name").all() as Row[];
  return <AppShell user={user}>
    <h1>ניהול משתמשים</h1>
    {saved&&<p className="alert">הפעולה הושלמה</p>}{error&&<p className="alert" role="alert">{error}</p>}
    <div className="grid"><CreatePicker csrf={csrf}/><section className="card"><h2>חשבונות</h2><div className="table-wrap"><table className="table">
      <thead><tr><th>שם</th><th>תפקיד</th><th>תעודת זהות</th><th>דוא״ל</th><th>טלפון</th><th>מצב</th><th>פעולה</th></tr></thead>
      <tbody>{users.map(row=><tr key={row.id}><td>{row.name}</td><td>{row.role==="ADMIN"?"מנהל":"קוטף"}</td><td>{row.role==="PICKER"?(row.national_id?maskNationalId(row.national_id):"חסרה (רשומה ותיקה)"):"—"}</td><td>{row.email}</td><td>{row.phone}</td><td><span className={`tag ${row.active?"":"bad"}`}>{row.active?"פעיל":"בארכיון"}</span></td><td className="stack">{row.role==="PICKER"&&Boolean(row.active)&&<ResetPickerPassword csrf={csrf} userId={row.id}/>}{row.id!==user.id&&<ActiveForm csrf={csrf} id={row.id} active={!row.active}/>}</td></tr>)}</tbody>
    </table></div></section></div>
  </AppShell>;
}
function ActiveForm({csrf,id,active}:{csrf:string;id:number;active:boolean}){return <form action="/api/actions" method="post"><input type="hidden" name="csrf" value={csrf}/><input type="hidden" name="action" value="setActive"/><input type="hidden" name="entity" value="USER"/><input type="hidden" name="entityId" value={id}/><input type="hidden" name="active" value={active?"1":"0"}/><button className={`btn ${active?"":"danger"}`}>{active?"שחזור":"העברה לארכיון"}</button></form>}
