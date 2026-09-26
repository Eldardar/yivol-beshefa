import path from "node:path";
import { test,expect,type Page,type BrowserContext,type TestInfo } from "@playwright/test";
import { openDb } from "../../src/lib/db";
import { AuthService } from "../../src/lib/services/auth";
import { availabilityWindow } from "../../src/lib/dates";

const BASE_URL="http://localhost:3100";

async function login(page:Page){await page.goto("/login");await page.getByLabel("דוא״ל").fill("admin@example.com");await page.getByLabel("סיסמה").fill("TestAdmin!12345");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();}

// Mobile renders scannable cards and desktop a data table; only the visible one is in the accessibility tree.
function listItem(page:Page,testInfo:TestInfo,text:string){return testInfo.project.name==="mobile"?page.locator("article.record-card").filter({hasText:text}):page.getByRole("row").filter({hasText:text});}

async function createWorker(page:Page,worker:{name:string;email:string;phone:string;nationalId:string}){
 await page.getByRole("button",{name:"הוספת עובד"}).click();const dialog=page.getByRole("dialog",{name:"הוספת עובד"});
 await dialog.getByLabel("שם מלא").fill(worker.name);await dialog.getByLabel("דוא״ל").fill(worker.email);await dialog.getByLabel("טלפון").fill(worker.phone);await dialog.getByLabel("תעודת זהות").fill(worker.nationalId);
 await dialog.getByRole("button",{name:"יצירת עובד וסיסמה זמנית"}).click();
 const passwordCode=dialog.locator("code");await expect(passwordCode).toBeVisible();const password=(await passwordCode.textContent())!;
 await dialog.getByRole("button",{name:/סגירה/}).click();await expect(dialog).toBeHidden();
 return password;
}

async function csrfToken(context:BrowserContext){return (await context.cookies()).find(cookie=>cookie.name==="yivol_csrf")!.value;}

test("כניסה מאובטחת וממשק RTL",async({page})=>{await page.goto("/");await expect(page).toHaveURL(/\/login$/);await expect(page.locator("html")).toHaveAttribute("dir","rtl");await login(page);await expect(page.getByRole("heading",{name:/שלום מנהל/})).toBeVisible();await expect(page.getByRole("link",{name:"עובדים",exact:true})).toBeVisible();});

