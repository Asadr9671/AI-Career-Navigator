import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let databaseUrl = process.env.DATABASE_URL;

if (process.env.VERCEL === '1') {
  // On Vercel, use /tmp which is writable
  const srcDb = path.join(process.cwd(), 'prisma', 'db', 'custom.db');
  const destDb = '/tmp/custom.db';
  
  try {
    // If the database doesn't exist in /tmp, copy it from the bundled location
    if (!fs.existsSync(destDb)) {
      console.log(`[db] Copying SQLite db from ${srcDb} to ${destDb}`);
      
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(destDb), { recursive: true });
      
      if (fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, destDb);
      } else {
        console.warn(`[db] Source database file not found at ${srcDb}. Will create a new empty database.`);
      }
    } else {
      console.log(`[db] SQLite db already exists at ${destDb}`);
    }
  } catch (err) {
    console.error('[db] Failed to copy SQLite db to /tmp:', err);
  }
  
  databaseUrl = 'file:' + destDb;
  process.env.DATABASE_URL = databaseUrl;
} else {
  // Locally, resolve path absolutely to prisma/db/custom.db to avoid relative path mismatch
  // between Next.js dev server and Prisma CLI commands.
  const localDb = path.join(process.cwd(), 'prisma', 'db', 'custom.db');
  databaseUrl = 'file:' + localDb;
  process.env.DATABASE_URL = databaseUrl;
}

console.log(`[db] Initializing Prisma with DATABASE_URL: ${process.env.DATABASE_URL}`);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
