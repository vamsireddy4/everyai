
import { convex } from "./convex-client.js";
import { markAllSeen, markOneSeen, startBadgePolling } from "./admin-badge.js";

const $ = id => document.getElementById(id);
const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];
const PAGE_SIZE = 10;

// ── Pagination State ──────────────────────────────────────────────────
let allMessages = [];
let msgPage = 1;

let allComments = [];
let cmtPage = 1;

// ── Auth ──────────────────────────────────────────────────────────────
async function initAdminAuth() {
    if (!window.Clerk) { setTimeout(initAdminAuth, 100); return; }
    try {
        await window.Clerk.load();
        if (window.Clerk.user) {
            const email = window.Clerk.user.primaryEmailAddress.emailAddress.toLowerCase();
            if (AUTHORIZED_EMAILS.includes(email)) {
                setupAdminUserButton();
                loadMessages();
                loadComments();
                startPolling();
            } else {
                window.location.href = 'index.html';
            }
        } else {
            const overlay = $('admin-auth-overlay');
            if (overlay) overlay.style.display = 'flex';
            window.Clerk.mountSignIn($('clerk-sign-in'), { fallbackRedirectUrl: window.location.href });
        }
    } catch (err) { console.error('Error loading Clerk Admin Auth:', err); }
}

function setupAdminUserButton() {
    const userButtonDiv = document.getElementById('clerk-admin-user-button');
    if (userButtonDiv) {
        window.Clerk.mountUserButton(userButtonDiv, {
            afterSignOutUrl: '/index.html',
            customMenuItems: [
                { label: "Dashboard", href: "/admin.html", mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'; }, unmountIcon: () => { } },
                { label: "Profile", href: "/admin-profile.html", mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; }, unmountIcon: () => { } },
                { label: "Blogs", href: "/admin-blogs.html", mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'; }, unmountIcon: () => { } },
                { label: "Prompts", href: "/admin-prompts.html", mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>'; }, unmountIcon: () => { } },
                { label: "Support", href: "/admin-support.html", mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="14" y2="13"></line></svg>'; }, unmountIcon: () => { } }
            ],
            appearance: {
                elements: {
                    userButtonPopoverActionButton__manageAccount: { display: 'none' },
                    userButtonAvatarBox: { width: '32px', height: '32px' }
                }
            }
        });
    }
}

// ── Support Messages ───────────────────────────────────────────────────
let lastMessageCount = 0;
let isFirstLoad = true;

async function loadMessages() {
    const list = $('messages-list');
    if (!list) return;
    try {
        const messages = await convex.query("messages:getMessages");

        if (isFirstLoad) {
            lastMessageCount = messages.length;
            isFirstLoad = false;
        } else {
            if (messages.length > lastMessageCount) playNotification();
            lastMessageCount = messages.length;
        }

        allMessages = messages;
        markAllSeen(messages);      // Admin is on support page → badge = 0
        renderMessages();
    } catch (err) { console.error("Failed to load messages:", err); }
}

function renderMessages() {
    const list = $('messages-list');
    if (!list) return;

    const total = allMessages.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (msgPage > totalPages) msgPage = totalPages;

    const start = (msgPage - 1) * PAGE_SIZE;
    const slice = allMessages.slice(start, start + PAGE_SIZE);

    // Info + pagination controls
    const info = $('msg-page-info');
    if (info) info.textContent = total === 0 ? 'No messages' : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;
    const prev = $('msg-prev'); const next = $('msg-next');
    if (prev) { prev.disabled = msgPage <= 1; prev.style.opacity = msgPage <= 1 ? '0.4' : '1'; }
    if (next) { next.disabled = msgPage >= totalPages; next.style.opacity = msgPage >= totalPages ? '0.4' : '1'; }

    if (slice.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted)">No messages yet.</td></tr>';
        return;
    }

    list.innerHTML = slice.map(m => {
        const date = new Date(m.timestamp).toLocaleDateString();
        return `
        <tr>
            <td style="font-weight:600">${m.name}</td>
            <td>${m.subject}</td>
            <td class="message-preview">${m.message}</td>
            <td>${date}</td>
            <td class="action-btns">
                <a href="admin-view-message.html?id=${m._id}" class="btn-sm btn-view" style="text-decoration:none">View</a>
                <button class="btn-sm btn-delete" onclick="deleteMessage('${m._id}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

window.changeMsgPage = (dir) => { msgPage += dir; renderMessages(); };

window.deleteMessage = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
        await convex.mutation("messages:deleteMessage", { id });
        allMessages = allMessages.filter(m => m._id !== id);
        renderMessages();
        showToast("Message deleted.", "success");
    } catch (err) { showToast("Failed to delete message: " + err.message, "error"); }
};

// ── Blog Comments ───────────────────────────────────────────────────────
async function loadComments() {
    try {
        allComments = await convex.query("comments:getComments");
        renderComments();
    } catch (err) { console.error("Failed to load comments:", err); }
}

function renderComments() {
    const list = $('comments-list');
    if (!list) return;

    const total = allComments.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (cmtPage > totalPages) cmtPage = totalPages;

    const start = (cmtPage - 1) * PAGE_SIZE;
    const slice = allComments.slice(start, start + PAGE_SIZE);

    const info = $('cmt-page-info');
    if (info) info.textContent = total === 0 ? 'No comments' : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;
    const prev = $('cmt-prev'); const next = $('cmt-next');
    if (prev) { prev.disabled = cmtPage <= 1; prev.style.opacity = cmtPage <= 1 ? '0.4' : '1'; }
    if (next) { next.disabled = cmtPage >= totalPages; next.style.opacity = cmtPage >= totalPages ? '0.4' : '1'; }

    if (slice.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted)">No comments yet.</td></tr>';
        return;
    }

    list.innerHTML = slice.map(c => {
        const date = new Date(c.timestamp).toLocaleDateString();
        const hasReply = c.adminReply ? `<span style="font-size:0.75rem; background:rgba(92,184,92,0.15); color:var(--accent-1); padding:2px 8px; border-radius:9999px; margin-left:6px;">Replied</span>` : '';
        return `
        <tr>
            <td style="font-weight:600">${c.name}${hasReply}</td>
            <td style="font-size:0.85rem; color:var(--text-muted); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.blogTitle || c.blogSlug || '—'}</td>
            <td class="message-preview">${c.comment}</td>
            <td>${date}</td>
            <td class="action-btns">
                <button class="btn-sm btn-view" onclick="viewComment('${c._id}')">View</button>
                <button class="btn-sm btn-delete" onclick="deleteComment('${c._id}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

window.changeCmtPage = (dir) => { cmtPage += dir; renderComments(); };

window.viewComment = (id) => {
    window.location.href = `admin-view-comment.html?id=${id}`;
};


window.deleteComment = async (id) => {
    if (!confirm("Delete this comment?")) return;
    try {
        await convex.mutation("comments:deleteComment", { id });
        allComments = allComments.filter(c => c._id !== id);
        renderComments();
        showToast("Comment deleted.", "success");
    } catch (err) { showToast("Failed to delete: " + err.message, "error"); }
};

// ── Polling ──────────────────────────────────────────────────────────────
let pollingStarted = false;
function startPolling() {
    if (pollingStarted) return;
    pollingStarted = true;
    setInterval(() => { loadMessages(); loadComments(); }, 5000);
}

// ── Audio Notification ────────────────────────────────────────────────────
let lastNotificationTime = 0;
function playNotification() {
    const now = Date.now();
    if (now - lastNotificationTime < 2000) return;
    lastNotificationTime = now;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => { });
    showToast("New support message received!", "success");
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('admin-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `admin-toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Init ──────────────────────────────────────────────────────────────────
(async () => {
    initAdminAuth();
    startBadgePolling(convex);

    $('theme-toggle')?.addEventListener('change', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light');
        if ($('theme-toggle')) $('theme-toggle').checked = true;
    }

    $('hamburger')?.addEventListener('click', () => {
        $('mobile-menu').classList.toggle('open');
        $('hamburger').classList.toggle('open');
    });
})();
