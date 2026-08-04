export type BodyIssue={status:413|415;message:string};
const noStoreHtmlHeaders={"Cache-Control":"no-store","Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff"} as const;

export function escapeHtml(value:string):string{
 return value.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]!);
}

export function htmlPage(title:string,content:string,status:number):Response{
 return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · יבול בשפע</title></head><body><main><h1>${escapeHtml(title)}</h1>${content}<p><a href="/admin/users">חזרה לרשימת הקוטפים</a></p></main></body></html>`,{status,headers:noStoreHtmlHeaders});
}

function requestOrigin(req:Request):string{
 const configured=process.env.PUBLIC_ORIGIN;
 if(!configured)return new URL(req.url).origin;
 let parsed:URL;
 try{parsed=new URL(configured);}catch{throw new Error("PUBLIC_ORIGIN אינו תקין");}
 if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)throw new Error("PUBLIC_ORIGIN אינו תקין");
 return parsed.origin;
}

export function requestUrl(path:string,req:Request):URL{
 if(!path.startsWith("/")||path.startsWith("//"))throw new Error("נתיב הפניה אינו תקין");
 return new URL(path,requestOrigin(req));
}

export function requestBodyIssue(req:Request,maxBytes:number,allowedTypes:readonly string[]):BodyIssue|undefined{
 const raw=req.headers.get("content-length"),length=raw===null?Number.NaN:Number(raw);
 if(!Number.isSafeInteger(length)||length<1||length>maxBytes)return {status:413,message:"בקשה גדולה מדי או ללא אורך תקין"};
 const type=(req.headers.get("content-type")??"").split(";",1)[0]!.trim().toLowerCase();
 if(!allowedTypes.includes(type))return {status:415,message:"סוג תוכן אינו נתמך"};
}