test("כניסה שגויה אינה חושפת אם המשתמש קיים",async({page})=>{await page.goto("/login");await page.getByLabel("דוא״ל").fill("missing@example.com");await page.getByLabel("סיסמה").fill("incorrect-password");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");});

test("מנהל יוצר, עורך ומפרסם משמרת",async({page},testInfo)=>{
 await login(page);await page.goto("/admin/shifts");
 const now=new Date();const shiftDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString().slice(0,10);const isMobile=testInfo.project.name==="mobile";const startTime=isMobile?"16:00":"06:00";const endTime=isMobile?"20:00":"12:00";const timeText=`${startTime}–${endTime}`;
 // The seeded past draft shares the mobile time slot, so the date keeps the lookup unique.
 const dateText=new Intl.DateTimeFormat("he-IL",{timeZone:"Asia/Jerusalem",year:"numeric",month:"long",day:"numeric"}).format(new Date(`${shiftDate}T12:00:00Z`));
 const shift=()=>listItem(page,testInfo,timeText).filter({hasText:"משק בדיקה · תפוחים"}).filter({hasText:dateText});
 await page.getByRole("button",{name:"הוספת משמרת"}).click();const createDialog=page.getByRole("dialog",{name:"משמרת חדשה"});
 await createDialog.getByLabel("תאריך").fill(shiftDate);await createDialog.getByLabel("שעת התחלה").fill(startTime);await createDialog.getByLabel("שעת סיום משוערת").fill(endTime);
 await createDialog.getByLabel("חקלאי").selectOption({label:"משק בדיקה"});await createDialog.getByLabel("חלקת גידול").selectOption({index:1});await createDialog.getByLabel("מוביל משמרת").selectOption({label:"קוטף בדיקה"});
 await createDialog.getByLabel("יעד",{exact:true}).fill("12");await createDialog.getByLabel("יחידת מידה ליעד").selectOption({label:"ארגז(ים) גדול"});await createDialog.getByRole("button",{name:"יצירת טיוטה"}).click();
 await expect(shift()).toContainText("טיוטה");if(!isMobile)await expect(shift()).toContainText("—/12");
 await shift().getByRole("button",{name:"הקצאת רכבים"}).click();const vehiclesDialog=page.getByRole("dialog",{name:"הקצאת רכבים"});await vehiclesDialog.getByRole("checkbox").check();await vehiclesDialog.getByRole("button",{name:"הקצאה"}).click();await expect(vehiclesDialog).toBeHidden();
 await shift().getByRole("button",{name:"עריכת משמרת"}).first().click();
 const editDialog=page.getByRole("dialog",{name:/עריכת משמרת/});await expect(editDialog).toBeVisible();await editDialog.getByLabel("יעד",{exact:true}).fill("15");const invalid=await editDialog.locator(":invalid").evaluateAll(nodes=>nodes.map(node=>(node as HTMLInputElement).name));expect(invalid).toEqual([]);await editDialog.getByRole("button",{name:"שמירת שינויים"}).click();await expect(editDialog).toBeHidden();
 if(!isMobile)await expect(shift()).toContainText("—/15");
 await shift().getByRole("button",{name:"פרסום"}).click();await expect(shift()).toContainText("פורסמה");
 await shift().getByRole("link",{name:"דוח"}).click();
 await page.getByLabel("שעת התחלה · קוטף בדיקה").fill("06:00");await page.getByLabel("שעת סיום · קוטף בדיקה").fill("10:00");await page.getByLabel("כמות · קוטף בדיקה").fill("7");await page.getByLabel("יחידת מידה · קוטף בדיקה").selectOption({label:"ארגז(ים) גדול"});
 await page.getByRole("button",{name:"שמירת הדיווח"}).click();await expect(page).toHaveURL(/saved=1/);
 // Returning from the report expands that shift; its per-picker table shows the reported hours and amount.
 await expect(page.getByRole("row").filter({hasText:"06:00–10:00"}).filter({visible:true}).last()).toContainText("7 ארגז(ים) גדול");
});

test("טיוטה מהעבר אינה נחשפת לקוטף",async({page})=>{await page.goto("/login");await page.getByLabel("דוא״ל").fill("picker@example.com");await page.getByLabel("סיסמה").fill("TestPicker!12345");await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.getByRole("heading",{name:/שלום קוטף/})).toBeVisible();await page.goto("/history");await expect(page).toHaveURL(/\/history$/);await expect(page.getByText("טיוטה")).toHaveCount(0);await expect(page.getByText("משק בדיקה")).toHaveCount(0);});

test("סיסמה זמנית נכפית, מוחלפת ומבטלת את ההפעלה",async({page,context},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const suffix=testInfo.project.name==="mobile"?"mobile":"desktop",email=`forced-${suffix}@example.com`,name=`משתמש כפוי ${suffix}`,nationalId=testInfo.project.name==="mobile"?"316250265":"316250257";
 await page.getByRole("button",{name:"הוספת עובד"}).click();await expect(page.getByRole("dialog",{name:"הוספת עובד"}).getByLabel("תפקיד")).toHaveCount(0);await page.getByRole("dialog",{name:"הוספת עובד"}).getByRole("button",{name:/סגירה/}).click();
 const temporaryPassword=await createWorker(page,{name,email,phone:"0501234567",nationalId});expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);
 await listItem(page,testInfo,name).getByRole("button",{name:"פתיחת פרטי עובד"}).click();await expect(page.getByText(`•••••${nationalId.slice(-4)}`).filter({visible:true})).toBeVisible();await expect(page.getByText(nationalId)).toHaveCount(0);
 const duplicateStatus=await page.evaluate(async input=>(await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,{csrf:await csrfToken(context),name:`${name} כפול`,email:`duplicate-${email}`,phone:"0501234568",nationalId,notes:""});expect(duplicateStatus).toBe(400);
 await context.clearCookies();await page.goto("/login");await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(temporaryPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page).toHaveURL(/\/change-password$/);await page.goto("/history");await expect(page).toHaveURL(/\/change-password$/);
 const replacement="Aa1!bcde";await page.getByLabel("סיסמה חדשה").fill(replacement);await page.getByLabel("אימות סיסמה").fill(replacement);await page.getByRole("button",{name:"שמירה וכניסה מחדש"}).click();await expect(page).toHaveURL(/\/login\?changed=1$/);
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(temporaryPassword);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");
 await page.getByLabel("דוא״ל").fill(email);await page.getByLabel("סיסמה").fill(replacement);await page.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(page.getByRole("heading",{name:new RegExp(name.split(" ")[0]!)})).toBeVisible();
});

// The admin UI now opens modals (JavaScript), but the API still accepts plain form posts and answers with an HTML page.
test("יצירת קוטף בטופס HTML רגיל מחזירה דף מאובטח",async({browser},testInfo)=>{
 const context=await browser.newContext({javaScriptEnabled:false,baseURL:BASE_URL});
 try{
  const page=await context.newPage();await login(page);
  const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף <img src=x onerror=alert(1)> ${suffix}`,email=`no-js-${suffix}@example.com`,nationalId=mobile?"316250281":"316250273";
  const response=await context.request.post("/api/admin/users",{form:{csrf:await csrfToken(context),name,email,phone:"0507654321",nationalId,notes:""},headers:{origin:BASE_URL}});
  expect(response.status()).toBe(201);const html=await response.text();
  expect(html).toContain("הקוטף נוצר בהצלחה");expect(html).toContain("&lt;img src=x");expect(html).not.toContain("<img src=x");
  expect(html).toContain(`•••••${nationalId.slice(-4)}`);expect(html).not.toContain(nationalId);expect(html).toMatch(/<code>[^<]{12,}<\/code>/);
  await page.goto("/admin/users");await expect(listItem(page,testInfo,name)).toBeVisible();await expect(page.locator("main img")).toHaveCount(0);
 }finally{await context.close();}
});

test("מנהל מאפס סיסמת קוטף: מבטל הפעלה קיימת וכופה סיסמה חדשה",async({page,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף לאיפוס ${suffix}`,email=`reset-${suffix}@example.com`,nationalId=mobile?"316250349":"316250331";
 const initialPassword=await createWorker(page,{name,email,phone:"0509876543",nationalId});
 const pickerContext=await browser.newContext();
 try{
  const pickerPage=await pickerContext.newPage();await pickerPage.goto("/login");await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
  const item=listItem(page,testInfo,name);await item.getByRole("button",{name:"איפוס סיסמה"}).click();
  const confirm=page.getByRole("dialog",{name:"אישור איפוס סיסמה"});await confirm.getByRole("button",{name:"איפוס סיסמה"}).click();await expect(confirm).toBeHidden();
  const newPassword=(await item.locator("code").textContent())!;expect(newPassword).not.toBe(initialPassword);expect(newPassword.length).toBeGreaterThanOrEqual(8);
  await pickerPage.goto("/history");await expect(pickerPage).toHaveURL(/\/login$/);
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage.locator("p.alert[role=alert]")).toHaveText("פרטי ההתחברות שגויים");
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(newPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
 }finally{await pickerContext.close();}
});

test("איפוס סיסמה בטופס HTML רגיל ודחיית מטרה שאינה קוטף פעיל",async({page,context,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף ללא ג׳אווהסקריפט ${suffix}`,email=`reset-no-js-${suffix}@example.com`,nationalId=mobile?"316250398":"316250380";
 await createWorker(page,{name,email,phone:"0501112222",nationalId});
 const forgedStatus=await page.evaluate(async input=>(await fetch("/api/admin/users/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,{csrf:await csrfToken(context),userId:1});
 expect(forgedStatus).toBe(400);
 const db=openDb(path.resolve("./data/e2e.sqlite"));const {id:userId}=db.prepare("SELECT id FROM users WHERE email=?").get(email) as {id:number};db.close();
 const noJs=await browser.newContext({javaScriptEnabled:false,baseURL:BASE_URL});
 try{
  const noJsPage=await noJs.newPage();await login(noJsPage);
  const response=await noJs.request.post("/api/admin/users/reset-password",{form:{csrf:await csrfToken(noJs),userId:String(userId)},headers:{origin:BASE_URL}});
  expect(response.status()).toBe(200);const html=await response.text();expect(html).toContain("הסיסמה אופסה בהצלחה");expect(html).toMatch(/<code>[^<]{8,}<\/code>/);
 }finally{await noJs.close();}
});

test("לוח זמינות: 60 הימים הבאים, נעילת ימים מחוץ לטווח, ללא שבת ושמירה אוטומטית",async({page,browser},testInfo)=>{
 await login(page);await page.goto("/admin/users");
 const mobile=testInfo.project.name==="mobile",suffix=mobile?"mobile":"desktop",name=`קוטף זמינות ${suffix}`,email=`availability-${suffix}@example.com`,nationalId=mobile?"316250422":"316250406";
 const initialPassword=await createWorker(page,{name,email,phone:"0503334444",nationalId});
 const context=await browser.newContext();
 try{
  const pickerPage=await context.newPage();await pickerPage.goto("/login");await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(initialPassword);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();await expect(pickerPage).toHaveURL(/\/change-password$/);
  const replacement="Aa1!bcde";await pickerPage.getByLabel("סיסמה חדשה").fill(replacement);await pickerPage.getByLabel("אימות סיסמה").fill(replacement);await pickerPage.getByRole("button",{name:"שמירה וכניסה מחדש"}).click();await expect(pickerPage).toHaveURL(/\/login\?changed=1$/);
  await pickerPage.getByLabel("דוא״ל").fill(email);await pickerPage.getByLabel("סיסמה").fill(replacement);await pickerPage.getByRole("button",{name:"כניסה מאובטחת"}).click();
  await pickerPage.goto("/availability");

  // Every month overlapping the window is rendered at once; days outside it are locked and Saturdays are omitted.
  const window=availabilityWindow();let monthCount=0,editableExpected=0,lockedExpected=0;
  const lastDay=new Date(`${window.end}T12:00:00Z`);lastDay.setUTCDate(lastDay.getUTCDate()-1);
  for(let month=new Date(`${window.start.slice(0,7)}-01T12:00:00Z`);month<=lastDay;month.setUTCMonth(month.getUTCMonth()+1)){
   monthCount++;
   for(const day=new Date(month);day.getUTCMonth()===month.getUTCMonth();day.setUTCDate(day.getUTCDate()+1)){
    if(day.getUTCDay()===6)continue;const date=day.toISOString().slice(0,10);
    if(date>=window.start&&date<window.end)editableExpected++;else lockedExpected++;
   }
  }
  await expect(pickerPage.locator(".calendar-month")).toHaveCount(monthCount);
  const headers=pickerPage.locator(".calendar-head");await expect(headers).toHaveCount(monthCount*6);await expect(headers.first()).toHaveText("ראשון");await expect(headers.nth(5)).toHaveText("שישי");
  await expect(pickerPage.locator(".calendar .status-options")).toHaveCount(editableExpected);
  await expect(pickerPage.locator(".calendar-day--locked")).toHaveCount(lockedExpected);
  await expect(pickerPage.locator(".calendar-day--locked .status-option")).toHaveCount(0);

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
 }finally{await context.close();}
});

async function createPickerWithKnownPassword(page:Page,context:BrowserContext,name:string,email:string,phone:string,nationalId:string,knownPassword:string){
 await login(page);await page.goto("/admin/users");
 const temporaryPassword=await createWorker(page,{name,email,phone,nationalId});
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

test("API יצירת קוטף דוחה זיוף תפקיד מנהל",async({page,context},testInfo)=>{await login(page);await page.goto("/admin/users");const mobile=testInfo.project.name==="mobile",email=`forged-role-${mobile?"mobile":"desktop"}@example.com`,nationalId=mobile?"316250323":"316250315",csrf=await csrfToken(context);const result=await page.evaluate(async input=>{const response=await fetch("/api/admin/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)});return {status:response.status,body:await response.json()};},{csrf,name:"מנהל מזויף",email,phone:"0501112233",nationalId,notes:"",role:"ADMIN"});expect(result.status).toBe(400);expect(result.body.error).toBeTruthy();await page.reload();await expect(page.getByText(email,{exact:true})).toHaveCount(0);});
