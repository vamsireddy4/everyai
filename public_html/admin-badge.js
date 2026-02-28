/**
 * admin-badge.js
 * Manages the unread-message badge AND background notifications for admin pages.
 *
 * Usage (pages OTHER than admin-support.html):
 *   import { startBadgePolling } from './admin-badge.js';
 *   startBadgePolling(convex);
 *
 * Usage (admin-support.html):
 *   import { markAllSeen, startBadgePolling } from './admin-badge.js';
 *   markAllSeen(messages);
 *   startBadgePolling(convex);
 */

const SEEN_KEY = 'everyai_seen_msg_ids';
const NOTIF_ICON = 'https://res.cloudinary.com/dhar8ajns/image/upload/v1772262509/6dcaf38d-db53-4e3e-ad76-592ed4ff3b73_ipzypu.png';
const ALERT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// ── Notification Permission ────────────────────────────────────────────────
/** Request browser notification permission. Call once on page load. */
export async function requestNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// ── localStorage helpers ───────────────────────────────────────────────────
function getSeenIds() {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch { return new Set(); }
}
function saveSeenIds(set) {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

// ── Badge UI ──────────────────────────────────────────────────────────────
function updateBadgeUI(count) {
    document.querySelectorAll('#msg-badge').forEach(badge => {
        if (count <= 0) {
            badge.style.display = 'none';
            badge.textContent = '0';
        } else {
            badge.style.display = 'inline-flex';
            badge.textContent = count > 9 ? '9+' : String(count);
        }
    });
}

// ── Sound ─────────────────────────────────────────────────────────────────
let lastSoundTime = 0;
function playAlert() {
    const now = Date.now();
    if (now - lastSoundTime < 3000) return; // debounce
    lastSoundTime = now;
    try {
        const audio = new Audio(ALERT_SOUND);
        audio.volume = 0.8;
        audio.play().catch(() => { }); // silently fail if browser blocks
    } catch (_) { }
}

// ── Browser Notification ──────────────────────────────────────────────────
function showBrowserNotif(newCount, latestMsg) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const title = newCount === 1
        ? '📩 New Support Message'
        : `📩 ${newCount} New Support Messages`;

    const body = latestMsg
        ? `From ${latestMsg.name}: ${latestMsg.subject}`
        : 'You have unread support messages.';

    const notif = new Notification(title, {
        body,
        icon: NOTIF_ICON,
        badge: NOTIF_ICON,
        tag: 'everyai-support',       // replaces previous notification instead of stacking
        renotify: true,               // play sound even if same tag
        requireInteraction: false,
        silent: false                 // allow OS to play its default notification sound
    });

    // Clicking the notification focuses the admin support page
    notif.onclick = () => {
        window.focus();
        notif.close();
        window.location.href = '/admin-support.html';
    };
}

// ── Public API ────────────────────────────────────────────────────────────

/** Marks a list of messages as seen (called on admin-support page load). */
export function markAllSeen(messages) {
    const seen = getSeenIds();
    messages.forEach(m => seen.add(m._id));
    saveSeenIds(seen);
    updateBadgeUI(0);
}

/** Marks a single message as seen and recalculates the badge. */
export function markOneSeen(id, allMessages) {
    const seen = getSeenIds();
    seen.add(id);
    saveSeenIds(seen);
    const unread = allMessages.filter(m => !seen.has(m._id)).length;
    updateBadgeUI(unread);
}

/**
 * Starts polling Convex every 5 s for new messages.
 * Fires a browser notification + sound when new unread messages appear.
 */
export async function startBadgePolling(convex) {
    // Ask for notification permission immediately
    await requestNotifPermission();

    let prevUnread = null; // null = first run, skip notification

    async function tick() {
        try {
            const messages = await convex.query('messages:getMessages');
            const seen = getSeenIds();
            const unread = messages.filter(m => !seen.has(m._id)).length;

            updateBadgeUI(unread);

            // Fire notification + sound only when count genuinely increased
            if (prevUnread !== null && unread > prevUnread) {
                const newCount = unread - prevUnread;
                // Find the most recent unseen message
                const latestMsg = messages.find(m => !seen.has(m._id));
                playAlert();
                showBrowserNotif(newCount, latestMsg);
            }

            prevUnread = unread;
        } catch (e) {
            console.warn('Badge poll failed:', e);
        }
    }

    await tick();                   // run immediately on load
    setInterval(tick, 5000);        // then every 5 s
}
