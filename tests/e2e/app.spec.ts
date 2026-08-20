import path from "node:path";
import { test,expect,type Page } from "@playwright/test";
import { openDb } from "../../src/lib/db";
import { AuthService } from "../../src/lib/services/auth";

async function login(page:Page){await page.goto("/login");await page.getByLabel("דוא״ל").fill("admin@example.com");await page.getByLabel("סיסמה").fill("TestAdmin!12345");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();}

test("כניסה מאובטחת וממשק RTL",async({page})=>{await page.goto("/");await expect(page).toHaveURL(/\/login$/);await expect(page.locator("html")).toHaveAttribute("dir","rtl");await login(page);await expect(page.getByRole("heading",{name:/שלום מנהל/})).toBeVisible();await expect(page.getByRole("link",{name:"משמרות",exact:true})).toBeVisible();});

test("כניסה שגויה אינה חושפת אם המשתמש קיים",async({page})=>{await page.goto("/login");await page.getByLabel("דוא״ל").fill("missing@example.com");await page.getByLabel("סיסמה").fill("incorrect-password");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");});

test("מנהל יוצר, עורך ומפרסם משמרת",async({page},testInfo)=>{
 await login(page);await page.goto("/admin/shifts");
 const now=new Date();const shiftDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString().slice(0,10);const slot=testInfo.project.name==="mobile"?"EVENING":"MORNING";const slotName=slot==="MORNING"?"בוקר":"ערב";
 await page.getByRole("button",{name:"הוספת משמרת"}).click();const createDialog=page.getByRole("dialog",{name:"משמרת חדשה"});
 await createDialog.getByLabel("תאריך").fill(shiftDate);await createDialog.getByLabel("חלק יום").selectOption(slot);await createDialog.getByLabel("עונה").selectOption({label:"משק בדיקה · תפוחים"});await createDialog.getByLabel("מוביל משמרת").selectOption({label:"קוטף בדיקה"});await createDialog.getByLabel("יעד").fill("12");await createDialog.getByRole("button",{name:"יצירת טיוטה"}).click();
 const row=page.getByRole("row").filter({hasText:"משק בדיקה · תפוחים"}).filter({hasText:"0 / 12"}).filter({hasText:slotName});await expect(row).toContainText("טיוטה");
 await row.getByRole("button",{name:"הקצאת רכבים"}).click();const vehiclesDialog=page.getByRole("dialog",{name:"הקצאת רכבים"});await vehiclesDialog.getByRole("checkbox").check();await vehiclesDialog.getByRole("button",{name:"הקצאה"}).click();await expect(vehiclesDialog).toBeHidden();
 await row.getByRole("button",{name:"עריכת משמרת"}).click();
 const editDialog=page.getByRole("dialog",{name:/עריכת משמרת/});await expect(editDialog).toBeVisible();await editDialog.getByLabel("יעד").fill("15");const invalid=await editDialog.locator(":invalid").evaluateAll(nodes=>nodes.map(node=>(node as HTMLInputElement).name));expect(invalid).toEqual([]);await editDialog.getByRole("button",{name:"שמירת שינויים"}).click();await expect(page).toHaveURL(/saved=1/);const updated=page.getByRole("row").filter({hasText:"משק בדיקה · תפוחים"}).filter({hasText:"0 / 15"}).filter({hasText:slotName});await expect(updated).toContainText("0 / 15");
 await updated.getByRole("button",{name:"פרסום"}).click();const published=page.getByRole("row").filter({hasText:"משק בדיקה · תפוחים"}).filter({hasText:"0 / 15"}).filter({hasText:slotName});await expect(published).toContainText("פורסמה");await published.getByRole("link",{name:"דוח"}).click();await page.getByLabel("שעת התחלה").fill("06:00");await page.getByLabel("שעת סיום").fill("10:00");await page.locator('input[name^="qty_"]').fill("7");await page.getByRole("button",{name:"שמירת הדיווח"}).click();await expect(page).toHaveURL(/saved=1/);await expect(page.getByRole("row").filter({hasText:"משק בדיקה · תפוחים"}).filter({hasText:"7 / 15"}).filter({hasText:slotName})).toContainText("7 / 15");
});

test("טיוטה מהעבר אינה נחשפת לקוטף",async({page})=>{await page.goto("/login");await page.getByLabel("דוא״ל").fill("picker@example.com");await page.getByLabel("סיסמה").fill("TestPicker!12345");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.getByRole("heading",{name:/שלום קוטף/})).toBeVisible();await page.goto("/history");await expect(page).toHaveURL(/\/history$/);await expect(page.getByText("טיוטה")).toHaveCount(0);await expect(page.getByText("משק בדיקה")).toHaveCount(0);});

test("סיסמה זמנית נכפית, מוחלפת ומבטלת את ההפעלה",async({page,context},testInfo)=>{await login(page);await page.goto("/admin/users");const suffix=testInfo.project.name==="mobile"?"mobile":"desktop",email=`forced-${suffix}@example.com`,name=`משתמש כפוי ${suffix}`,nationalId=testInfo.project.name==="mobile"?"316250265":"316250257";await expect(page.getByLabel("תפקיד")).toHaveCount(0);await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill("0501234567");await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();const passwordCode=page.locator("code");await expect(passwordCode).toBeVisible();await expect(page.getByRole("row").filter({hasText:name}).filter({hasText:`•••••${nationalId.slice(-4)}`})).toBeVisible();const csrf=await page.locator('input[name="csrf"]').first().inputValue();const duplicateStatus=await page.evaluate(async input=>(await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,{csrf,name:`${name} כפול`,email:`duplicate-${email}`,phone:"0501234568",nationalId,notes:""});expect(duplicateStatus).toBe(400);const temporaryPassword=(await passwordCode.textContent())!;expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);await context.clearCookies();await page.goto("/login");await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(temporaryPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page).toHaveURL(/\/change-password$/);await page.goto("/history");await expect(page).toHaveURL(/\/change-password$/);const replacement="Aa1!bcde";await page.getByLabel("סיסמה חדשה").fill(replacement);await page.getByLabel("אימות סיסמה").fill(replacement);await page.getByRole("button",{name:"שמירה וכניסה מחדש"}).click();await expect(page).toHaveURL(/\/login\?changed=1$/);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(temporaryPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(replacement);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.getByRole("heading",{name:new RegExp(name.split(" ")[0]!)})).toBeVisible();});

test("יצירת קוטף פועלת גם ללא JavaScript",async({browser},testInfo)=>{const context=await browser.newContext({javaScriptEnabled:false,baseURL:"http://localhost:3100"});try{const page=await context.newPage();await login(page);await page.goto("/admin/users");const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף <img src=x onerror=alert(1)> ${suffix}`,email=`no-js-${suffix}@example.com`,nationalId=mobile?"316250281":"316250273";await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill("0507654321");await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();await expect(page.getByRole("heading",{name:"הקוטף נוצר בהצלחה"})).toBeVisible();await expect(page.getByText(name)).toBeVisible();await expect(page.locator("main img")).toHaveCount(0);await expect(page.getByText(`•••••${nationalId.slice(-4)}`)).toBeVisible();await expect(page.getByText(nationalId,{exact:true})).toHaveCount(0);await expect(page.locator("code")).toBeVisible();await page.getByRole("link",{name:"חזרה לרשימת הקוטפים"}).click();await expect(page.getByRole("row").filter({hasText:name}).filter({hasText:`•••••${nationalId.slice(-4)}`})).toBeVisible();}finally{await context.close();}});

test("מנהל מאפס סיסמת קוטף: מבטל הפעלה קיימת וכופה סיסמה חדשה",async({page,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף לאיפוס ${suffix}`,email=`reset-${suffix}@example.com`,nationalId=mobile?"316250349":"316250331";
 await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill("0509876543");await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();
 const initialPassword=(await page.locator("code").first().textContent())!;
 const pickerContext=await browser.newContext();
 try{
  const pickerPage=await pickerContext.newPage();await pickerPage.goto("/login");await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
  await page.reload();
  const row=page.getByRole("row").filter({hasText:name});await row.getByRole("button",{name:"איפוס סיסמה"}).click();
  const newPassword=(await row.locator("code").textContent())!;expect(newPassword).not.toBe(initialPassword);expect(newPassword.length).toBeGreaterThanOrEqual(8);
  await pickerPage.goto("/history");await expect(pickerPage).toHaveURL(/\/login$/);
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(newPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
 }finally{await pickerContext.close();}
});

test("איפוס סיסמה פועל גם ללא JavaScript ודוחה מטרה שאינה קוטף פעיל",async({page,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף ללא ג׳אווהסקריפט ${suffix}`,email=`reset-no-js-${suffix}@example.com`,nationalId=mobile?"316250398":"316250380";
 await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill("0501112222");await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();
 const csrf=await page.locator('input[name="csrf"]').first().inputValue();
 const forgedStatus=await page.evaluate(async input=>(await fetch("/api/admin/users/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,{csrf,userId:1});
 expect(forgedStatus).toBe(400);
 const context=await browser.newContext({javaScriptEnabled:false,baseURL:"http://localhost:3100"});
 try{
  const noJsPage=await context.newPage();await noJsPage.goto("/login");await noJsPage.getByLabel("דוא״ל").fill("admin@example.com");await noJsPage.getByLabel("סיסמה").fill("TestAdmin!12345");await noJsPage.getByRole("button",{name:"כניסה מאובטחת"}).click();
  await noJsPage.goto("/admin/users");
  const row=noJsPage.getByRole("row").filter({hasText:name});await row.getByRole("button",{name:"איפוס סיסמה"}).click();
  await expect(noJsPage.getByRole("heading",{name:"הסיסמה אופסה בהצלחה"})).toBeVisible();await expect(noJsPage.locator("code")).toBeVisible();
 }finally{await context.close();}
});

test("לוח זמינות: טווח 60 יום, נעילת ימים שעברו, ללא שבת, ניווט בין חודשים ושמירה אוטומטית",async({page,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף זמינות ${suffix}`,email=`availability-${suffix}@example.com`,nationalId=mobile?"316250422":"316250406";
 await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill("0503334444");await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();
 const initialPassword=(await page.locator("code").first().textContent())!;
 const context=await browser.newContext();
 try{
  const pickerPage=await context.newPage();await pickerPage.goto("/login");await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
  const replacement="Aa1!bcde";await pickerPage.getByLabel("סיסמה חדשה").fill(replacement);await pickerPage.getByLabel("אימות סיסמה").fill(replacement);await pickerPage.getByRole("button",{name:"שמירה וכניסה מחדש"}).click();await expect(pickerPage).toHaveURL(/\/login\?changed=1$/);
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(replacement);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();
  await pickerPage.goto("/availability");

  const now=new Date();
  const todayDay=Number(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",day:"2-digit"}).format(now));
  const [todayYear,todayMonth]=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit"}).format(now).split("-").map(Number) as [number,number];
  let lockedExpected=0;for(let d=1;d<=todayDay;d++){if(new Date(Date.UTC(todayYear,todayMonth-1,d,12)).getUTCDay()!==6)lockedExpected++;}
  const headers=pickerPage.locator(".calendar-head");await expect(headers).toHaveCount(6);await expect(headers.first()).toHaveText("ראשון");await expect(headers.last()).toHaveText("שישי");
  await expect(pickerPage.locator("button.prev")).toBeDisabled();
  await expect(pickerPage.locator("button.next")).toBeEnabled();
  await expect(pickerPage.locator(".calendar-day--locked")).toHaveCount(lockedExpected);
  await expect(pickerPage.locator(".calendar-day--locked .status-option")).toHaveCount(0);

  if(await pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).count()===0) await pickerPage.locator("button.next").click();

  const firstWantToWork=pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).first();
  await firstWantToWork.click();await expect(firstWantToWork).toHaveAttribute("aria-checked","true");
  await expect(pickerPage.locator(".calendar-day--saving")).toHaveCount(0);
  await firstWantToWork.click();await expect(firstWantToWork).toHaveAttribute("aria-checked","false");
  await expect(pickerPage.locator(".calendar-day--saving")).toHaveCount(0);

  await pickerPage.getByRole("button",{name:/סימון הכל/}).click();await expect(pickerPage.locator(".calendar-day--saving")).toHaveCount(0);
  await expect(pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).first()).toHaveAttribute("aria-checked","true");await expect(pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).last()).toHaveAttribute("aria-checked","true");
  await pickerPage.reload();await expect(pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).first()).toHaveAttribute("aria-checked","true");

  await pickerPage.getByRole("button",{name:"ניקוי הכל"}).click();await expect(pickerPage.locator(".calendar-day--saving")).toHaveCount(0);
  await pickerPage.reload();await expect(pickerPage.getByRole("radio",{name:"רוצה לעבוד"}).first()).toHaveAttribute("aria-checked","false");await expect(pickerPage.getByRole("radio",{name:"אולי יש לי תוכניות אחרות"}).first()).toHaveAttribute("aria-checked","false");

  const monthLabelBefore=await pickerPage.locator("strong.label").first().textContent();
  await pickerPage.locator("button.next").click();
  await expect(pickerPage.locator("button.prev")).toBeEnabled();
  await expect(pickerPage.locator("strong.label").first()).not.toHaveText(monthLabelBefore!);
 }finally{await context.close();}
});

