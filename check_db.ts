import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
const tableInfo = db.prepare("PRAGMA table_info(issues)").all();
console.log('Issues table info:', JSON.stringify(tableInfo, null, 2));
db.close();
