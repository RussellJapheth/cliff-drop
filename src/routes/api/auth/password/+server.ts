import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { verifyPassword, changePassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.authenticated) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return json({ error: 'Both current and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return json({ error: 'New password must be at least 8 characters' }, { status: 400 });
        }

        const valid = await verifyPassword(currentPassword);

        if (!valid) {
            return json({ error: 'Current password is incorrect' }, { status: 401 });
        }

        await changePassword(newPassword);

        return json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        return json({ error: 'Failed to change password' }, { status: 500 });
    }
};
