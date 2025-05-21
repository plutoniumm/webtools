import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';
import { notify } from '$lib';

let SQL: SqlJsStatic;
let db: Database;

async function init (): P<boolean> {
  if (SQL) return true;

  try {
    SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    return true;
  } catch (error) {
    notify(400, 'Failed to load SQL.js');
    return false;
  }
}

async function loadDB (file: File): P<void> {
  const buffer = await file.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buffer));
}

function readTable (table: string, offset = 0, limit = 100): KV<any>[] {
  const stmt = db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`);
  stmt.bind([limit, offset]);
  const rows: KV<any>[] = [];

  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows;
}

function upd (table: string, data: KV<any>, PK: string, id: any): void {
  const setClause = Object
    .keys(data)
    .map(col => `${col} = ?`)
    .join(', ');

  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${PK} = ?`);
  stmt.run([...Object.values(data), id]);
  stmt.free();
}

function del (table: string, PK: string, id: any): void {
  const stmt = db.prepare(`DELETE FROM ${table} WHERE ${PK} = ?`);
  stmt.run([id]);
  stmt.free();
}

function exportDB (filename = 'database.sqlite'): void {
  try {
    const binaryArray = db.export();
    const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    notify(400, 'Failed to export database');
    console.error('Error exporting database:', error);
  };
}

function createDB (): void {
  db = new SQL.Database();
  db.run('VACUUM');
}

function listTables (): string[] {
  try {
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
    const tables: string[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.name) tables.push(row.name.toString());
    }
    stmt.free();
    return tables;
  } catch (error) {
    console.error('Error listing tables:', error);
    notify(400, 'Failed to list tables');
    return [];
  }
};

function addRow (table: string, data: KV<any>): void {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');

  const stmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
  stmt.run(Object.values(data));
  stmt.free();
}

function addCol (table: string, colName: string, colType: string = 'TEXT'): void {
  const stmt = db.prepare(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colType}`);
  stmt.run();
  stmt.free();
}

function getSchema (table: string): KV<string>[] {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const schema: KV<string>[] = [];

  while (stmt.step()) {
    const { name, type } = stmt.getAsObject() as KV<string>;
    schema.push({ name, type });
  }
  stmt.free();

  return schema;
}


export const IO = {
  init: init,
  export: exportDB
}

export const SCHEMA = {
  create: createDB,
  load: loadDB,
  table: readTable,
  list: listTables,
  schema: getSchema,
}

export const EDIT = {
  del: del,
  upd: upd,
  row: addRow,
  col: addCol
}