import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

console.log('--- SERVER STARTING ---');
console.log('Time:', new Date().toISOString());
console.log('Node Version:', process.version);
console.log('Platform:', process.platform);
console.log('NODE_ENV:', process.env.NODE_ENV);

// No top-level globals needed if we use process.cwd()
const PORT = 3000;

// Safer ID generation helper
function generateServerId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return crypto.randomBytes(16).toString('hex');
  }
}

async function startServer() {
  let db: Database.Database;
  let dbFile = 'database.sqlite';
  const dbBackupFile = 'database.sqlite.bak';

  const tryOpenDatabase = (filePath: string) => {
    let conn: Database.Database | null = null;
    try {
      conn = new Database(filePath);
      conn.pragma('journal_mode = WAL');
      conn.pragma('synchronous = NORMAL');
      conn.pragma('foreign_keys = ON');
      
      // Quick integrity check
      const integrity = conn.pragma('quick_check') as any[];
      let ok = false;
      if (typeof integrity === 'string') {
        ok = (integrity === 'ok');
      } else if (Array.isArray(integrity)) {
        const first = integrity[0];
        if (typeof first === 'string') {
          ok = (first === 'ok');
        } else if (first && typeof first === 'object') {
          ok = (first.quick_check === 'ok' || first.integrity_check === 'ok');
        }
      }
      if (!ok) {
        throw new Error('Database integrity check failed: ' + JSON.stringify(integrity));
      }
      return conn;
    } catch (err) {
      if (conn) {
        try {
          conn.close();
        } catch (closeErr) {
          console.error('[DATABASE] Failed to close connection after error:', closeErr);
        }
      }
      throw err;
    }
  };

  try {
    db = tryOpenDatabase(dbFile);
    console.log('[DATABASE] Opened successfully.');
  } catch (err: any) {
    console.warn('[DATABASE] Primary database could not be opened. Starting recovery flow...', err?.message || err);
    let restoredFromBackup = false;
    
    if (fs.existsSync(dbBackupFile)) {
      try {
        console.log('[DATABASE] Testing backup database integrity...');
        const backupConn = tryOpenDatabase(dbBackupFile);
        backupConn.close();
        console.log('[DATABASE] Backup database is healthy! Restoring...');
        if (fs.existsSync(dbFile)) {
          try {
            fs.renameSync(dbFile, `${dbFile}.corrupt-${Date.now()}`);
          } catch (renameErr) {
            try { fs.unlinkSync(dbFile); } catch (e) {}
          }
        }
        if (fs.existsSync(`${dbFile}-wal`)) try { fs.unlinkSync(`${dbFile}-wal`); } catch (e) {}
        if (fs.existsSync(`${dbFile}-shm`)) try { fs.unlinkSync(`${dbFile}-shm`); } catch (e) {}

        fs.copyFileSync(dbBackupFile, dbFile);
        db = tryOpenDatabase(dbFile);
        restoredFromBackup = true;
        console.log('[DATABASE] Successfully restored from backup.');
      } catch (backupErr) {
        console.warn('[DATABASE] Backup database is also unusable:', backupErr);
      }
    }

    if (!restoredFromBackup) {
      console.warn('[DATABASE] Creating fresh database...');
      if (fs.existsSync(dbFile)) {
        try {
          fs.renameSync(dbFile, `${dbFile}.corrupt-${Date.now()}`);
        } catch (renameErr) {
          try { fs.unlinkSync(dbFile); } catch (e) {}
        }
      }
      if (fs.existsSync(`${dbFile}-wal`)) try { fs.unlinkSync(`${dbFile}-wal`); } catch (e) {}
      if (fs.existsSync(`${dbFile}-shm`)) try { fs.unlinkSync(`${dbFile}-shm`); } catch (e) {}

      db = tryOpenDatabase(dbFile);
    }
  }

  // Ensure healthy backup snapshot exists
  try {
    db.backup(dbBackupFile).then(() => {
      console.log('[DATABASE] Snapshot backup synchronized successfully.');
    }).catch(bErr => {
      console.warn('[DATABASE] Snapshot backup sync warning:', bErr?.message);
    });
  } catch (e) {}

  const upload = multer({ dest: 'uploads/' });

  // Initialize tables
  db.exec(`
  CREATE TABLE IF NOT EXISTS asset_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    customFields TEXT NOT NULL DEFAULT '[]',
    userVisibleStandardFields TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    privateNote TEXT
  );

  -- Handle migrations for existing tables

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    typeId TEXT NOT NULL,
    tag TEXT UNIQUE,
    serialNumber TEXT,
    purchaseDate TEXT,
    name TEXT NOT NULL,
    ipAddress TEXT,
    modelName TEXT,
    status TEXT NOT NULL,
    userId TEXT,
    locationId TEXT,
    macAddress TEXT,
    specs TEXT DEFAULT '{}',
    attachments TEXT DEFAULT '[]',
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS checkups (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    details TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    reportedByUserId TEXT,
    resolvedByUserId TEXT,
    assetId TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER,
    resolutionNote TEXT,
    resolvedDate TEXT,
    date TEXT NOT NULL,
    cost REAL,
    category TEXT,
    image TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    feedback TEXT DEFAULT '{}',
    fsr TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    dueDate TEXT,
    notes TEXT DEFAULT '[]',
    assignedToUserId TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS software_warranties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    assetId TEXT,
    purchaseDate TEXT,
    expireDate TEXT,
    dismissedAlerts TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    reason TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL,
    method TEXT,
    customFields TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS updates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    frequency TEXT NOT NULL,
    customFields TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS system_checks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    frequency TEXT NOT NULL,
    customFields TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    os TEXT,
    ipAddress TEXT,
    hardwareParts TEXT DEFAULT '[]',
    frequency TEXT NOT NULL,
    customFields TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS security_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    frequency TEXT NOT NULL,
    customFields TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS to_dos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL,
    priority TEXT NOT NULL,
    dueDate TEXT,
    assetId TEXT,
    userId TEXT,
    createdAt TEXT NOT NULL,
    completedAt TEXT,
    remarks TEXT,
    frequency TEXT,
    dayOfWeek INTEGER,
    dayOfMonth INTEGER
  );

  CREATE TABLE IF NOT EXISTS asset_history (
    id TEXT PRIMARY KEY,
    assetId TEXT NOT NULL,
    date TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS toner_logs (
    id TEXT PRIMARY KEY,
    assetId TEXT NOT NULL,
    date TEXT NOT NULL,
    tonerModel TEXT NOT NULL,
    cost REAL,
    performedBy TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    relatedId TEXT
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    userId TEXT,
    isPublic INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    steps TEXT NOT NULL,
    troubleshooting TEXT DEFAULT '[]',
    additionalNotes TEXT,
    category TEXT,
    pdfUrl TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    userId TEXT,
    isPublic INTEGER DEFAULT 0,
    allowedUserIds TEXT DEFAULT '[]',
    allowedRoles TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS daily_tasks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    department TEXT,
    task TEXT NOT NULL,
    category TEXT,
    startDate TEXT,
    endDate TEXT,
    assignedTo TEXT,
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    userId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT,
    role TEXT,
    category TEXT,
    phone TEXT,
    email TEXT,
    priority TEXT NOT NULL DEFAULT 'Secondary',
    notes TEXT,
    isStaffManual INTEGER DEFAULT 0,
    extension TEXT,
    createdAt TEXT NOT NULL,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'role' or 'user'
    targetId TEXT NOT NULL, -- role name (e.g., 'Technician') or userId
    resource TEXT NOT NULL, -- resource name (e.g., 'assets', 'tasks')
    canView INTEGER DEFAULT 0,
    canCreate INTEGER DEFAULT 0,
    canEdit INTEGER DEFAULT 0,
    canDelete INTEGER DEFAULT 0,
    UNIQUE(type, targetId, resource)
  );
`);

// Migration Helper
const ensureColumnExists = (tableName: string, columnName: string, columnType: string, defaultValue?: string) => {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    if (!info.some(c => c.name === columnName)) {
      console.log(`Adding column ${columnName} to table ${tableName}...`);
      const def = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : '';
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}${def}`).run();
    }
  } catch (e) {
    console.error(`Failed to add column ${columnName} to table ${tableName}:`, e);
  }
};

// Run all migrations
ensureColumnExists('settings', 'updatedAt', 'TEXT', 'CURRENT_TIMESTAMP');
ensureColumnExists('asset_types', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('asset_types', 'userVisibleStandardFields', 'TEXT', "'[]'");
ensureColumnExists('assets', 'tag', 'TEXT');
ensureColumnExists('procedures', 'isPublic', 'INTEGER', '0');
ensureColumnExists('procedures', 'allowedUserIds', 'TEXT', "'[]'");
ensureColumnExists('procedures', 'allowedRoles', 'TEXT', "'[]'");
ensureColumnExists('assets', 'serialNumber', 'TEXT');
ensureColumnExists('assets', 'purchaseDate', 'TEXT');
ensureColumnExists('assets', 'ipAddress', 'TEXT');
ensureColumnExists('assets', 'modelName', 'TEXT');
ensureColumnExists('assets', 'macAddress', 'TEXT');
ensureColumnExists('assets', 'specs', 'TEXT', "'{}'");
ensureColumnExists('assets', 'attachments', 'TEXT', "'[]'");
ensureColumnExists('assets', 'image', 'TEXT');
ensureColumnExists('issues', 'priority', 'TEXT', "'Medium'");
ensureColumnExists('issues', 'feedback', 'TEXT', "'{}'");
ensureColumnExists('issues', 'fsr', 'TEXT');
ensureColumnExists('issues', 'image', 'TEXT');
ensureColumnExists('issues', 'category', 'TEXT');
ensureColumnExists('issues', 'cost', 'REAL');
ensureColumnExists('issues', 'resolvedByUserId', 'TEXT');
ensureColumnExists('issues', 'assignedToUserId', 'TEXT');
ensureColumnExists('notes', 'isPublic', 'INTEGER', '0');
ensureColumnExists('procedures', 'pdfUrl', 'TEXT');
ensureColumnExists('procedures', 'troubleshooting', 'TEXT', "'[]'");
ensureColumnExists('procedures', 'additionalNotes', 'TEXT');
ensureColumnExists('to_dos', 'frequency', 'TEXT');
ensureColumnExists('to_dos', 'dayOfWeek', 'INTEGER');
ensureColumnExists('to_dos', 'dayOfMonth', 'INTEGER');
ensureColumnExists('software_warranties', 'dismissedAlerts', 'TEXT', "'[]'");
ensureColumnExists('backups', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('updates', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('system_checks', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('servers', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('security_items', 'customFields', 'TEXT', "'[]'");
ensureColumnExists('users', 'privateNote', 'TEXT');
ensureColumnExists('users', 'mobile', 'TEXT');
ensureColumnExists('users', 'extension', 'TEXT');
ensureColumnExists('contacts', 'isPublic', 'INTEGER', '0');
ensureColumnExists('contacts', 'isStaffManual', 'INTEGER', '0');
ensureColumnExists('contacts', 'extension', 'TEXT');
ensureColumnExists('contacts', 'userId', 'TEXT');
ensureColumnExists('servers', 'hardwareParts', 'TEXT', "'[]'");
ensureColumnExists('daily_tasks', 'assetId', 'TEXT');
ensureColumnExists('daily_tasks', 'targetUserId', 'TEXT');
ensureColumnExists('tasks', 'assignedToUserId', 'TEXT');
ensureColumnExists('tasks', 'userId', 'TEXT');
ensureColumnExists('users', 'status', 'TEXT', "'Active'");

// Ensure checkups table has all required columns
ensureColumnExists('checkups', 'categoryId', 'TEXT', "''");
ensureColumnExists('checkups', 'category', 'TEXT', "''");
ensureColumnExists('checkups', 'notes', 'TEXT');
ensureColumnExists('checkups', 'details', 'TEXT', "'{}'");

const getTableColumns = (tableName: string) => {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    return info.map(col => col.name);
  } catch (e) {
    return [];
  }
};

const tableExists = (tableName: string) => {
  try {
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    return !!result;
  } catch (e) {
    return false;
  }
};

// Migration to remove NOT NULL from assets.tag if it exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(assets)").all();
  const tagInfo = tableInfo.find((col: any) => col.name === 'tag');
  if (tagInfo && (tagInfo as any).notnull === 1) {
    console.log('Migrating assets table to remove NOT NULL from tag...');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE assets_new (
          id TEXT PRIMARY KEY,
          typeId TEXT NOT NULL,
          tag TEXT UNIQUE,
          serialNumber TEXT,
          purchaseDate TEXT,
          name TEXT NOT NULL,
          ipAddress TEXT,
          modelName TEXT,
          status TEXT NOT NULL,
          userId TEXT,
          locationId TEXT,
          macAddress TEXT,
          specs TEXT DEFAULT '{}',
          attachments TEXT DEFAULT '[]',
          image TEXT
        );
        INSERT INTO assets_new (id, typeId, tag, serialNumber, purchaseDate, name, ipAddress, modelName, status, userId, locationId, macAddress, specs, attachments, image)
        SELECT id, typeId, tag, serialNumber, purchaseDate, name, ipAddress, modelName, status, userId, locationId, macAddress, specs, attachments, image FROM assets;
        DROP TABLE assets;
        ALTER TABLE assets_new RENAME TO assets;
      `);
    })();
  }
} catch (e) {
  console.error('Migration failed for assets.tag:', e);
}

