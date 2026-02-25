// tracker.js — shared visit tracker included by ALL pages
// Fires on every page load. Convex upserts into the current hour bucket,
// so the DB stays clean (one row per hour) with an accurate running count.
import { convex } from './convex-client.js';

(async function trackVisit() {
    try {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const bucket = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
        await convex.mutation("analytics:recordVisit", { bucket });
    } catch (_) { }
})();
