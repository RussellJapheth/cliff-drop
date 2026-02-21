import Database from 'better-sqlite3';
import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { env } from '$env/dynamic/private';

const DB_PATH = env.DATABASE_PATH || './data/drop.db';
const TURSO_URL = env.TURSO_DATABASE_URL;
const TURSO_TOKEN = env.TURSO_AUTH_TOKEN;

function isTursoConfigured(): boolean {
    return !!(TURSO_URL && TURSO_TOKEN);
}

let sqlite: Database.Database | null = null;
let libsqlClient: Client | null = null;

function getLocalDb() {
    if (!sqlite) {
        // Ensure data directory exists
        const dbDir = dirname(DB_PATH);
        if (!existsSync(dbDir)) {
            mkdirSync(dbDir, { recursive: true });
        }

        sqlite = new Database(DB_PATH);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');
    }
    return sqlite;
}

function getTursoClient(): Client {
    if (!libsqlClient) {
        libsqlClient = createClient({
            url: TURSO_URL!,
            authToken: TURSO_TOKEN!
        });
    }
    return libsqlClient;
}

// Export unified db interface
export const db = isTursoConfigured()
    ? drizzleLibsql(getTursoClient(), { schema })
    : drizzleBetterSqlite(getLocalDb(), { schema });

// Export for raw SQL operations (used in init.ts)
export const isTurso = isTursoConfigured();
export { sqlite };

export async function execRawSql(sql: string): Promise<void> {
    if (isTursoConfigured()) {
        await getTursoClient().execute(sql);
    } else {
        getLocalDb().exec(sql);
    }
}

export async function execRawSqlBatch(statements: string[]): Promise<void> {
    if (isTursoConfigured()) {
        await getTursoClient().batch(statements);
    } else {
        const localDb = getLocalDb();
        for (const stmt of statements) {
            localDb.exec(stmt);
        }
    }
}