// Add default Backup & Restore procedure if it doesn't exist
const existingBackupProc = db.prepare('SELECT * FROM procedures WHERE title = ?').get('Backup and Restore Procedure');
if (!existingBackupProc) {
  const steps = JSON.stringify([
    { id: '1', text: 'Go to the Backup & Restore page from the sidebar.' },
    { id: '2', text: 'To Export: Click "Download JSON Backup" for a complete data dump including encrypted passwords (hashes).' },
    { id: '3', text: 'To Restore: Click the upload area and select your .json or .sqlite file.' },
    { id: '4', text: 'Confirm the restoration. Note: This will overwrite current data and restart the session.' }
  ]);
  const troubleshooting = JSON.stringify([
    { id: '1', issue: 'Restore fails with password error', solution: 'Ensure you are using a backup created after the password encryption update.' },
    { id: '2', issue: 'Cannot log in after restore', solution: 'If the backup was old and missing passwords, use the default password "Welcome@123" for restored users.' }
  ]);
  db.prepare(`
    INSERT INTO procedures (id, title, description, steps, troubleshooting, additionalNotes, category, createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'backup-restore-proc',
    'Backup and Restore Procedure',
    'Guidelines for backing up and restoring the IT Manager database.',
    steps,
    troubleshooting,
    'Always keep your backup files in a secure location as they contain sensitive hashed credentials.',
    'System',
    new Date().toISOString(),
    new Date().toISOString(),
    'system'
  );
}

// Initialize default settings
const initSettings = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
initSettings.run('admin_email', 'itmultiform@gmail.com');
initSettings.run('enable_email_alerts', 'true');
initSettings.run('warranty_alert_days', '30');
initSettings.run('company_name', 'IT Tech Manager');
initSettings.run('service_provider_name', 'Internal IT Support');
initSettings.run('ticket_id_prefix', 'TKT-');
initSettings.run('ticket_id_start', '1000');
initSettings.run('ticket_id_current', '1000');

// Default settings
const hasOfficeHours = db.prepare("SELECT 1 FROM settings WHERE key = 'office_hours'").get();
if (!hasOfficeHours) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('office_hours', JSON.stringify({ open: '08:00', close: '17:00', enabled: true }));
}

// Bootstrap Default Permissions
const bootstrapPermissions = () => {
  const roles = ['Admin', 'Technician', 'User'];
  const resources = [
    'assets', 'asset_types', 'locations', 'tasks', 'issues', 
    'checkups', 'software_warranties', 'notes', 
    'procedures', 'daily_tasks', 'users', 'logs', 'holidays',
    'backups', 'updates', 'system_checks', 'servers', 'security_items',
    'to_dos', 'asset_history', 'toner_logs', 'alerts', 'staff', 'settings', 'contacts',
    'dashboard', 'portal', 'tech_portal'
  ];

  roles.forEach(role => {
    resources.forEach(res => {
      let v = 0, c = 0, e = 0, d = 0;
      
      if (role === 'Admin') {
        v = 1; c = 1; e = 1; d = 1;
      } else if (role === 'Technician') {
        // Technicians can view and manage fields, but can't edit users/logs
        const sensitiveResources = ['users', 'logs'];
        v = 1;
        c = sensitiveResources.includes(res) ? 0 : 1;
        e = sensitiveResources.includes(res) ? 0 : 1;
        d = sensitiveResources.includes(res) ? 0 : 1;

        // Technician Command Center access
        if (res === 'tech_portal') {
          v = 1;
        }

        // Special case: Technicians MUST be able to create logs to record their own actions
        if (res === 'logs') {
          c = 1;
        }
      } else if (role === 'User') {
        // Users can mostly just view things, but can create issues
        if (['assets', 'procedures', 'notes', 'to_dos', 'portal', 'contacts', 'users'].includes(res)) {
          v = 1;
        }
        if (res === 'issues') {
          v = 1; c = 1;
        }
        if (['notes', 'to_dos', 'contacts'].includes(res)) {
          v = 1; c = 1; e = 1; d = 1; // Can manage own notes/to-dos/contacts
        }
        // Users MUST be able to create logs to record their own actions
        if (res === 'logs') {
          c = 1;
        }
      }
      
      db.prepare(`
        INSERT INTO permissions (id, type, targetId, resource, canView, canCreate, canEdit, canDelete)
        VALUES (?, 'role', ?, ?, ?, ?, ?, ?)
        ON CONFLICT(type, targetId, resource) DO UPDATE SET
          canView = excluded.canView,
          canCreate = excluded.canCreate,
          canEdit = excluded.canEdit,
          canDelete = excluded.canDelete
      `).run(generateServerId(), role, res, v, c, e, d);
    });
  });
};

bootstrapPermissions();

// Bootstrap Admin User
const adminExists = db.prepare('SELECT * FROM users WHERE id = ?').get('admin');
const adminPassword = bcrypt.hashSync('Admin@123', 10);
if (!adminExists) {
  db.prepare('INSERT INTO users (id, name, username, email, role, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('admin', 'Admin', 'admin', 'admin@example.com', 'Admin', adminPassword, 'Active');
} else {
  // Ensure password is correct for the user
  db.prepare('UPDATE users SET password = ?, username = ? WHERE id = ?').run(adminPassword, 'admin', 'admin');
}

// Bootstrap Technician User
const techExists = db.prepare('SELECT * FROM users WHERE id = ?').get('tech');
const techPassword = bcrypt.hashSync('Tech@123', 10);
if (!techExists) {
  db.prepare('INSERT INTO users (id, name, username, email, role, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('tech', 'Technician', 'tech', 'tech@example.com', 'Technician', techPassword, 'Active');
} else {
  db.prepare('UPDATE users SET password = ?, username = ? WHERE id = ?').run(techPassword, 'tech', 'tech');
}

// Bootstrap Regular User
const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get('user');
const regularPassword = bcrypt.hashSync('User@123', 10);
if (!userExists) {
  db.prepare('INSERT INTO users (id, name, username, email, role, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('user', 'User', 'user', 'user@example.com', 'User', regularPassword, 'Active');
} else {
  db.prepare('UPDATE users SET password = ?, username = ? WHERE id = ?').run(regularPassword, 'user', 'user');
}

// Bootstrap Default Asset Types
const assetTypesCount = db.prepare('SELECT COUNT(*) as count FROM asset_types').get() as { count: number };
if (assetTypesCount.count === 0) {
  const defaultAssetTypes = [
    { id: '1', name: 'Desktop', customFields: JSON.stringify([{ id: 'f1', name: 'RAM', type: 'text' }, { id: 'f2', name: 'Storage', type: 'text' }]) },
    { id: '2', name: 'Laptop', customFields: JSON.stringify([{ id: 'f3', name: 'RAM', type: 'text' }, { id: 'f4', name: 'Storage', type: 'text' }]) },
    { id: '3', name: 'Monitor', customFields: JSON.stringify([{ id: 'f5', name: 'Display Size', type: 'text' }, { id: 'f6', name: 'Resolution', type: 'text' }]) },
    { id: '4', name: 'Fingerprint machine', customFields: '[]' },
    { id: '5', name: 'Firewall', customFields: '[]' },
    { id: '6', name: 'Printer', customFields: '[]' },
    { id: '7', name: 'Scanner', customFields: '[]' },
    { id: '8', name: 'Server', customFields: JSON.stringify([{ id: 'f7', name: 'CPU', type: 'text' }, { id: 'f8', name: 'RAM', type: 'text' }]) },
    { id: '9', name: 'Switch', customFields: JSON.stringify([{ id: 'f9', name: 'Ports', type: 'number' }]) },
    { id: '10', name: 'Router', customFields: '[]' },
    { id: '11', name: 'Smart phone', customFields: '[]' },
    { id: '12', name: 'UPS', customFields: JSON.stringify([{ id: 'f10', name: 'Capacity', type: 'text' }]) },
  ];
  const insert = db.prepare('INSERT INTO asset_types (id, name, customFields) VALUES (?, ?, ?)');
  for (const type of defaultAssetTypes) {
    insert.run(type.id, type.name, type.customFields);
  }
}

// Bootstrap Work Days
const workDaysExists = db.prepare('SELECT * FROM settings WHERE key = ?').get('workDays');
if (!workDaysExists) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    .run('workDays', JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']));
}

// Encryption Helper for Credentials
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'it-manager-secret-key-32-chars-!!'; // Must be 32 chars
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}


// Ensure backups directory exists
const backupsDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Helper to get all data for JSON backup
const getBackupData = () => {
  const data: any = {};
  const tables = [
    'asset_types', 'locations', 'users', 'assets', 'checkups', 
    'issues', 'tasks', 'software_warranties', 'holidays', 'logs',
    'backups', 'updates', 'system_checks', 'servers', 'security_items', 'to_dos',
    'asset_history', 'toner_logs', 'notes', 'procedures', 'settings', 'daily_tasks', 'alerts', 'staff', 'contacts'
  ];
  
  tables.forEach(table => {
    try {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) return;
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
      data[table] = rows.map(row => {
        const newRow = { ...row };
        const jsonFieldsMap: Record<string, string[]> = {
          'asset_types': ['customFields'],
          'assets': ['specs', 'attachments'],
          'checkups': ['details'],
          'issues': ['feedback'],
          'tasks': ['notes'],
          'software_warranties': ['dismissedAlerts'],
          'backups': ['customFields'],
          'updates': ['customFields'],
          'system_checks': ['customFields'],
          'servers': ['hardwareParts', 'customFields'],
          'security_items': ['customFields'],
          'procedures': ['steps', 'troubleshooting']
        };
        
        if (jsonFieldsMap[table]) {
          jsonFieldsMap[table].forEach(field => {
            if (newRow[field]) {
              try {
                newRow[field] = JSON.parse(newRow[field]);
              } catch (e) {}
            }
          });
        }
        return newRow;
      });
    } catch (e) {
      console.error(`Error backing up table ${table}:`, e);
    }
  });
  return data;
};

const performBackup = async () => {
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all('backupPath', 'backupFormat', 'backupFrequency') as any[];
    const settingsMap: any = {};
    settingsRows.forEach(row => settingsMap[row.key] = row.value);
    
    const customPath = settingsMap.backupPath;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sqlite`;
    const jsonFilename = `backup-${timestamp}.json`;
    
    let targetDir = backupsDir;
    let usingCustomPath = false;

    // Check if we should use custom path
    if (customPath && customPath.trim() !== '') {
      try {
        // For Windows, check if it's a UNC path (starts with \\)
        const isUNC = customPath.startsWith('\\\\');
        
        // Normalize path: If it's a UNC path on Windows, be careful with normalization
        // Otherwise, standard normalization
        let normalizedPath = customPath.trim();
        if (!isUNC) {
          normalizedPath = normalizedPath.replace(/\\/g, '/');
        } else {
          // Keep UNC as is for FS calls if on Windows
          if (process.platform !== 'win32') {
             console.warn('[BACKUP] UNC path provided but NOT on Windows. This usually fails without mount.');
          }
        }

        if (!fs.existsSync(normalizedPath)) {
          console.log(`[BACKUP] Creating directory: ${normalizedPath}`);
          fs.mkdirSync(normalizedPath, { recursive: true });
        }
        targetDir = normalizedPath;
        usingCustomPath = true;
        console.log(`[BACKUP] Using target location: ${targetDir}`);
      } catch (err: any) {
        console.error(`[BACKUP] Custom path setup failed (${customPath}):`, err.message);
        console.log(`[BACKUP] Falling back to default: ${backupsDir}`);
      }
    }

    const backupFile = path.join(targetDir, filename);
    const jsonBackupFile = path.join(targetDir, jsonFilename);
    const csvFilename = `backup-${timestamp}.csv`;
    const csvBackupFile = path.join(targetDir, csvFilename);
    
    const format = settingsMap.backupFormat || 'Both';
    let savedFiles = [];

    // SQLite Backup
    if (format === 'Both' || format === 'SQLite') {
      console.log(`[BACKUP] Starting SQLite backup to: ${backupFile}`);
      await db.backup(backupFile);
      console.log(`[BACKUP] Success SQLite: ${backupFile}`);
      savedFiles.push(filename);
    }

    // JSON Backup
    if (format === 'Both' || format === 'JSON') {
      console.log(`[BACKUP] Starting JSON backup to: ${jsonBackupFile}`);
      const backupData = getBackupData();
      fs.writeFileSync(jsonBackupFile, JSON.stringify(backupData, null, 2));
      console.log(`[BACKUP] Success JSON: ${jsonBackupFile}`);
      savedFiles.push(jsonFilename);
    }

    // CSV Backup (Assets Only)
    if (format === 'CSV') {
       try {
         const assets = db.prepare('SELECT * FROM assets').all() as any[];
         const headers = ['id', 'typeId', 'tag', 'serialNumber', 'purchaseDate', 'name', 'ipAddress', 'modelName', 'status', 'userId', 'locationId', 'macAddress'];
         const csvRows = [headers.join(',')];
         assets.forEach(a => {
           csvRows.push(headers.map(h => `"${(a[h] || '').toString().replace(/"/g, '""')}"`).join(','));
         });
         fs.writeFileSync(csvBackupFile, csvRows.join('\n'));
         console.log(`[BACKUP] Success CSV: ${csvBackupFile}`);
         savedFiles.push(csvFilename);
       } catch (csvErr) {
         console.error('[BACKUP] CSV Export Error:', csvErr);
       }
    }
    
    // Log status in settings
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)")
      .run('lastBackupStatus', JSON.stringify({
        status: 'Success',
        time: new Date().toISOString(),
        location: usingCustomPath ? targetDir : 'Default Directory',
        file: savedFiles.join(' & ')
      }));

    // Cleanup old backups in the DEFAULT directory only
    // We don't want to accidentally delete files in user's custom network folders
    if (!usingCustomPath) {
      const allFiles = fs.readdirSync(backupsDir);
      
      const patterns = ['.sqlite', '.json', '.csv'];
      patterns.forEach(ext => {
        const files = allFiles
          .filter(f => f.endsWith(ext))
          .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
          
        if (files.length > 15) {
          files.slice(15).forEach(f => {
            try { fs.unlinkSync(path.join(backupsDir, f.name)); } catch (e) {}
          });
        }
      });
    }
  } catch (e: any) {
    console.error('[BACKUP] Error:', e);
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)")
        .run('lastBackupStatus', JSON.stringify({
          status: 'Error',
          time: new Date().toISOString(),
          message: e.message
        }));
    } catch (logErr) {}
  }
};

