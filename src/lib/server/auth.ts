import { db } from './db';
import { account, sessions } from './db/schema';
import { eq, lt } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_DAYS = 30;

export async function verifyPassword(password: string): Promise<boolean> {
    const acc = await db.select().from(account).where(eq(account.id, 1)).get();
    if (!acc) return false;

    try {
        return await argon2.verify(acc.passwordHash, password);
    } catch {
        return false;
    }
}

export async function changePassword(newPassword: string): Promise<void> {
    const passwordHash = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });

    await db.update(account)
        .set({ passwordHash })
        .where(eq(account.id, 1))
        .run();
}

export async function createSession(): Promise<{ sessionId: string; expiresAt: Date }> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
        id: sessionId,
        expiresAt,
        createdAt: new Date()
    }).run();

    return { sessionId, expiresAt };
}

export async function validateSession(sessionId: string): Promise<boolean> {
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();

    if (!session) return false;

    if (session.expiresAt < new Date()) {
        // Session expired, delete it
        await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
        return false;
    }

    return true;
}

export async function deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    await db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
}

export function setSessionCookie(cookies: Cookies, sessionId: string, expiresAt: Date): void {
    cookies.set(SESSION_COOKIE_NAME, sessionId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt
    });
}

export function getSessionFromCookies(cookies: Cookies): string | undefined {
    return cookies.get(SESSION_COOKIE_NAME);
}

export function clearSessionCookie(cookies: Cookies): void {
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export async function isAuthenticated(cookies: Cookies): Promise<boolean> {
    const sessionId = getSessionFromCookies(cookies);
    if (!sessionId) return false;
    return await validateSession(sessionId);
}
