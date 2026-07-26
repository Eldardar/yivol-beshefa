import { getDb } from "../src/lib/db";const db=getDb();console.log(`המיגרציות הושלמו: ${process.env.DATABASE_PATH||"data/yivol.sqlite"}`);db.close();
