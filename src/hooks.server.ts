import type { Handle } from '@sveltejs/kit';
import { initializeDatabase } from '$lib/server/db/init';
import { isAuthenticated } from '$lib/server/auth';
import { startHeartbeat } from '$lib/server/websocket';

// Initialize database on server start
initializeDatabase().catch(console.error);

// Start WebSocket heartbeat
startHeartbeat();

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export const handle: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;

    // Allow static assets
    if (path.startsWith('/_app') || path.startsWith('/favicon') || path.endsWith('.webmanifest') || path.endsWith('.png') || path.endsWith('.svg')) {
        return resolve(event);
    }

    // Check authentication for protected routes
    const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p));
    const authenticated = await isAuthenticated(event.cookies);

    // Set auth state for use in routes
    event.locals.authenticated = authenticated;

    if (!isPublic && !authenticated) {
        // Redirect to login
        return new Response(null, {
            status: 302,
            headers: { Location: '/login' }
        });
    }

    // If authenticated and trying to access login, redirect to home
    if (path === '/login' && authenticated) {
        return new Response(null, {
            status: 302,
            headers: { Location: '/' }
        });
    }

    // Add security headers
    const response = await resolve(event);

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // CSP header
    if (!path.startsWith('/api/')) {
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self'; frame-ancestors 'none';"
        );
    }

    return response;
};
