// tracker.js — shared visit tracker included by ALL pages
import { convex } from './convex-client.js';

(async function trackVisit() {
    try {
        const path = window.location.pathname.toLowerCase();

        // Only track blog traffic when users visit public blog pages
        // Never track admin pages as blog traffic
        const isBlogPage = (path.includes('blogs.html') || path.includes('blog-post.html'));
        const isAdminPage = path.includes('admin');

        const isAdminSession = localStorage.getItem('everyai_is_admin') === 'true';
        if (isAdminSession) return; // Don't track admin browsing ever

        let type;
        if (isBlogPage && !isAdminPage) {
            type = 'blog';
        } else if (!isAdminPage) {
            type = 'website';
        } else {
            return; // Don't track admin page visits at all
        }

        await convex.mutation("analytics:recordVisit", { type });
    } catch (_) { }
})();
