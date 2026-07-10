import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const action = process.argv[2];
const backupDir = resolve(process.argv[3] || process.env.DB_BACKUP_DIR || './backups');
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const run = (command, args) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });

if (!['create', 'restore'].includes(action)) {
  console.error('Usage: node scripts/backupDatabase.js <create|restore> [backupDir]');
  process.exit(1);
}

if (!mongoUri) {
  console.error('MONGO_URI or MONGODB_URI is required for backups.');
  process.exit(1);
}

if (action === 'create' && !existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = action === 'create' ? resolve(backupDir, `apex-${timestamp}`) : backupDir;

try {
  if (action === 'create') {
    await run('mongodump', ['--uri', mongoUri, '--out', outputDir]);
    console.log(`Backup created at ${outputDir}`);
  } else {
    if (!existsSync(outputDir)) {
      throw new Error(`Restore directory does not exist: ${outputDir}`);
    }

    if (process.env.ALLOW_DB_RESTORE !== 'true') {
      throw new Error('Set ALLOW_DB_RESTORE=true to confirm restore operation.');
    }

    await run('mongorestore', ['--uri', mongoUri, '--drop', outputDir]);
    console.log(`Restore completed from ${outputDir}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