// Simple scheduler
let lastBackupDate = '';
setInterval(async () => {
  try {
    const settingsRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('autoBackupEnabled', 'backupTime', 'backupFrequency')").all() as any[];
    const set: any = {};
    settingsRows.forEach(r => set[r.key] = r.value);

    if (set.autoBackupEnabled !== 'true') return;

    const timeStr = set.backupTime || '02:00';
    const frequency = set.backupFrequency || 'Daily';
    
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    // Check if it's the right time
    if (currentTimeStr === timeStr && lastBackupDate !== todayStr) {
      let shouldRun = false;
      
      if (frequency === 'Daily') {
        shouldRun = true;
      } else if (frequency === 'Weekly') {
        // Run on Sundays for weekly
        if (now.getDay() === 0) shouldRun = true;
      } else if (frequency === 'Monthly') {
        // Run on 1st of month
        if (now.getDate() === 1) shouldRun = true;
      }

      if (shouldRun) {
        console.log(`[SCHEDULER] Triggering ${frequency} backup at ${currentTimeStr}`);
        lastBackupDate = todayStr; // Set this first to avoid double triggers if async takes time
        await performBackup();
      }
    }
  } catch (e) {
    // Silent catch for log/setting errors
  }
}, 60000); // Check every minute

const app = express();
  app.use(cors());
  
  // GLOBAL LOGGER FOR ALL REQUESTS
  app.use((req, res, next) => {
    console.log(`[GLOBAL] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const apiRouter = express.Router();
  app.use('/api', apiRouter);

  // Default settings

  // Serve uploaded files
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }
  app.use('/uploads', express.static('uploads'));

  // Diagnostic route on app
  app.get('/api-status', (req, res) => {
    console.log('[DIAGNOSTIC] /api-status called');
    res.json({ status: 'server-is-up', time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    console.log(`[AUTH] Admin check for user: ${userId}`);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (user && user.role === 'Admin') {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  };

  // API REQUEST LOGGER
  apiRouter.use((req, res, next) => {
    console.log(`[API ROUTER] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers['x-user-id'])}`);
    next();
  });

  // Diagnostic route on router
  apiRouter.get('/status', (req, res) => res.json({ status: 'api-router-is-up', time: new Date().toISOString() }));

  // Auth routes
  apiRouter.post('/auth/login', (req, res) => {
    console.log('Login attempt for:', req.body?.username);
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      if (user && bcrypt.compareSync(password, user.password)) {
        if (user.status === 'Inactive') {
          return res.status(403).json({ error: 'Your account is inactive. Please contact your administrator.' });
        }
        const { password: _, ...userSafe } = user;
        console.log(`Login successful for user: ${user.name}`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(userSafe);
      } else {
        console.warn(`Login failed for user: ${username}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error: any) {
      console.error('Login internal error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware to check permissions
  const checkPermission = (resource: string, action: 'view' | 'create' | 'edit' | 'delete') => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(401).json({ error: 'User not found' });
    (req as any).user = user;

    // Admin has superuser access
    if (user.role === 'Admin') return next();

    // Check individual user override first
    const userPerm = db.prepare("SELECT * FROM permissions WHERE type = 'user' AND targetId = ? AND resource = ?").get(userId, resource) as any;
    
    // Check role permission
    const rolePerm = db.prepare("SELECT * FROM permissions WHERE type = 'role' AND targetId = ? AND resource = ?").get(user.role, resource) as any;

    const column = action === 'view' ? 'canView' : action === 'create' ? 'canCreate' : action === 'edit' ? 'canEdit' : 'canDelete';
    
    const hasAccess = (userPerm && userPerm[column] === 1) || (rolePerm && rolePerm[column] === 1);

    if (hasAccess) {
      next();
    } else {
      res.status(403).json({ error: `Forbidden: You do not have ${action} permission for ${resource}` });
    }
  };

  // API Health check
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Generic CRUD helper
  const setupCrud = (tableName: string, routeName: string, jsonFields: string[] = [], excludeMethods: string[] = [], defaultSort: string = '') => {
    const resource = routeName.replace('-', '_');

    if (!excludeMethods.includes('GET')) {
      apiRouter.get(`/${routeName}`, checkPermission(resource, 'view'), (req, res) => {
      try {
        const user = (req as any).user;
        let query = `SELECT * FROM ${tableName}`;
        let params: any[] = [];

        // Data Isolation / Privacy Logic
        if (user) {
          if (routeName === 'notes') {
            // Notes are strictly private to the creator
            query += ` WHERE userId = ?`;
            params.push(user.id);
          } else if (routeName === 'contacts') {
            // For contacts: Regular users see theirs + public + staff directory
            if (user.role === 'User') {
              query += ` WHERE userId = ? OR isPublic = 1 OR isStaffManual = 1`;
              params.push(user.id);
            }
            // Technicians see everything (default query)
          } else if (routeName === 'procedures') {
            // Procedures: Public OR Owner OR explicitly allowed by user/role
            if (user.role !== 'Admin') {
              query += ` WHERE isPublic = 1 OR userId = ? OR allowedUserIds LIKE ? OR allowedRoles LIKE ?`;
              params.push(user.id, `%"${user.id}"%`, `%"${user.role}"%`);
            }
          } else if (user.role === 'User') {
            if (['tasks', 'issues', 'to-dos'].includes(routeName)) {
              if (routeName === 'to-dos') {
                query += ` WHERE userId = ?`;
                params.push(user.id);
              } else if (routeName === 'issues') {
                query += ` WHERE reportedByUserId = ? OR assignedToUserId = ?`;
                params.push(user.id, user.id);
              } else if (routeName === 'tasks') {
                query += ` WHERE userId = ? OR assignedToUserId = ?`;
                params.push(user.id, user.id);
              }
            }
          } else if (user.role === 'Technician') {
            // For tasks, issues, to-dos: Technicians see everything (already handled by default query)
          }
          // Admin sees everything (already handled by default query)
        }

        if (defaultSort) {
          query += ` ORDER BY ${defaultSort}`;
        }

        const rows = db.prepare(query).all(...params) as any[];
        const processed = rows.map(row => {
          const newRow = { ...row };
          jsonFields.forEach(field => {
            if (newRow[field]) {
              try {
                newRow[field] = JSON.parse(newRow[field]);
              } catch (e) {
                newRow[field] = null;
              }
            } else {
              newRow[field] = null;
            }
          });
          // Ensure JSON fields are at least empty objects/arrays if null
          jsonFields.forEach(field => {
            if (newRow[field] === null) {
              if (['specs', 'feedback', 'details'].includes(field)) {
                newRow[field] = {};
              } else {
                newRow[field] = [];
              }
            }
          });
          // Convert integer booleans back to JS booleans for specific fields
          if (tableName === 'to_dos' && 'completed' in newRow) newRow.completed = !!newRow.completed;
          if ((tableName === 'notes' || tableName === 'procedures' || tableName === 'contacts') && 'isPublic' in newRow) newRow.isPublic = !!newRow.isPublic;
          if (tableName === 'contacts' && 'isStaffManual' in newRow) newRow.isStaffManual = !!newRow.isStaffManual;
          
          // Don't send passwords
          if (tableName === 'users') {
            delete newRow.password;
            if (!user || (user.role !== 'Admin' && user.role !== 'Technician')) {
              delete newRow.privateNote;
            }
          }
          return newRow;
        });
        res.json(processed);
      } catch (e: any) {
        console.error(`GET /api/${routeName} failed:`, e);
        res.status(500).json({ error: e.message });
      }
    });
    }

    if (!excludeMethods.includes('POST')) {
      apiRouter.post(`/${routeName}`, checkPermission(resource, 'create'), (req, res) => {
      try {
        const data = req.body;
        const columns = getTableColumns(tableName);
        
        // Ensure ID and timestamps if missing
        if (!data.id) data.id = generateServerId();
        if (columns.includes('createdAt') && !data.createdAt) data.createdAt = new Date().toISOString();
        if (columns.includes('updatedAt') && !data.updatedAt) data.updatedAt = new Date().toISOString();
        if (columns.includes('userId') && !data.userId) data.userId = req.headers['x-user-id'];

        // Special handling for user password hashing
        if (tableName === 'users') {
          if (data.password && data.password.trim() !== '') {
            data.password = bcrypt.hashSync(data.password, 10);
          } else {
            delete data.password;
          }
          // Security: Only Admins and Technicians can set privateNote
          const user = (req as any).user;
          if (!user || (user.role !== 'Admin' && user.role !== 'Technician')) {
            delete data.privateNote;
          }
        }

        const keys = Object.keys(data).filter(k => columns.includes(k));
        if (keys.length === 0) {
          return res.status(400).json({ error: 'No valid fields provided' });
        }

        const values = keys.map(key => {
          let val = data[key];
          if (jsonFields.includes(key)) {
            const isObject = ['specs', 'feedback', 'details'].includes(key);
            return JSON.stringify(val === undefined || val === null ? (isObject ? {} : []) : val);
          }
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val === undefined || val === null) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });

        const placeholders = keys.map(() => '?').join(', ');
        const quotedKeys = keys.map(k => `"${k}"`).join(', ');
        const sql = `INSERT INTO "${tableName}" (${quotedKeys}) VALUES (${placeholders})`;
        try {
          db.prepare(sql).run(...values);
        } catch (dbErr: any) {
          console.error(`SQL EXECUTION ERROR in POST /api/${routeName}:`, dbErr.message);
          console.error(`SQL Query:`, sql);
          console.error(`Values:`, values);
          throw dbErr;
        }
        
        // Log critical actions
        if (['assets', 'users', 'settings', 'notes', 'procedures'].includes(tableName)) {
          const logId = generateServerId();
          db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
            .run(logId, new Date().toISOString(), `Create ${tableName}`, `Created item with ID: ${data.id}`, req.headers['x-user-id'] || null);
        }

        const newItem = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(data.id) as any;
        // Process JSON fields for the response
        jsonFields.forEach(field => {
          if (newItem[field]) {
            try { newItem[field] = JSON.parse(newItem[field]); } catch (e) { newItem[field] = null; }
          }
        });
        if (tableName === 'users') delete newItem.password;
        
        res.json(newItem);
      } catch (e: any) {
        console.error(`POST /api/${routeName} failed:`, e);
        res.status(500).json({ error: e.message });
      }
    });
    }

    const handleUpdate = (req: express.Request, res: express.Response) => {
      try {
        const { id } = req.params;
        const user = (req as any).user;
        const data = req.body;
        const columns = getTableColumns(tableName);

        // Security: Ensure users can only update their own items for private tables
        if (user && user.role === 'User') {
          if (['notes', 'to_dos', 'contacts'].includes(tableName)) {
            const existing = db.prepare(`SELECT userId FROM "${tableName}" WHERE id = ?`).get(id) as any;
            if (existing && existing.userId && existing.userId !== user.id) {
              return res.status(403).json({ error: 'You can only edit your own content' });
            }
          } else if (tableName === 'issues') {
            const existing = db.prepare(`SELECT reportedByUserId FROM ${tableName} WHERE id = ?`).get(id) as any;
            if (existing && existing.reportedByUserId !== user.id) {
              return res.status(403).json({ error: 'You can only edit your own reported issues' });
            }
          }
        }

        if (columns.includes('updatedAt')) data.updatedAt = new Date().toISOString();

        // Special handling for user password hashing
        if (tableName === 'users') {
          if (data.password && data.password.trim() !== '') {
            data.password = bcrypt.hashSync(data.password, 10);
          } else {
            delete data.password;
          }
          // Security: Only Admins and Technicians can update privateNote
          if (!user || (user.role !== 'Admin' && user.role !== 'Technician')) {
            delete data.privateNote;
          }
        }

        const keys = Object.keys(data).filter(k => columns.includes(k) && k !== 'id');
        if (keys.length === 0) {
          return res.status(400).json({ error: 'No valid fields provided' });
        }

        const values = keys.map(key => {
          let val = data[key];
          if (jsonFields.includes(key)) {
            const isObject = ['specs', 'feedback', 'details'].includes(key);
            return JSON.stringify(val === undefined || val === null ? (isObject ? {} : []) : val);
          }
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val === undefined || val === null) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });

        const setClause = keys.map(key => `"${key}" = ?`).join(', ');
        const sql = `UPDATE "${tableName}" SET ${setClause} WHERE "id" = ?`;
        
        // Fetch existing item for history logging if it's an asset or issue
        let existingItem: any = null;
        if (tableName === 'assets' || tableName === 'issues') {
          existingItem = db.prepare(`SELECT * FROM "${tableName}" WHERE "id" = ?`).get(id);
        }

        let result;
        try {
          result = db.prepare(sql).run(...values, id);
        } catch (dbErr: any) {
          console.error(`SQL EXECUTION ERROR in PUT /api/${routeName}:`, dbErr.message);
          console.error(`SQL Query:`, sql);
          console.error(`Values:`, [...values, id]);
          throw dbErr;
        }
        
        if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });

        // Specialized history logging for assets
        if (tableName === 'assets' && existingItem) {
          const changes = [];
          if (data.status && data.status !== existingItem.status) changes.push(`Status changed to ${data.status}`);
          if (data.locationId && data.locationId !== existingItem.locationId) {
            const loc = db.prepare('SELECT name FROM locations WHERE id = ?').get(data.locationId) as any;
            changes.push(`Moved to ${loc?.name || 'new location'}`);
          }
          if (data.userId && data.userId !== existingItem.userId) {
            const u = db.prepare('SELECT name FROM users WHERE id = ?').get(data.userId) as any;
            changes.push(`Assigned to ${u?.name || 'new user'}`);
          }

          if (changes.length > 0) {
            db.prepare('INSERT INTO asset_history (id, assetId, date, action, details, userId) VALUES (?, ?, ?, ?, ?, ?)')
              .run(generateServerId(), id, new Date().toISOString(), 'Update', changes.join(', '), req.headers['x-user-id'] || null);
          }
        }

        // Specialized history logging for issues
        if (tableName === 'issues' && existingItem && data.status === 'Resolved' && existingItem.status !== 'Resolved') {
            db.prepare('INSERT INTO asset_history (id, assetId, date, action, details, userId) VALUES (?, ?, ?, ?, ?, ?)')
              .run(generateServerId(), existingItem.assetId, new Date().toISOString(), 'Repair Completed', data.resolutionNote || 'Issue resolved', req.headers['x-user-id'] || null);
        }

        // Log critical actions
        if (['assets', 'users', 'settings', 'notes', 'procedures'].includes(tableName)) {
          const logId = generateServerId();
          db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
            .run(logId, new Date().toISOString(), `Update ${tableName}`, `Updated item with ID: ${id}`, req.headers['x-user-id'] || null);
        }

        const updatedItem = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id) as any;
        // Process JSON fields for the response
        jsonFields.forEach(field => {
          if (updatedItem[field]) {
            try { updatedItem[field] = JSON.parse(updatedItem[field]); } catch (e) { updatedItem[field] = null; }
          }
        });
        if (tableName === 'users') delete updatedItem.password;

        res.json(updatedItem);
      } catch (e: any) {
        console.error(`Update /api/${routeName}/${req.params.id} failed:`, e);
        res.status(500).json({ error: e.message });
      }
    };

    apiRouter.put(`/${routeName}/:id`, checkPermission(resource, 'edit'), handleUpdate);
    apiRouter.patch(`/${routeName}/:id`, checkPermission(resource, 'edit'), handleUpdate);

    apiRouter.delete(`/${routeName}/:id`, checkPermission(resource, 'delete'), (req, res) => {
      try {
        const { id } = req.params;
        const user = (req as any).user;

        // Security: Ensure users can only delete their own items for private tables
        if (user && user.role === 'User') {
          if (['notes', 'to_dos', 'contacts'].includes(tableName)) {
            const existing = db.prepare(`SELECT userId FROM "${tableName}" WHERE id = ?`).get(id) as any;
            if (existing && existing.userId && existing.userId !== user.id) {
              return res.status(403).json({ error: 'You can only delete your own content' });
            }
          } else if (tableName === 'issues') {
            const existing = db.prepare(`SELECT reportedByUserId FROM ${tableName} WHERE id = ?`).get(id) as any;
            if (existing && existing.reportedByUserId !== user.id) {
              return res.status(403).json({ error: 'You can only delete your own reported issues' });
            }
          }
        }

        // Prevent deleting the last admin
        if (tableName === 'users' && id === 'admin') {
          return res.status(400).json({ error: 'Cannot delete the primary admin account' });
        }
        const result = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
        
        if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });

        // Log critical actions
        if (['assets', 'users', 'settings', 'notes', 'procedures'].includes(tableName)) {
          const logId = generateServerId();
          db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
            .run(logId, new Date().toISOString(), `Delete ${tableName}`, `Deleted item with ID: ${id}`, req.headers['x-user-id'] || null);
        }

        res.status(204).send();
      } catch (e: any) {
        console.error(`DELETE /api/${routeName}/${req.params.id} failed:`, e);
        res.status(500).json({ error: e.message });
      }
    });
  };

  apiRouter.get('/issues/next-id', (req, res) => {
    try {
      const prefix = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_prefix'").get() as any;
      const current = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_current'").get() as any;
      const start = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_start'").get() as any;
      
      const p = prefix ? prefix.value : 'TKT-';
      const s = start ? parseInt(start.value) : 1000;
      const c = current ? parseInt(current.value) : s;
      
      res.json({ nextId: `${p}${c}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Custom POST for issues to handle ID sequencing
  apiRouter.post('/issues', checkPermission('issues', 'create'), (req, res) => {
    try {
      const data = { ...req.body };
      const columns = getTableColumns('issues');
      
      const prefixSetting = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_prefix'").get() as any;
      const currentSetting = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_current'").get() as any;
      const startSetting = db.prepare("SELECT value FROM settings WHERE key = 'ticket_id_start'").get() as any;
      
      const p = prefixSetting ? prefixSetting.value : 'TKT-';
      const startValue = startSetting ? parseInt(startSetting.value) : 1000;
      let c = currentSetting ? parseInt(currentSetting.value) : startValue;
      
      // Find the next available unique ID
      let ticketId = `${p}${c}`;
      let exists = db.prepare('SELECT 1 FROM issues WHERE id = ?').get(ticketId);
      
      while (exists) {
        c++;
        ticketId = `${p}${c}`;
        exists = db.prepare('SELECT 1 FROM issues WHERE id = ?').get(ticketId);
      }
      
      data.id = ticketId;
      if (!data.date) data.date = new Date().toISOString().split('T')[0];
      if (!data.status) data.status = 'Open';
      if (data.progress === undefined) data.progress = 0;

      // Filter keys to only valid columns
      const keys = Object.keys(data).filter(k => columns.includes(k));
      const placeholders = keys.map(() => '?').join(',');
      const quotedKeys = keys.map(k => `"${k}"`).join(',');
      const values = keys.map(col => {
        if (['feedback', 'fsr'].includes(col) && data[col]) {
          return JSON.stringify(data[col]);
        }
        return data[col];
      });

      db.prepare(`INSERT INTO issues (${quotedKeys}) VALUES (${placeholders})`).run(...values);
      
      // Update current ID to next one
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)")
        .run('ticket_id_current', (c + 1).toString());

      // Log the action
      const logId = generateServerId();
      db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
        .run(logId, new Date().toISOString(), 'Create Issue', `Reported issue with ID: ${ticketId}`, req.headers['x-user-id'] || null);

      // Return the newly created issue
      const newItem = db.prepare('SELECT * FROM issues WHERE id = ?').get(ticketId) as any;
      if (newItem.feedback) newItem.feedback = JSON.parse(newItem.feedback);
      if (newItem.fsr) newItem.fsr = JSON.parse(newItem.fsr);

      res.status(201).json(newItem);
    } catch (e: any) {
      console.error('Create issue failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  setupCrud('users', 'users');
  
  setupCrud('asset_types', 'asset-types', ['customFields', 'userVisibleStandardFields']);
  setupCrud('locations', 'locations');
  setupCrud('assets', 'assets', ['specs', 'attachments']);
  setupCrud('checkups', 'checkups', ['details']);
  setupCrud('issues', 'issues', ['feedback', 'fsr'], ['POST']);
  setupCrud('tasks', 'tasks', ['notes']);
  setupCrud('software_warranties', 'software-warranties', ['dismissedAlerts']);
  setupCrud('holidays', 'holidays');
  setupCrud('logs', 'logs', [], [], 'timestamp DESC');
  setupCrud('backups', 'backups', ['customFields']);
  setupCrud('updates', 'updates', ['customFields']);
  setupCrud('system_checks', 'system-checks', ['customFields']);
  setupCrud('servers', 'servers', ['hardwareParts', 'customFields']);
  setupCrud('security_items', 'security-items', ['customFields']);
  setupCrud('to_dos', 'to-dos', []);
  setupCrud('asset_history', 'asset-history', [], [], 'date DESC');
  setupCrud('toner_logs', 'toner-logs');
  setupCrud('notes', 'notes');
  setupCrud('procedures', 'procedures', ['steps', 'troubleshooting', 'allowedUserIds', 'allowedRoles']);
  setupCrud('daily_tasks', 'daily-tasks');
  setupCrud('staff', 'staff');
  setupCrud('contacts', 'contacts');
  apiRouter.get('/alerts', checkPermission('alerts', 'view'), (req, res, next) => {
    checkAlerts();
    next();
  });
  setupCrud('alerts', 'alerts');

  // ==========================================
  // NEW SYSTEM FEATURES: NETWORK & IP SCANNER
  // ==========================================

  // Network subnet & IP scanner simulation API
  apiRouter.get('/network/scan', checkPermission('assets', 'view'), (req, res) => {
    try {
      const assets = db.prepare('SELECT id, name, ipAddress, macAddress, status, modelName, typeId FROM assets WHERE ipAddress IS NOT NULL AND ipAddress != ""').all() as any[];
      const assetTypes = db.prepare('SELECT id, name FROM asset_types').all() as any[];

      // Resolve device type names
      const typeMap = new Map(assetTypes.map(t => [t.id, t.name]));

      // Get scanner subnet range
      const subnetPrefix = req.query.subnet as string || '192.168.1';
      
      const results = assets.map(asset => {
        const isOffline = asset.status === 'Retired' || asset.status === 'Inactive' || Math.random() < 0.05;
        const latency = isOffline ? null : parseFloat((Math.random() * 45 + 1).toFixed(1));
        const ports = isOffline ? [] : [80, 443, 22, 3389, 8080].filter(() => Math.random() > 0.6);
        if (!isOffline && ports.length === 0) ports.push(80); // default open port for active devices
        
        return {
          id: asset.id,
          ip: asset.ipAddress,
          mac: asset.macAddress || '00:1A:2B:3C:4D:' + asset.id.substring(0, 2).toUpperCase(),
          status: isOffline ? 'Offline' : 'Online',
          latency: latency ? `${latency}ms` : 'N/A',
          deviceName: asset.name,
          model: asset.modelName || 'Unknown Device model',
          deviceType: typeMap.get(asset.typeId) || 'Unknown',
          portsOpen: ports,
          lastSeen: new Date().toISOString()
        };
      });

      // Simulate discovering NEW/UNTRACKED devices on the network
      const untrackedDevices = [
        { ip: `${subnetPrefix}.134`, mac: 'F0:18:98:C3:A2:11', status: 'Online', latency: '4.2ms', deviceName: 'Subnet Printer 2', model: 'HP LaserJet Pro M404', deviceType: 'Printer', portsOpen: [9100, 80], lastSeen: new Date().toISOString(), isTracked: false },
        { ip: `${subnetPrefix}.201`, mac: '08:00:27:8A:3F:B2', status: 'Online', latency: '12.8ms', deviceName: 'IP-Camera-Entrance', model: 'Hikvision DS-2CD', deviceType: 'IoT', portsOpen: [554, 80], lastSeen: new Date().toISOString(), isTracked: false },
        { ip: `${subnetPrefix}.15`, mac: '3C:F7:A4:D9:ED:5C', status: 'Online', latency: '1.1ms', deviceName: 'Core-Switch-Stack', model: 'Cisco Catalyst 9300', deviceType: 'Switch', portsOpen: [22, 80, 443], lastSeen: new Date().toISOString(), isTracked: false },
        { ip: `${subnetPrefix}.88`, mac: '00:0C:29:12:34:56', status: 'Offline', latency: 'N/A', deviceName: 'Staging VM Host', model: 'ESXi Hypervisor', deviceType: 'Server', portsOpen: [], lastSeen: new Date(Date.now() - 3600000).toISOString(), isTracked: false }
      ];

      // Merge tracked results and add unassigned ones that aren't already registered
      const usedIps = new Set(results.map(r => r.ip));
      untrackedDevices.forEach(dev => {
        if (!usedIps.has(dev.ip)) {
          results.push({
            id: 'untracked-' + dev.ip.replace(/\./g, '-'),
            ip: dev.ip,
            mac: dev.mac,
            status: dev.status,
            latency: dev.latency,
            deviceName: dev.deviceName,
            model: dev.model,
            deviceType: dev.deviceType,
            portsOpen: dev.portsOpen,
            lastSeen: dev.lastSeen
          } as any);
        }
      });

      res.json({
        subnet: `${subnetPrefix}.0/24`,
        scanTime: new Date().toISOString(),
        totalScanned: results.length,
        onlineCount: results.filter(r => r.status === 'Online').length,
        devices: results
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Server Live Status & System Performance Metrics Endpoint
  apiRouter.get('/servers/:id/metrics', checkPermission('servers', 'view'), (req, res) => {
    try {
      const { id } = req.params;
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as any;
      if (!server) return res.status(404).json({ error: 'Server not found' });

      // Generate realistic randomized metric data
      const cpuLoad = Math.floor(Math.random() * 45) + 10; // 10% - 55%
      const ramTotal = 32; // GB
      const ramUsed = parseFloat((Math.random() * 12 + 8).toFixed(1)); // 8GB - 20GB
      const discTotal = 1024; // GB
      const discUsed = 485; // GB (static, simulate normal server layout)

      const status = cpuLoad > 85 || (ramUsed / ramTotal) > 0.9 ? 'Critical' : cpuLoad > 70 ? 'Warning' : 'Healthy';

      const metrics = {
        serverId: id,
        serverName: server.name,
        timestamp: new Date().toISOString(),
        status,
        metrics: {
          cpu: {
            usagePercent: cpuLoad,
            cores: 8,
            temperatures: [45, 48, 44, 46]
          },
          memory: {
            totalGB: ramTotal,
            usedGB: ramUsed,
            freeGB: parseFloat((ramTotal - ramUsed).toFixed(1)),
            usagePercent: Math.round((ramUsed / ramTotal) * 100)
          },
          storage: {
            totalGB: discTotal,
            usedGB: discUsed,
            freeGB: discTotal - discUsed,
            usagePercent: Math.round((discUsed / discTotal) * 100)
          },
          network: {
            bytesInPerSec: Math.floor(Math.random() * 8000000) + 100000, // 100KB/s - 8MB/s
            bytesOutPerSec: Math.floor(Math.random() * 14000000) + 500000 // 500KB/s - 14MB/s
          },
          uptime: `${Math.floor(Math.random() * 120) + 5} days, ${Math.floor(Math.random() * 24)} hours`
        }
      };

      res.json(metrics);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bulk Assets Upload & Import Endpoint
  apiRouter.post('/assets/bulk-import', checkPermission('assets', 'create'), (req, res) => {
    try {
      const { assets } = req.body;
      if (!assets || !Array.isArray(assets)) {
        return res.status(400).json({ error: 'Invalid payload: assets array is required' });
      }

      const columns = getTableColumns('assets');
      const insertStmt = db.prepare(`
        INSERT INTO assets (id, typeId, tag, serialNumber, purchaseDate, name, ipAddress, modelName, status, userId, locationId, macAddress, specs, attachments, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const errors: string[] = [];
      let importedCount = 0;

      db.transaction(() => {
        assets.forEach((asset, index) => {
          try {
            const id = asset.id || generateServerId();
            const typeId = asset.typeId;
            const name = asset.name;
            const status = asset.status || 'Active';
            
            if (!typeId) {
              throw new Error(`Asset at index ${index} is missing typeId`);
            }
            if (!name) {
              throw new Error(`Asset at index ${index} is missing name`);
            }

            // Ensure unique tag
            let tag = asset.tag;
            if (tag) {
              const exists = db.prepare('SELECT 1 FROM assets WHERE tag = ?').get(tag);
              if (exists) {
                tag = `${tag}-DUP`; // Avoid crashing with duplicate tag, rename gracefully
              }
            } else {
              tag = 'TAG-' + Math.floor(100000 + Math.random() * 900000);
            }

            insertStmt.run(
              id,
              typeId,
              tag,
              asset.serialNumber || null,
              asset.purchaseDate || new Date().toISOString().split('T')[0],
              name,
              asset.ipAddress || null,
              asset.modelName || null,
              status,
              asset.userId || null,
              asset.locationId || null,
              asset.macAddress || null,
              JSON.stringify(asset.specs || {}),
              JSON.stringify(asset.attachments || []),
              asset.image || null
            );

            importedCount++;
          } catch (err: any) {
            errors.push(`Row ${index + 1}: ${err.message}`);
          }
        });
      })();

      // Log bulk upload
      const logId = generateServerId();
      db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
        .run(logId, new Date().toISOString(), 'Bulk Import Assets', `Successfully imported ${importedCount} assets with ${errors.length} skipped rows`, req.headers['x-user-id'] || null);

      res.json({
        success: true,
        importedCount,
        failedCount: errors.length,
        errors
      });
    } catch (e: any) {
      console.error('Bulk assets upload failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Permissions Management APIs
  apiRouter.get('/auth-rules', checkAdmin, (req, res) => {
    try {
      const perms = db.prepare('SELECT * FROM permissions').all();
      res.json(perms);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/auth-rules', checkAdmin, (req, res) => {
    try {
      const { type, targetId, resource, canView, canCreate, canEdit, canDelete } = req.body;
      const id = generateServerId();
      db.prepare(`
        INSERT INTO permissions (id, type, targetId, resource, canView, canCreate, canEdit, canDelete)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(type, targetId, resource) DO UPDATE SET
          canView = excluded.canView,
          canCreate = excluded.canCreate,
          canEdit = excluded.canEdit,
          canDelete = excluded.canDelete
      `).run(id, type, targetId, resource, canView ? 1 : 0, canCreate ? 1 : 0, canEdit ? 1 : 0, canDelete ? 1 : 0);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.delete('/auth-rules/:id', checkAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM permissions WHERE id = ?').run(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/assets/bulk-delete', checkPermission('assets', 'delete'), (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
      
      const deleteStmt = db.prepare('DELETE FROM assets WHERE id = ?');
      const deleteHistoryStmt = db.prepare('DELETE FROM asset_history WHERE assetId = ?');
      const deleteTonerStmt = db.prepare('DELETE FROM toner_logs WHERE assetId = ?');
      
      const transaction = db.transaction((assetIds: string[]) => {
        for (const id of assetIds) {
          deleteStmt.run(id);
          deleteHistoryStmt.run(id);
          deleteTonerStmt.run(id);
        }
      });

      transaction(ids);
      
      const logId = generateServerId();
      db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
        .run(logId, new Date().toISOString(), 'Bulk Delete Assets', `Deleted ${ids.length} assets`, req.headers['x-user-id'] || null);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/assets/bulk-update-status', checkPermission('assets', 'edit'), (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
      
      const updateStmt = db.prepare('UPDATE assets SET status = ? WHERE id = ?');
      const historyStmt = db.prepare('INSERT INTO asset_history (id, assetId, date, action, details, userId) VALUES (?, ?, ?, ?, ?, ?)');
      
      const transaction = db.transaction((assetIds: string[], newStatus: string) => {
        for (const id of assetIds) {
          updateStmt.run(newStatus, id);
          historyStmt.run(generateServerId(), id, new Date().toISOString(), 'Bulk Update', `Status changed to ${newStatus}`, req.headers['x-user-id'] || null);
        }
      });

      transaction(ids, status);
      
      const logId = generateServerId();
      db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
        .run(logId, new Date().toISOString(), 'Bulk Update Asset Status', `Updated ${ids.length} assets to ${status}`, req.headers['x-user-id'] || null);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // Remove duplicate setupCrud calls
  // (These were accidentally added earlier)
  
  // Settings routes
  apiRouter.get('/sys-config', checkPermission('settings', 'view'), (req, res) => {
    try {
      const settings = db.prepare('SELECT * FROM settings').all();
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/sys-config', checkAdmin, (req, res) => {
    try {
      const updates = req.body;
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)');
      const transaction = db.transaction((data) => {
        for (const [key, value] of Object.entries(data)) {
          const val = typeof value === 'string' ? value : JSON.stringify(value);
          stmt.run(key, val);
        }
      });
      transaction(updates);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/sys-config/workDays', checkPermission('settings', 'view'), (req, res) => {
    try {
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('workDays') as any;
      if (setting) {
        res.json(JSON.parse(setting.value));
      } else {
        res.json(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/sys-config/workDays', checkAdmin, (req, res) => {
    try {
      const { value } = req.body;
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)').run('workDays', JSON.stringify(value));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/sys-config/office_hours', checkPermission('settings', 'view'), (req, res) => {
    try {
      const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get('office_hours') as any;
      res.json(setting || { value: JSON.stringify({ open: '08:00', close: '17:00', enabled: true }) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/sys-config/office_hours', checkAdmin, (req, res) => {
    try {
      const { value } = req.body;
      // If value is an object, stringify it. If it's already a string, use it.
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)').run('office_hours', val);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Alert checking logic
  const checkAlerts = () => {
    try {
      const now = new Date();
      const adminEmail = (db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_email') as any)?.value || 'itmultiform@gmail.com';
      const enableEmail = (db.prepare('SELECT value FROM settings WHERE key = ?').get('enable_email_alerts') as any)?.value === 'true';
      const alertDays = parseInt((db.prepare('SELECT value FROM settings WHERE key = ?').get('warranty_alert_days') as any)?.value || '30');

      // 1. Check Software Warranties
      const warranties = db.prepare('SELECT * FROM software_warranties').all() as any[];
      
      // Cleanup: Remove warranty alerts if the warranty is deleted, or if its active expiration date is no longer in the alert window, or if the alert is for an old/previous expiration date.
      const existingWarrantyAlerts = db.prepare("SELECT id, relatedId FROM alerts WHERE type = 'Warranty'").all() as any[];
      existingWarrantyAlerts.forEach(alert => {
        const w = db.prepare('SELECT * FROM software_warranties WHERE id = ?').get(alert.relatedId) as any;
        if (!w) {
          db.prepare('DELETE FROM alerts WHERE id = ?').run(alert.id);
        } else {
          if (!w.expireDate) {
            db.prepare('DELETE FROM alerts WHERE id = ?').run(alert.id);
          } else {
            const expireDate = new Date(w.expireDate);
            if (isNaN(expireDate.getTime())) {
              db.prepare('DELETE FROM alerts WHERE id = ?').run(alert.id);
            } else {
              const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const expectedAlertId = `warranty_${w.id}_${expireDate.toISOString().split('T')[0]}`;
              if (alert.id !== expectedAlertId || diffDays <= 0 || diffDays > alertDays) {
                db.prepare('DELETE FROM alerts WHERE id = ?').run(alert.id);
              }
            }
          }
        }
      });

      warranties.forEach(w => {
        if (!w.expireDate) return;
        const expireDate = new Date(w.expireDate);
        if (isNaN(expireDate.getTime())) return;
        const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0 && diffDays <= alertDays) {
          const alertId = `warranty_${w.id}_${expireDate.toISOString().split('T')[0]}`;
          const existing = db.prepare('SELECT id FROM alerts WHERE id = ?').get(alertId);
          if (!existing) {
            db.prepare('INSERT INTO alerts (id, type, message, date, relatedId) VALUES (?, ?, ?, ?, ?)')
              .run(alertId, 'Warranty', `Software/Warranty "${w.name}" expires in ${diffDays} days (${w.expireDate})`, now.toISOString(), w.id);
            
            if (enableEmail) {
              console.log(`[EMAIL ALERT] To: ${adminEmail} | Subject: Warranty Expiration | Message: ${w.name} expires in ${diffDays} days.`);
            }
          }
        }
      });

      // 2. Check High & Medium Priority Issues
      const activeIssues = db.prepare('SELECT * FROM issues WHERE priority IN (?, ?) AND status != ?').all('High', 'Medium', 'Resolved') as any[];
      
      // Cleanup: Remove alerts for issues that are now resolved or deleted, or demoted to Low priority
      const existingIssueAlerts = db.prepare("SELECT id, relatedId FROM alerts WHERE type = 'Issue'").all() as any[];
      existingIssueAlerts.forEach(alert => {
        const issue = db.prepare('SELECT status, priority FROM issues WHERE id = ?').get(alert.relatedId) as any;
        if (!issue || issue.status === 'Resolved' || issue.priority === 'Low') {
          db.prepare('DELETE FROM alerts WHERE id = ?').run(alert.id);
        }
      });

      activeIssues.forEach(issue => {
        const alertId = `issue_${issue.id}`;
        const existing = db.prepare('SELECT id FROM alerts WHERE id = ?').get(alertId);
        if (!existing) {
          const priorityLabel = issue.priority === 'High' ? 'High Priority' : 'New';
          const message = `${priorityLabel} Issue reported: ${issue.category || issue.type} - ${issue.description.substring(0, 50)}...`;
          db.prepare('INSERT INTO alerts (id, type, message, date, relatedId) VALUES (?, ?, ?, ?, ?)')
            .run(alertId, 'Issue', message, now.toISOString(), issue.id);
          
          if (enableEmail) {
            console.log(`[EMAIL ALERT] To: ${adminEmail} | Subject: Issue Alert | Message: ${message}`);
          }
        }
      });
    } catch (e) {
      console.error('Alert check failed:', e);
    }
  };

  // Run alert check every hour
  setInterval(checkAlerts, 1000 * 60 * 60);
  // Also run on startup
  setTimeout(checkAlerts, 5000);

  // Backup & Restore
  apiRouter.get('/admin/export-json', checkAdmin, (req, res) => {
    try {
      const data = getBackupData();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/admin/download-db', checkAdmin, async (req, res) => {
    try {
      const tempExportPath = path.join(process.cwd(), `export-${Date.now()}.sqlite`);
      await db.backup(tempExportPath);
      res.download(tempExportPath, 'it-manager-database.sqlite', (err) => {
        try {
          if (fs.existsSync(tempExportPath)) fs.unlinkSync(tempExportPath);
        } catch (e) {}
      });
    } catch (e: any) {
      console.error('Download DB failed:', e);
      res.status(500).json({ error: 'Failed to create database export: ' + e.message });
    }
  });

  apiRouter.post('/admin/reset-db', checkAdmin, (req, res) => {
    const { username, password } = req.body;
    // Verify admin credentials again for safety
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'Admin'").get(username) as any;
    if (user && bcrypt.compareSync(password, user.password)) {
      try {
        db.transaction(() => {
          const tables = [
            'asset_types', 'locations', 'users', 'assets', 'checkups', 
            'issues', 'tasks', 'software_warranties', 'holidays', 'logs',
            'backups', 'updates', 'system_checks', 'servers', 'security_items', 'to_dos',
            'asset_history', 'toner_logs', 'notes', 'procedures', 'settings'
          ];
          tables.forEach(table => db.prepare(`DELETE FROM ${table}`).run());
          
          // Re-insert the admin user who performed the reset
          const adminPassword = bcrypt.hashSync(password, 10);
          db.prepare('INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)')
            .run(user.id, user.name, username, adminPassword, 'Admin', user.email);
            
          // Log the reset
          const logId = generateServerId();
          db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
            .run(logId, new Date().toISOString(), 'Database Reset', 'Full database reset performed by admin', user.id);
        })();
        res.json({ success: true });
      } catch (e: any) {
        console.error('Reset failed:', e);
        res.status(500).json({ error: e.message });
      }
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  });

  apiRouter.post('/admin/restore-json', checkAdmin, (req, res) => {
    const data = req.body;
    try {
      const logId = generateServerId();
      db.prepare('INSERT INTO logs (id, timestamp, action, details, userId) VALUES (?, ?, ?, ?, ?)')
        .run(logId, new Date().toISOString(), 'JSON Restore', 'Restoring database from JSON', req.headers['x-user-id']);

      db.transaction(() => {
        const tables = [
          'asset_types', 'locations', 'users', 'assets', 'checkups', 
          'issues', 'tasks', 'software_warranties', 'holidays', 'logs',
          'backups', 'updates', 'system_checks', 'servers', 'security_items', 'to_dos',
          'asset_history', 'toner_logs', 'notes', 'procedures', 'settings', 'daily_tasks', 'alerts', 'staff', 'permissions'
        ];
        
        tables.forEach(table => {
          if (tableExists(table)) {
            db.prepare(`DELETE FROM ${table}`).run();
          }
        });

        const insertData = (tableName: string, items: any[], jsonFields: string[] = [], boolFields: string[] = []) => {
          if (!items || !Array.isArray(items) || items.length === 0) return;
          if (!tableExists(tableName)) return;
          
          const columns = getTableColumns(tableName);
          
          for (const item of items) {
            // Mapping for compatibility
            const mappedItem = { ...item };
            
            // Handle common camelCase to snake_case mappings and Vice Versa
            Object.keys(item).forEach(key => {
              const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
              const camel = key.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
              
              if (columns.includes(camel) && !mappedItem[camel]) mappedItem[camel] = item[key];
              if (columns.includes(snake) && !mappedItem[snake]) mappedItem[snake] = item[key];
            });

            // Specific known mappings
            if (tableName === 'asset_types' && item.custom_fields) mappedItem.customFields = item.custom_fields;
            if (tableName === 'asset_types' && item.user_visible_standard_fields) mappedItem.userVisibleStandardFields = item.user_visible_standard_fields;
            
            const keys = Object.keys(mappedItem).filter(k => columns.includes(k));
            if (keys.length === 0) continue;
            
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(key => {
              let val = mappedItem[key];
              
              // Handle NOT NULL fallbacks for critical fields
              if (val === undefined || val === null) {
                if (key === 'createdAt' || key === 'updatedAt' || key === 'date') return new Date().toISOString();
                if (key === 'id') return generateServerId();
                if (['title', 'task', 'description', 'status', 'priority'].includes(key)) return '';
                if (['completed', 'isPublic'].includes(key)) return 0;
              }

              if (jsonFields.includes(key)) {
                if (val === undefined || val === null) {
                   const isObject = ['specs', 'feedback', 'details'].includes(key);
                   return JSON.stringify(isObject ? {} : []);
                }
                if (typeof val === 'string') {
                  try {
                    JSON.parse(val);
                    return val;
                  } catch (e) {
                    return JSON.stringify(val);
                  }
                }
                return JSON.stringify(val);
              }
              if (val !== null && typeof val === 'object') {
                return JSON.stringify(val);
              }
              if (boolFields.includes(key) || typeof val === 'boolean') {
                return val ? 1 : 0;
              }
              return val === undefined ? null : val;
            });
            
            try {
              const quotedKeys = keys.map(k => `"${k}"`).join(', ');
              db.prepare(`INSERT OR REPLACE INTO "${tableName}" (${quotedKeys}) VALUES (${placeholders})`).run(...values);
            } catch (err: any) {
              console.error(`!!!! CRITICAL DATABASE ERROR in table "${tableName}" [ID: ${mappedItem.id}]:`, err.message);
              // Report actual column info if insert fails
              try {
                const info = db.prepare(`PRAGMA table_info("${tableName}")`).all();
                console.log(`Table ${tableName} columns:`, info.map((i: any) => i.name));
                console.log(`Failed Keys:`, keys);
                console.log(`Failed Values:`, values);
              } catch (ex) {}
            }
          }
        };

        insertData('asset_types', data.assetTypes || data.asset_types || [], ['customFields']);
        insertData('locations', data.locations || []);
        
        // Handle users specially to ensure passwords exist
        const rawUsers = data.users || [];
        const usersToRestore = rawUsers.map((u: any) => {
          const user = { ...u };
          if (!user.password || user.password.trim() === '') {
            const roleDefaults: Record<string, string> = {
              'Admin': 'Admin@123',
              'Technician': 'Tech@123',
              'User': 'User@123'
            };
            user.password = bcrypt.hashSync(roleDefaults[user.role] || 'User@123', 10);
          }
          return user;
        });
        insertData('users', usersToRestore);

        insertData('assets', data.assets || [], ['specs', 'attachments']);
        insertData('issues', data.issues || [], ['feedback']);
        insertData('tasks', data.tasks || [], ['notes']);
        insertData('software_warranties', data.softwareWarranties || data.software_warranties || [], ['dismissedAlerts']);
        insertData('holidays', data.holidays || []);
        insertData('logs', data.logs || []);
        insertData('backups', data.backups || [], ['customFields']);
        insertData('updates', data.updates || [], ['customFields']);
        insertData('system_checks', data.systemChecks || data.system_checks || [], ['customFields']);
        insertData('servers', data.servers || [], ['hardwareParts', 'customFields']);
        insertData('security_items', data.securityItems || data.security_items || [], ['customFields']);
        insertData('to_dos', data.toDos || data.to_dos || [], [], ['completed']);
        insertData('asset_history', data.assetHistory || data.asset_history || []);
        insertData('toner_logs', data.tonerLogs || data.toner_logs || []);
        insertData('notes', data.notes || [], [], ['isPublic']);
        insertData('procedures', data.procedures || [], ['steps', 'troubleshooting'], ['isPublic']);
        insertData('permissions', data.permissions || []);
        
        // Restore checkups later to ensure category IDs exist if foreign keys are enabled manually
        insertData('checkups', data.checkups || [], ['details']);
        
        // Handle settings which might be an object or an array
        if (data.settings && !Array.isArray(data.settings)) {
          const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)');
          for (const [key, value] of Object.entries(data.settings)) {
            const val = typeof value === 'string' ? value : JSON.stringify(value);
            stmt.run(key, val);
          }
        } else {
          insertData('settings', data.settings || []);
        }

        insertData('daily_tasks', data.dailyTasks || data.daily_tasks || []);
        insertData('staff', data.staff || []);
        insertData('alerts', data.alerts || []);
      })();
      res.json({ success: true });
    } catch (e: any) {
      console.error('Restore failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/admin/restore-db', checkAdmin, upload.single('database'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const tempPath = req.file.path;
    
    try {
      // 1. Verify uploaded file is a healthy SQLite database before replacing live db
      try {
        const testConn = tryOpenDatabase(tempPath);
        testConn.close();
      } catch (testErr: any) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return res.status(400).json({ error: 'Uploaded file is not a valid SQLite database or is corrupt: ' + testErr.message });
      }

      const targetPath = path.join(process.cwd(), 'database.sqlite');
      
      // Close active database cleanly
      if (db && db.open) {
        try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
        db.close();
      }

      // Remove lingering WAL/SHM files
      if (fs.existsSync(`${targetPath}-wal`)) try { fs.unlinkSync(`${targetPath}-wal`); } catch (e) {}
      if (fs.existsSync(`${targetPath}-shm`)) try { fs.unlinkSync(`${targetPath}-shm`); } catch (e) {}

      // Overwrite with uploaded file
      fs.copyFileSync(tempPath, targetPath);
      fs.unlinkSync(tempPath);
      
      // Re-open database
      db = tryOpenDatabase(targetPath);
      
      // Keep verified backup up to date
      await db.backup(dbBackupFile);

      res.json({ success: true, message: 'Database restored successfully. Server will restart.' });
      
      // Give some time for response to be sent
      setTimeout(() => {
        process.exit(0); 
      }, 1000);
    } catch (e: any) {
      console.error('DB Restore failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/admin/backups', checkAdmin, (req, res) => {
    try {
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.sqlite'))
        .map(f => {
          const stats = fs.statSync(path.join(backupsDir, f));
          return {
            name: f,
            size: stats.size,
            createdAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/admin/backups/download/:filename', checkAdmin, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(backupsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  });

  apiRouter.post('/admin/backups/trigger', checkAdmin, async (req, res) => {
    try {
      await performBackup();
      res.json({ success: true, message: 'Backup completed successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Manual backup failed' });
    }
  });

  apiRouter.delete('/admin/backups/:filename', checkAdmin, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(backupsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Catch-all for unknown API routes
  // Final Catch-all for API Router
  apiRouter.all('*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Final Error Handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('UNHANDLED SERVER ERROR:', err);
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // SPA fallback for development
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  const handleShutdown = () => {
    console.log('[SERVER] Shutting down gracefully...');
    try {
      if (db && db.open) {
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.close();
        console.log('[DATABASE] Closed database cleanly.');
      }
    } catch (e) {
      console.error('[DATABASE] Error closing database during shutdown:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  console.log(`[INIT] Ready to listen on port ${PORT}`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- SERVER RUNNING ---`);
    console.log(`URL: http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('FAILED TO START SERVER:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});
