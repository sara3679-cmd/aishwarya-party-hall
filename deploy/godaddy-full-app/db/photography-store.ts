import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { mysqlPool } from "./index";
import { Photography, photographyCategories } from "../lib/photography";
export async function photographyStore() {
 const pool=mysqlPool();
 await pool.query("CREATE TABLE IF NOT EXISTS photography_catalog (id INT PRIMARY KEY, payload LONGTEXT NOT NULL, revision INT NOT NULL DEFAULT 0)");
 await pool.execute("INSERT IGNORE INTO photography_catalog (id,payload) VALUES (1,?)",[JSON.stringify({categories:photographyCategories,designs:[]})]);
 return {
 async read(){const [rows]=await pool.query<RowDataPacket[]>("SELECT payload,revision FROM photography_catalog WHERE id=1");return {data:JSON.parse(rows[0].payload) as {categories:string[];designs:Photography[]},revision:Number(rows[0].revision)};},
 async write(data:unknown,revision:number){const [result]=await pool.execute<ResultSetHeader>("UPDATE photography_catalog SET payload=?,revision=revision+1 WHERE id=1 AND revision=?",[JSON.stringify(data),revision]);return result.affectedRows===1;}
 };
}
