export type BodyIssue={status:413|415;message:string};

export function requestBodyIssue(req:Request,maxBytes:number,allowedTypes:readonly string[]):BodyIssue|undefined{
 const raw=req.headers.get("content-length"),length=raw===null?Number.NaN:Number(raw);
 if(!Number.isSafeInteger(length)||length<1||length>maxBytes)return {status:413,message:"בקשה גדולה מדי או ללא אורך תקין"};
 const type=(req.headers.get("content-type")??"").split(";",1)[0]!.trim().toLowerCase();
 if(!allowedTypes.includes(type))return {status:415,message:"סוג תוכן אינו נתמך"};
}
