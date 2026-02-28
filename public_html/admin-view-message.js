
import { convex } from "./convex-client.js";

const $ = id => document.getElementById(id);
const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];

async function initAdminAuth() {
    if (!window.Clerk) {
        setTimeout(initAdminAuth, 100);
        return;
    }

    try {
        await window.Clerk.load();

        if (window.Clerk.user) {
            const email = window.Clerk.user.primaryEmailAddress.emailAddress.toLowerCase();
            if (AUTHORIZED_EMAILS.includes(email)) {
                setupAdminUserButton();
                loadMessageDetails();
            } else {
                window.location.href = 'index.html';
            }
        } else {
            const overlay = $('admin-auth-overlay');
            if (overlay) overlay.style.display = 'flex';
            window.Clerk.mountSignIn($('clerk-sign-in'), {
                fallbackRedirectUrl: window.location.href
            });
        }
    } catch (err) {
        console.error('Error loading Clerk Admin Auth:', err);
    }
}

function setupAdminUserButton() {
    const userButtonDiv = document.getElementById('clerk-admin-user-button');
    if (userButtonDiv) {
        window.Clerk.mountUserButton(userButtonDiv, {
            afterSignOutUrl: '/index.html'
        });
    }
}

async function loadMessageDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        showToast("No message ID provided.", "error");
        setTimeout(() => window.location.href = 'admin-support.html', 2000);
        return;
    }

    try {
        const message = await convex.query("messages:getMessage", { id });

        if (!message) {
            showToast("Message not found.", "error");
            setTimeout(() => window.location.href = 'admin-support.html', 2000);
            return;
        }

        // Populate fields
        $('msg-subject').textContent = message.subject;
        $('msg-name').textContent = message.name;
        $('msg-email').textContent = message.email;
        $('msg-date').textContent = new Date(message.timestamp).toLocaleString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        $('msg-body').textContent = message.message;
        $('reply-btn').href = `mailto:${message.email}?subject=Re: ${message.subject}`;

        // Delete handler
        $('delete-btn').onclick = async () => {
            if (!confirm("Are you sure you want to permanently delete this message?")) return;
            try {
                await convex.mutation("messages:deleteMessage", { id: message._id });
                showToast("Message deleted successfully.", "success");
                setTimeout(() => window.location.href = 'admin-support.html', 1500);
            } catch (err) {
                showToast("Failed to delete message.", "error");
            }
        };

        // Switch views
        $('loading-view').style.display = 'none';
        $('message-view').style.display = 'block';

    } catch (err) {
        console.error("Failed to load message:", err);
        showToast("Failed to load message details.", "error");
    }
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('admin-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `admin-toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Init ──────────────────────────────────────────────────────────
(async () => {
    initAdminAuth();

    $('theme-toggle')?.addEventListener('change', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });

    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light');
        if ($('theme-toggle')) $('theme-toggle').checked = true;
    }
})();