async function createPickerWithKnownPassword(page:Page,context:import("@playwright/test").BrowserContext,name:string,email:string,phone:string,nationalId:string,knownPassword:string){
 await login(page);await page.goto("/admin/users");
 await page.getByLabel("שם").fill(name);await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("טלפון").fill(phone);await page.getByLabel("תעודת זהות").fill(nationalId);await page.getByRole("button",{name:"יצירת קוטף וסיסמה זמנית"}).click();
 const temporaryPassword=(await page.locator("code").first().textContent())!;
 await context.clearCookies();
 await page.goto("/login");await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(temporaryPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page).toHaveURL(/\/change-password$/);
 await page.getByLabel("סיסמה חדשה").fill(knownPassword);await page.getByLabel("אימות סיסמה").fill(knownPassword);await page.getByRole("button",{name:"שמירה וכניסה מחדש"}).click();
 await expect(page).toHaveURL(/\/login\?changed=1$/);
}

test("שחזור סיסמה: קישור מהטופס מבטל הפעלות וקישור שנוצל אינו קביל שוב",async({page,context},testInfo)=>{
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף שחזור ${suffix}`,email=`forgot-${suffix}@example.com`,nationalId=mobile?"316250505":"316250497",knownPassword="Aa1!bcde";
 await createPickerWithKnownPassword(page,context,name,email,"0502223333",nationalId,knownPassword);
 await context.clearCookies();

 await page.goto("/forgot-password");await page.getByLabel("דוא״ל").fill(email);await page.getByRole("button",{name:"שליחת קישור לאיפוס"}).click();
 await expect(page).toHaveURL(/\/forgot-password\?sent=1$/);
 await expect(page.locator("p.alert[role=status]")).toBeVisible();

 const db=openDb(path.resolve("./data/e2e.sqlite"));
 const {token}=(await new AuthService(db).requestPasswordReset(email))!;
 db.close();

 await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
 const newPassword="Bb2@fghij";
 await page.getByLabel("סיסמה חדשה").fill(newPassword);await page.getByLabel("אימות סיסמה").fill(newPassword);
 await page.getByRole("button",{name:"שמירת סיסמה"}).click();
 await expect(page).toHaveURL(/\/login\?reset=1$/);
 await expect(page.locator("p.alert[role=status]")).toBeVisible();

 await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
 await page.getByLabel("סיסמה חדשה").fill("Cc3#klmno");await page.getByLabel("אימות סיסמה").fill("Cc3#klmno");
 await page.getByRole("button",{name:"שמירת סיסמה"}).click();
 await expect(page.locator("p.alert[role=alert]")).toBeVisible();

 await page.goto("/login");
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(knownPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(newPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page.getByRole("heading",{name:new RegExp(name.split(" ")[0]!)})).toBeVisible();
});

test("החלפת סיסמה עצמאית מדף החשבון מחייבת סיסמה נוכחית ומבטלת הפעלה",async({page,context},testInfo)=>{
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף חשבון ${suffix}`,email=`account-${suffix}@example.com`,nationalId=mobile?"316250547":"316250539",knownPassword="Aa1!bcde";
 await createPickerWithKnownPassword(page,context,name,email,"0504445555",nationalId,knownPassword);
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(knownPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page.getByRole("heading",{name:new RegExp(name.split(" ")[0]!)})).toBeVisible();

 await page.goto("/account");
 await page.getByLabel("סיסמה נוכחית").fill("wrong-password");
 const attempted="Dd4$pqrst";
 await page.getByLabel("סיסמה חדשה").fill(attempted);await page.getByLabel("אימות סיסמה").fill(attempted);
 await page.getByRole("button",{name:"עדכון סיסמה"}).click();
 await expect(page.locator("p.alert[role=alert]")).toBeVisible();

 await page.getByLabel("סיסמה נוכחית").fill(knownPassword);
 await page.getByLabel("סיסמה חדשה").fill(attempted);await page.getByLabel("אימות סיסמה").fill(attempted);
 await page.getByRole("button",{name:"עדכון סיסמה"}).click();
 await expect(page).toHaveURL(/\/login\?changed=1$/);

 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(knownPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(attempted);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();
 await expect(page.getByRole("heading",{name:new RegExp(name.split(" ")[0]!)})).toBeVisible();
});

test("API יצירת קוטף דוחה זיוף תפקיד מנהל",async({page},testInfo)=>{await login(page);await page.goto("/admin/users");const mobile=testInfo.project.name==="mobile",email=`forged-role-${mobile?"mobile":"desktop"}@example.com`,nationalId=mobile?"316250323":"316250315",csrf=await page.locator('input[name="csrf"]').first().inputValue();const result=await page.evaluate(async input=>{const response=await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)});return {status:response.status,body:await response.json()};},{csrf,name:"מנהל מזויף",email,phone:"0501112233",nationalId,notes:"",role:"ADMIN"});expect(result.status).toBe(400);expect(result.body.error).toBeTruthy();await page.reload();await expect(page.getByText(email,{exact:true})).toHaveCount(0);});
