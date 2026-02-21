import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { verifyPassword, createSession, setSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { password } = await request.json();

        if (!password || typeof password !== 'string') {
            return json({ error: 'Password is required' }, { status: 400 });
        }

        const valid = await verifyPassword(password);

        if (!valid) {
            return json({ error: 'Invalid password' }, { status: 401 });
        }

        const { sessionId, expiresAt } = await createSession();
        setSessionCookie(cookies, sessionId, expiresAt);

        return json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return json({ error: 'Login failed' }, { status: 500 });
    }
};
