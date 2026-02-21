import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSessionFromCookies, deleteSession, clearSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
    const sessionId = getSessionFromCookies(cookies);

    if (sessionId) {
        deleteSession(sessionId);
    }

    clearSessionCookie(cookies);

    return json({ success: true });
};
