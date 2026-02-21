import { db, execRawSqlBatch, isTurso } from './index';
import { account } from './schema';
import * as argon2 from 'argon2';
import { env } from '$env/dynamic/private';

const DEFAULT_PASSWORD = env.DEFAULT_PASSWORD || 'changeme';

export async function initializeDatabase() {
    // Create tables
    await execRawSqlBatch([
        `CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('text', 'file', 'link')),
            content TEXT,
            file_name TEXT,
            mime_type TEXT,
            size INTEGER,
            group_id TEXT,
            created_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at)`,
        `CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id)`,
        `CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS account (
            id INTEGER PRIMARY KEY,
            password_hash TEXT NOT NULL
        )`
    ]);

    // Migrate: add group_id column if it doesn't exist (only for local SQLite)
    if (!isTurso) {
        try {
            await execRawSqlBatch([`ALTER TABLE messages ADD COLUMN group_id TEXT`]);
        } catch {
            // Column already exists, ignore error
        }
    }

    // Check if account exists
    const existingAccount = await db.select().from(account).get();

    if (!existingAccount) {
        // Create default account
        const passwordHash = await argon2.hash(DEFAULT_PASSWORD, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4
        });

        await db.insert(account).values({
            id: 1,
            passwordHash
        }).run();

        console.log('Default account created. Password:', DEFAULT_PASSWORD);
        console.log('IMPORTANT: Change this password immediately!');
    }

    if (isTurso) {
        console.log('Using Turso database');
    } else {
        console.log('Using local SQLite database');
    }
}
