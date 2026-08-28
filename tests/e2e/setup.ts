import fs from "node:fs";
import path from "node:path";
import { openDb } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/security";

export default async function setup(){
 const file=path.resolve("./data/e2e.sqlite");for(const suffix of ["","-wal","-shm"])fs.rmSync(file+suffix,{force:true});process.env.DATABASE_PATH=file;const db=openDb(file);
 const adminHash=await hashPassword("TestAdmin!12345");const pickerHash=await hashPassword("TestPicker!12345");
 db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל בדיקה","admin@example.com","0500000000","ADMIN",adminHash);
 const pickerId=Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף בדיקה","picker@example.com","0500000001","PICKER",pickerHash).lastInsertRowid);
 const now=new Date();const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString().slice(0,10);
 const farmId=Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק בדיקה","איש קשר","0500000002","דרך הבדיקה 1").lastInsertRowid);
 db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farmId,"תפוחים","גאלה");
 db.prepare("INSERT INTO vehicles(number,name) VALUES(?,?)").run("123-45-678","רכב בדיקה");
 db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(pickerId,start,"AVAILABLE");
 const past=new Date(Date.now()-86_400_000).toISOString().slice(0,10);const draftId=Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,status,created_by) VALUES(?,?,?,?,?,?,?)").run(past,"16:00","20:00",1,pickerId,"DRAFT",pickerId).lastInsertRowid);db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)").run(draftId,"KG",1);db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(draftId,pickerId);db.close();
}

setup().catch((error:unknown)=>{console.error(error);process.exitCode=1;});
