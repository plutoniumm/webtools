import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';

let SQL: SqlJsStatic;
let db: Database;

export async function init (): P<void> {
  if (SQL) return;

  SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
  });
}

export async function loadDB (file: File): P<void> {
  const buffer = await file.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buffer));
}

export function readTable (table: string, offset = 0, limit = 100): KV<any>[] {
  const stmt = db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`);
  stmt.bind([limit, offset]);
  const rows: KV<any>[] = [];

  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows;
}

export function upd (table: string, data: KV<any>, PK: string, id: any): void {
  const setClause = Object
    .keys(data)
    .map(col => `${col} = ?`)
    .join(', ');

  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${PK} = ?`);
  stmt.run([...Object.values(data), id]);
  stmt.free();
}

export function del (table: string, PK: string, id: any): void {
  const stmt = db.prepare(`DELETE FROM ${table} WHERE ${PK} = ?`);
  stmt.run([id]);
  stmt.free();
}

export function exportDB (filename = 'database.sqlite'): void {
  const binaryArray = db.export();
  const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createDB (): void {
  db = new SQL.Database();
  db.run('VACUUM');
}

export function listTables (): string[] {
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
  const tables: string[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name) tables.push(row.name.toString());
  }
  stmt.free();

  return tables;
}

export function getSchema (table: string): KV<string>[] {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const schema: KV<string>[] = [];

  while (stmt.step()) {
    const { name, type } = stmt.getAsObject() as KV<string>;
    schema.push({ name, type });
  }
  stmt.free();

  return schema;
}
