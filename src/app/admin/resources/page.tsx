import { AppShell } from "@/components/nav";
import { csrfValue,db,requireAdmin } from "@/lib/server";
import { formatHebrewDate } from "@/lib/dates";

export const dynamic="force-dynamic";
const Hidden=({csrf,action}:{csrf:string;action:string})=><><input type="hidden" name="csrf" value={csrf}/><input type="hidden" name="action" value={action}/></>;
type Farm={id:number;name:string;address:string;active:number};
type Season={id:number;farm:string;crop:string;start_date:string;end_date:string;active:number};
type Vehicle={id:number;number:string;name:string;active:number};

export default async function Resources({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const user=await requireAdmin();const csrf=await csrfValue();const {saved,error}=await searchParams;const database=db();
 const farms=database.prepare("SELECT id,name,address,active FROM farms ORDER BY active DESC,name").all() as Farm[];
 const seasons=database.prepare("SELECT se.id,se.crop,se.start_date,se.end_date,se.active,f.name farm FROM seasons se JOIN farms f ON f.id=se.farm_id ORDER BY se.active DESC,se.start_date DESC").all() as Season[];
 const vehicles=database.prepare("SELECT id,number,name,active FROM vehicles ORDER BY active DESC,name").all() as Vehicle[];
 return <AppShell user={user}><h1>ניהול משקים, עונות ורכבים</h1>{saved&&<p className="alert">נשמר בהצלחה</p>}{error&&<p className="alert" role="alert">{error}</p>}
 <div className="grid">
  <form className="card stack" action="/api/actions" method="post"><Hidden csrf={csrf} action="farmCreate"/><h2>משק חדש</h2><input className="input" name="name" placeholder="שם המשק" required maxLength={150}/><input className="input" name="contact" placeholder="איש קשר" required maxLength={150}/><input className="input" name="phone" placeholder="טלפון" required maxLength={30}/><input className="input" name="address" placeholder="כתובת" required maxLength={300}/><input className="input" name="navigation" type="url" placeholder="קישור ניווט HTTP(S) (אופציונלי)" maxLength={500}/><textarea className="input" name="notes" placeholder="הערות" maxLength={2000}/><button className="btn">הוספת משק</button></form>
  <form className="card stack" action="/api/actions" method="post"><Hidden csrf={csrf} action="seasonCreate"/><h2>עונת גידול</h2><select className="input" name="farmId" required>{farms.filter(f=>f.active).map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select><input className="input" name="crop" placeholder="גידול" required maxLength={150}/><label>מתאריך<input className="input" name="start" type="date" required/></label><label>עד תאריך<input className="input" name="end" type="date" required/></label><textarea className="input" name="notes" placeholder="הערות" maxLength={2000}/><button className="btn">הוספת עונה</button></form>
  <form className="card stack" action="/api/actions" method="post"><Hidden csrf={csrf} action="vehicleCreate"/><h2>רכב חדש</h2><input className="input" name="number" placeholder="מספר רכב" required maxLength={50}/><input className="input" name="name" placeholder="שם הרכב" required maxLength={150}/><textarea className="input" name="notes" placeholder="הערות" maxLength={2000}/><button className="btn">הוספת רכב</button></form>
 </div>
 <section className="card"><h2>משקים</h2><div className="table-wrap"><table className="table"><thead><tr><th>שם</th><th>כתובת</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>{farms.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.address}</td><td>{x.active?"פעיל":"בארכיון"}</td><td><ActiveForm csrf={csrf} entity="FARM" id={x.id} active={!x.active}/></td></tr>)}</tbody></table></div></section>
 <section className="card"><h2>עונות</h2><div className="table-wrap"><table className="table"><thead><tr><th>משק</th><th>גידול</th><th>טווח</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>{seasons.map(x=><tr key={x.id}><td>{x.farm}</td><td>{x.crop}</td><td>{formatHebrewDate(x.start_date)}–{formatHebrewDate(x.end_date)}</td><td>{x.active?"פעילה":"בארכיון"}</td><td><ActiveForm csrf={csrf} entity="SEASON" id={x.id} active={!x.active}/></td></tr>)}</tbody></table></div></section>
 <section className="card"><h2>רכבים</h2><div className="table-wrap"><table className="table"><thead><tr><th>מספר</th><th>שם</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>{vehicles.map(x=><tr key={x.id}><td>{x.number}</td><td>{x.name}</td><td>{x.active?"פעיל":"בארכיון"}</td><td><ActiveForm csrf={csrf} entity="VEHICLE" id={x.id} active={!x.active}/></td></tr>)}</tbody></table></div></section>
 </AppShell>;
}
function ActiveForm({csrf,entity,id,active}:{csrf:string;entity:"FARM"|"SEASON"|"VEHICLE";id:number;active:boolean}){return <form action="/api/actions" method="post"><input type="hidden" name="csrf" value={csrf}/><input type="hidden" name="action" value="setActive"/><input type="hidden" name="entity" value={entity}/><input type="hidden" name="entityId" value={id}/><input type="hidden" name="active" value={active?"1":"0"}/><button className={`btn ${active?"":"danger"}`}>{active?"שחזור":"העברה לארכיון"}</button></form>}
