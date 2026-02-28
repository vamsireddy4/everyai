
import { convex } from "./convex-client.js";

const $ = id => document.getElementById(id);
const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];

// ── Image handling state ──────────────────────────────────────────
let base64Image = null; // holds the base64 string if a file was uploaded

const categoryImages = {
    'youtube': 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80',
    'instagram': 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=800&q=80',
    'twitter': 'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=800&q=80',
    'facebook': 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&w=800&q=80',
    'copywriting': 'https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&w=800&q=80',
    'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'coding': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    'education': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
    'business': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    'seo': 'https://images.unsplash.com/photo-1572177812156-58036aae439c?auto=format&fit=crop&w=800&q=80',
    'email': 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=800&q=80',
    'design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
    'video': 'https://images.unsplash.com/photo-1536240478700-b869ad10a2eb?auto=format&fit=crop&w=800&q=80',
    'writing': 'https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&w=800&q=80',
    'productivity': 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=800&q=80',
    'sales': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
    'ai': 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80',
    'general': 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80',
};

window.switchImgTab = (tab) => {
    document.getElementById('tab-url').classList.toggle('active', tab === 'url');
    document.getElementById('tab-upload').classList.toggle('active', tab === 'upload');
    document.getElementById('panel-url').classList.toggle('active', tab === 'url');
    document.getElementById('panel-upload').classList.toggle('active', tab === 'upload');

    if (tab === 'url') {
        base64Image = null;
        // If categories have a match, let's suggest it
        const cat = $('prompt-category')?.value?.trim()?.toLowerCase();
        if (cat && categoryImages[cat] && !$('prompt-image-url').value) {
            $('prompt-image-url').value = categoryImages[cat];
        }
        previewImage();
    } else {
        $('prompt-image-url').value = '';
        setPreview(null);
    }
};

window.previewImage = () => {
    const url = $('prompt-image-url')?.value?.trim();
    setPreview(url || null);
};

window.handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5 MB.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        base64Image = e.target.result;
        setPreview(base64Image);
        // Show filename
        const label = document.querySelector('.upload-area-label span:first-of-type');
        if (label) label.textContent = file.name;
    };
    reader.readAsDataURL(file);
};

function setPreview(src) {
    const wrap = $('img-preview');
    if (!wrap) return;
    if (src) {
        wrap.innerHTML = `<img src="${src}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Invalid image URL</span>'" />`;
    } else {
        wrap.innerHTML = '<span>Image preview will appear here</span>';
    }
}

function getImageUrl() {
    // Prefer file upload, fall back to URL
    if (base64Image) return base64Image;
    const url = $('prompt-image-url')?.value?.trim();
    return url || null;
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('admin-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `admin-toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Auth ──────────────────────────────────────────────────────────
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
                loadPrompts();
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
            afterSignOutUrl: '/index.html',
            customMenuItems: [
                {
                    label: "Dashboard",
                    href: "/admin.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'; },
                    unmountIcon: () => { }
                },
                {
                    label: "Profile",
                    href: "/admin-profile.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; },
                    unmountIcon: () => { }
                },
                {
                    label: "Blogs",
                    href: "/admin-blogs.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'; },
                    unmountIcon: () => { }
                },
                {
                    label: "Prompts",
                    href: "/admin-prompts.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>'; },
                    unmountIcon: () => { }
                },
                {
                    label: "Support",
                    href: "/admin-support.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="14" y2="13"></line></svg>'; },
                    unmountIcon: () => { }
                }
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

// ── Load prompts table ────────────────────────────────────────────
async function loadPrompts() {
    const list = $('prompts-list');
    if (!list) return;

    try {
        const prompts = await convex.query("prompts:getPrompts");
        if (prompts.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-muted)">No prompts found.</td></tr>';
            return;
        }

        list.innerHTML = prompts.map(p => {
            const thumbSrc = p.imageUrl || '';
            const thumb = thumbSrc
                ? `<img src="${thumbSrc}" alt="thumb" style="width:56px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />`
                : `<div style="width:56px;height:40px;border-radius:6px;background:var(--bg-base);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
            return `
            <tr>
                <td>${thumb}</td>
                <td style="font-weight:600">${p.title}</td>
                <td>${p.category || 'N/A'}</td>
                <td>
                    <button class="btn-sm btn-delete" onclick="deletePrompt('${p._id}')">Delete</button>
                </td>
            </tr>
        `;
        }).join('');
    } catch (err) {
        console.error("Failed to load prompts:", err);
    }
}

window.deletePrompt = async (id) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    try {
        await convex.mutation("prompts:deletePrompt", { id });
        loadPrompts();
        showToast("Prompt deleted.", "success");
    } catch (err) {
        showToast("Failed to delete prompt: " + err.message, "error");
    }
};

// ── Form submit ───────────────────────────────────────────────────
$('prompt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const imageUrl = getImageUrl();
    const videoUrl = $('prompt-video-url').value.trim();

    const formData = {
        title: $('prompt-title').value.trim(),
        category: $('prompt-category').value.trim(),
        content: $('prompt-content').value.trim(),
        timestamp: new Date().toISOString(),
        ...(imageUrl ? { imageUrl } : {}),
        ...(videoUrl ? { videoUrl } : {})
    };

    try {
        await convex.mutation("prompts:createPrompt", formData);
        e.target.reset();
        base64Image = null;
        setPreview(null);
        const fileInput = $('prompt-image-file');
        if (fileInput) fileInput.value = '';
        const urlInput = $('prompt-image-url');
        if (urlInput) urlInput.value = '';
        const videoInput = $('prompt-video-url');
        if (videoInput) videoInput.value = '';
        await loadPrompts();
        showToast("Prompt saved successfully!", "success");
    } catch (err) {
        showToast("Failed to save prompt: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Prompt';
    }
});

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

    $('hamburger')?.addEventListener('click', () => {
        $('mobile-menu').classList.toggle('open');
        $('hamburger').classList.toggle('open');
    });

    // Auto-fill image URL based on category
    $('prompt-category')?.addEventListener('input', (e) => {
        const cat = e.target.value.trim().toLowerCase();
        const urlInput = $('prompt-image-url');
        // Only auto-fill if the URL input is currently empty and we are in URL mode
        if (cat && categoryImages[cat] && !urlInput.value && !base64Image) {
            urlInput.value = categoryImages[cat];
            previewImage();
        }
    });

})();
