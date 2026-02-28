
// Clerk logic loaded via initAdminAuth()
/* ================================================================
   EveryAI – Admin Logic
   ================================================================ */

'use strict';

import { convex } from "./convex-client.js";
import { startBadgePolling } from "./admin-badge.js";

// Visit tracking is handled by tracker.js or app.js logic on other pages.
// Admin pages are excluded from tracking.

const $ = id => document.getElementById(id);
const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];

let allSubmissions = [];
let currentStatusFilter = 'all';
let currentPage = 1;
const pageSize = 10;

// ── Auth Logic ─────────────────────────────────────────────────────

window.loadDashboard = loadDashboard;
window.loadProfile = loadProfile;
window.logout = () => {
    localStorage.removeItem('everyai_is_admin');
    if (window.Clerk) {
        window.Clerk.signOut().then(() => window.location.href = 'index.html');
    }
};
let isAuthInitializing = false;
async function initAdminAuth() {
    if (isAuthInitializing) return;
    if (!window.Clerk) {
        setTimeout(initAdminAuth, 100);
        return;
    }
    isAuthInitializing = true;

    try {
        await window.Clerk.load();

        if (window.Clerk.user) {
            const email = window.Clerk.user.primaryEmailAddress.emailAddress.toLowerCase();
            if (AUTHORIZED_EMAILS.includes(email)) {
                localStorage.setItem('everyai_is_admin', 'true');
                const overlay = $('admin-auth-overlay');
                if (overlay) overlay.style.display = 'none';
                if (typeof startDashboardRealtime === 'function') startDashboardRealtime();
                const adminLink = $('admin-dashboard-link');
                if (adminLink) adminLink.style.display = 'block';
                setupAdminUserButton();
                startNewSubmissionPolling();
                startMessagePolling();
            } else {
                document.body.innerHTML = `
                <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-base); color: var(--text-primary); position: fixed; inset: 0; z-index: 9999;">
                    <div style="background: var(--bg-surface); padding: 48px; border-radius: var(--radius-lg); text-align: center; border: 1px solid var(--border); box-shadow: var(--shadow-lg); max-width: 450px; width: 90%;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 24px;">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <h2 style="margin: 0 0 12px 0; font-family: var(--font-head); font-size: 1.5rem;">Access Denied</h2>
                        <p style="color: var(--text-secondary); margin: 0 0 24px 0; font-size: 0.95rem;">The email <strong>${email}</strong> does not have permission to view the EveryAI admin dashboard.</p>
                        <button onclick="window.Clerk.signOut().then(() => window.location.href='index.html')" style="background: var(--bg-base); color: var(--text-primary); border: 1px solid var(--border); padding: 12px 24px; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-family: var(--font-sans); transition: all 0.2s; width: 100%;">Sign Out & Return Home</button>
                    </div>
                </div>`;
            }
        } else {
            const overlay = $('admin-auth-overlay');
            if (overlay) overlay.style.display = 'flex';
            // Mount Clerk Sign In
            const authCard = document.querySelector('#admin-auth-overlay > div');
            if (authCard) {
                authCard.innerHTML = '<div id="clerk-sign-in" style="width: 100%; max-width: 450px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: var(--radius-lg);"></div>';
                window.Clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
                    fallbackRedirectUrl: window.location.href,
                    signUpFallbackRedirectUrl: window.location.href,
                    appearance: {
                        elements: {
                            headerTitle: "EveryAI Admin Login",
                            headerSubtitle: "Secure access for administrators only."
                        }
                    }
                });
            }
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
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
                    unmountIcon: () => { }
                },
                {
                    label: "Profile",
                    href: "/admin-profile.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' },
                    unmountIcon: () => { }
                },
                {
                    label: "Blogs",
                    href: "/admin-blogs.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' },
                    unmountIcon: () => { }
                },
                {
                    label: "Prompts",
                    href: "/admin-prompts.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>' },
                    unmountIcon: () => { }
                },
                {
                    label: "Support",
                    href: "/admin-support.html",
                    mountIcon: (el) => { el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="14" y2="13"></line></svg>' },
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

// Old manual auth events removed


// ── Dashboard Logic ────────────────────────────────────────────────

async function loadDashboard() {
    allSubmissions = await convex.query("tools:getAllTools");
    renderSubmissions();
    renderChart();
    updateStats(allSubmissions);
    updateStatsWithRange('daily'); // Call updateStatsWithRange during dashboard load
}

function updateStats(submissions) {
    if (!submissions) return;

    const totalCount = submissions.length;
    const pendingCount = submissions.filter(s => s.status === 'pending').length;
    const approvedCount = submissions.filter(s => s.status === 'approved' || s.status === 'PAID').length;

    const elTotal = $('stat-total');
    const elPending = $('stat-pending');
    const elLive = $('stat-live');

    if (elTotal) elTotal.textContent = totalCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elLive) elLive.textContent = approvedCount;

    // Update trends based on live data
    const trendSub = $('trend-submissions');
    if (trendSub) {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = submissions.filter(s => s.timestamp && s.timestamp.startsWith(today)).length;
        trendSub.textContent = `↑ ${todayCount} from today`;
        trendSub.className = todayCount > 0 ? 'stat-trend trend-up' : 'stat-trend';
    }

    const trendPending = $('trend-pending');
    if (trendPending) {
        trendPending.textContent = pendingCount > 0 ? 'Needs attention' : 'All caught up';
        trendPending.className = pendingCount > 0 ? 'stat-trend trend-down' : 'stat-trend trend-up';
    }
}

function renderSubmissions() {
    const list = $('submissions-list');
    if (!list) return;

    let filtered = allSubmissions;
    if (currentStatusFilter !== 'all') {
        filtered = allSubmissions.filter(sub => sub.status === currentStatusFilter);
    }

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

    // Ensure currentPage is within bounds
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageSlice = filtered.slice(startIdx, endIdx);

    // Update pagination info
    const info = $('pagination-info');
    if (info) {
        const showingStart = totalFiltered === 0 ? 0 : startIdx + 1;
        const showingEnd = Math.min(endIdx, totalFiltered);
        info.textContent = `Showing ${showingStart} - ${showingEnd} of ${totalFiltered} tools`;
    }

    const prevBtn = $('prev-page');
    const nextBtn = $('next-page');
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalFiltered === 0;
        nextBtn.style.opacity = (currentPage === totalPages || totalFiltered === 0) ? '0.5' : '1';
        nextBtn.style.cursor = (currentPage === totalPages || totalFiltered === 0) ? 'not-allowed' : 'pointer';
    }

    if (pageSlice.length === 0) {
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted)">No ${currentStatusFilter !== 'all' ? currentStatusFilter : ''} submissions yet.</td></tr>`;
        return;
    }

    list.innerHTML = pageSlice.map(sub => {
        let logo = '';
        try {
            const hostname = new URL(sub.url).hostname;
            logo = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
        } catch (e) {
            logo = '🤖'; // Fallback
        }

        const isMagicTeams = sub.name.toLowerCase().includes('magicteams');
        const isPaid = sub.planType === 'paid' || isMagicTeams;

        const planBadge = isPaid
            ? '<span class="status-badge" style="background:rgba(92,184,92,0.1); color:var(--accent-1); border:1px solid rgba(92,184,92,0.2)">PAID</span>'
            : '<span class="status-badge" style="background:rgba(255,255,255,0.05); color:var(--text-secondary)">FREE</span>';

        const rowStyle = isPaid ? 'background: rgba(92, 184, 92, 0.02)' : '';

        return `
            <tr style="${rowStyle}">
                <td>
                    <div style="margin-bottom: 8px;">
                        ${planBadge}
                    </div>
                    <div style="display:flex; align-items:center; gap:12px">
                        <div style="width:32px; height:32px; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0">
                            ${logo.startsWith('http') ? `<img src="${logo}" style="width:100%; height:100%; object-fit:contain" onerror="this.innerHTML='🤖'">` : logo}
                        </div>
                        <div>
                            <div style="font-weight:600">${sub.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted)">${sub.url}</div>
                        </div>
                    </div>
                </td>
                <td>${sub.category || 'N/A'}</td>
                <td>
                    <div style="font-size:0.85rem">${sub.email}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted)">${sub.social || ''}</div>
                </td>
                <td style="font-size:0.8rem">${new Date(sub.timestamp).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge status-${sub.status}">${sub.status}</span>
                </td>
                <td class="tools-actions-cell">
                    <div class="action-btns">
                        ${sub.status === 'pending' ? `
                            <button class="btn-sm btn-approve" onclick="updateStatus('${sub._id}', 'approved')">Approve</button>
                            <button class="btn-sm btn-decline" onclick="updateStatus('${sub._id}', 'declined')">Decline</button>
                        ` : ''}
                        
                        <button class="btn-dots" onclick="toggleActionsMenu(event, '${sub._id}')">⋮</button>
                        <div class="actions-dropdown" id="dropdown-${sub._id}">
                            <button class="dropdown-item delete" onclick="deleteToolRow('${sub._id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Delete Tool
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.changePage = (dir) => {
    currentPage += dir;
    renderSubmissions();
};

window.toggleActionsMenu = (e, id) => {
    e.stopPropagation();
    const allDropdowns = document.querySelectorAll('.actions-dropdown');
    const target = document.getElementById(`dropdown-${id}`);

    const isShowing = target.classList.contains('show');
    allDropdowns.forEach(d => d.classList.remove('show'));

    if (!isShowing) target.classList.add('show');
};

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('show'));
});

window.deleteToolRow = async (id) => {
    if (!id) {
        showToast('Invalid Tool ID', 'error');
        return;
    }
    if (!confirm('Are you sure you want to delete this tool permanently? This cannot be undone.')) return;

    try {
        await convex.mutation("tools:deleteTool", { id });
        await loadDashboard();
        showToast('Tool deleted successfully', 'success');
    } catch (err) {
        console.error("Failed to delete tool:", err);
        showToast('Error: ' + err.message, 'error');
    }
};

window.showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
        background: ${type === 'success' ? '#5cb85c' : '#ef4444'};
        color: white; border-radius: 8px; font-weight: 600;
        z-index: 9999; animation: slideUp 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

window.updateStatus = async (id, newStatus) => {
    try {
        await convex.mutation("tools:updateToolStatus", { id, status: newStatus });
        await loadDashboard();
    } catch (err) {
        console.error("Failed to update status:", err);
        alert("Failed to update status: " + err.message);
    }
};

// Initial Check
(async () => {
    initAdminAuth();
    if (typeof loadProfile === 'function') await loadProfile();
    startBadgePolling(convex);

    // ── Shared UI Logic ──
    const themeToggle = $('theme-toggle');
    const body = document.getElementById('body');

    // Theme logic
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light');
        if (themeToggle) themeToggle.checked = true;
    }

    themeToggle?.addEventListener('change', () => {
        const isLight = themeToggle.checked;
        body.classList.toggle('light', isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        // Redraw chart to update colors with a small delay for DOM variables
        setTimeout(() => {
            if (sessionStorage.getItem('everyai_admin_auth') === 'true') {
                renderChart(document.querySelector('.btn-filter.active')?.dataset.range || 'daily');
            }
        }, 100);
    });

    // Navbar scroll
    window.addEventListener('scroll', () => {
        const nav = $('navbar');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // ── Image Upload Handling ──
    const imgTabs = $('image-selection-tabs');
    const urlGroup = $('url-input-group');
    const uploadGroup = $('upload-input-group');
    const preview = $('image-preview');
    const placeholder = document.querySelector('.preview-placeholder');
    const imgFile = $('blog-image-file');
    const imgUrl = $('blog-image');

    imgTabs?.addEventListener('click', (e) => {
        const tab = e.target.closest('.img-tab');
        if (!tab) return;

        // Toggle Active Tab
        imgTabs.querySelectorAll('.img-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Toggle Input Visibility
        const type = tab.dataset.type;
        if (type === 'url') {
            urlGroup.classList.remove('hidden-input');
            uploadGroup.classList.add('hidden-input');
            imgUrl.setAttribute('required', '');
            imgFile.removeAttribute('required');
        } else {
            urlGroup.classList.add('hidden-input');
            uploadGroup.classList.remove('hidden-input');
            imgFile.setAttribute('required', '');
            imgUrl.removeAttribute('required');
        }
    });

    // URL Preview
    imgUrl?.addEventListener('input', () => {
        if (imgUrl.value) {
            preview.src = imgUrl.value;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
    });

    // File Preview & Base64 Logic
    let uploadedImageBase64 = '';
    imgFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedImageBase64 = event.target.result;
                preview.src = uploadedImageBase64;
                preview.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Traffic Range Filters
    $('traffic-filters')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-filter')) {
            const filters = e.currentTarget.querySelectorAll('.btn-filter');
            filters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const range = e.target.dataset.range;
            renderChart(range);
            updateStatsWithRange(range);
        }
    });

    // Blog Post Form Submission
    $('blog-post-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const activeTab = document.querySelector('.img-tab.active');
        const finalImage = (activeTab?.dataset.type === 'upload') ? uploadedImageBase64 : $('blog-image').value;

        try {
            let contentStorageId = undefined;
            let finalContent = $('blog-content').value;
            let finalImageUrl = finalImage;

            // Helper to upload large assets to Convex Storage
            async function uploadToStorage(content, contentType = "text/plain") {
                console.log(`Uploading large asset (${(content.length / 1024).toFixed(1)} KB)...`);

                let body = content;
                // If it's a Base64 image, convert to binary Blob
                if (content.startsWith('data:image/')) {
                    const parts = content.split(';base64,');
                    const byteString = atob(parts[parts.length - 1]);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    body = new Blob([ab], { type: contentType });
                }

                const uploadUrl = await convex.mutation("blogs:generateUploadUrl");
                const response = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": contentType },
                    body: body
                });
                const { storageId } = await response.json();
                return storageId;
            }

            // 1. Handle Large Content
            if (finalContent.length > 500000) { // 500KB threshold
                contentStorageId = await uploadToStorage(finalContent);
                finalContent = ""; // Clear for the mutation
            }

            // 2. Handle Large Images (Base64)
            if (finalImageUrl.startsWith('data:image/') && finalImageUrl.length > 500000) {
                console.log("Large image detected, converting and moving to storage...");
                const imgStorageId = await uploadToStorage(finalImageUrl, "image/png");
                finalImageUrl = imgStorageId; // Pass storageId as imageUrl; backend will resolve it
            }

            const formData = {
                id: Date.now().toString(),
                title: $('blog-title').value,
                slug: $('blog-title').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                category: $('blog-category').value,
                imageUrl: finalImageUrl || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e',
                excerpt: $('blog-summary').value,
                content: finalContent,
                contentStorageId: contentStorageId,
                readTime: Math.max(1, Math.ceil($('blog-content').value.split(' ').length / 200)),
                timestamp: new Date().toISOString()
            };

            console.log("Final submission data size check:", JSON.stringify(formData).length);
            await convex.mutation("blogs:createBlog", formData);

            showAdminToast('🚀 Blog post published successfully!');
            e.target.reset();
            $('blog-creation-section').style.display = 'none';

            // Redirect on success with a small delay for the toast
            setTimeout(() => {
                window.location.href = 'blogs.html';
            }, 2000);

        } catch (error) {
            console.error("Publication error:", error);
            alert('Failed to publish blog post: ' + error.message);
        }
    });



    // Toggle Blog Form
    $('btn-toggle-blog')?.addEventListener('click', () => {
        const section = $('blog-creation-section');
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    // Hamburger
    const hamburger = $('hamburger');
    const mobileMenu = $('mobile-menu');
    hamburger?.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open');
    });

    // Status Filters logic
    const statusFilters = $('status-filters');
    statusFilters?.addEventListener('click', (e) => {
        const btn = e.target.closest('.legend-item');
        if (!btn) return;

        // Update active class
        statusFilters.querySelectorAll('.legend-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter and re-render
        currentStatusFilter = btn.dataset.status;
        currentPage = 1; // Reset to first page on filter change
        renderSubmissions();
    });

    // Traffic Filters logic
    const trafficFilters = $('traffic-filters');
    trafficFilters?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-filter');
        if (!btn) return;

        // Update active class
        trafficFilters.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update real-time engine
        currentRange = btn.dataset.range;
        updateStatsWithRange(currentRange);
        renderChart(currentRange);
    });
})();

// ── Real-time Traffic Engine ──────────────────────────────────────────
const PAGE_TYPE = window.location.pathname.includes('admin-blogs') ? 'blog' : 'website';

async function updateStatsWithRange(range) {
    if (range) currentRange = range; // Persist the range for the interval
    const useRange = range || currentRange || 'daily';

    try {
        const IS_BLOG_PAGE = window.location.pathname.includes('admin-blogs');
        const now = new Date();
        const { startTime } = getRangeTime(useRange);

        if (IS_BLOG_PAGE) {
            const blogs = await convex.query("blogs:getBlogs") || [];

            // Filter blogs by the selected range
            const currentRangeBlogs = blogs.filter(b => {
                const ts = b.timestamp || b._creationTime;
                if (!ts) return false;
                const bDate = new Date(ts).getTime();
                if (isNaN(bDate)) return false;
                // If Yearly or Total, include all if recent count is 0
                return bDate >= startTime;
            });

            // LOGGING FOR DIAGNOSIS
            console.log(`[Blog Statistics] Requested Range: ${useRange}`);
            console.log(`[Blog Statistics] Filtering since: ${new Date(startTime).toLocaleString()}`);
            console.log(`[Blog Statistics] Total Blogs in DB: ${blogs.length}`);
            if (blogs.length > 0) {
                const recentDates = blogs.slice(0, 3).map(b => new Date(b.timestamp || b._creationTime).toLocaleString());
                console.log(`[Blog Statistics] Most recent blog dates:`, recentDates);
            }
            console.log(`[Blog Statistics] Match Count in filter: ${currentRangeBlogs.length}`);

            const elTotal = $('stat-total');
            if (elTotal) {
                // If we are in any long range (Weekly, Monthly, Yearly) 
                // and the specific filter is 0, we show the Total count 
                // but keep the trend relative to the filter.
                if (useRange !== 'daily' && currentRangeBlogs.length === 0) {
                    elTotal.textContent = blogs.length;
                    elTotal.setAttribute('title', 'Showing total count (no recent posts found)');
                } else {
                    elTotal.textContent = currentRangeBlogs.length;
                    elTotal.removeAttribute('title');
                }
            }

            const labelSub = $('label-submissions');
            if (labelSub) {
                const rangeLabel = { daily: 'Today', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[useRange] || 'Today';
                labelSub.textContent = rangeLabel + ' Blog Posts';
            }

            const trendSub = $('trend-submissions');
            if (trendSub) {
                // Calculate previous range for trend
                const rangeDiff = Date.now() - startTime;
                const prevStartTime = startTime - rangeDiff;

                const prevRangeBlogs = blogs.filter(b => {
                    const ts = b.timestamp || b._creationTime;
                    if (!ts) return false;
                    const bDate = new Date(ts).getTime();
                    return bDate >= prevStartTime && bDate < startTime;
                });

                const count = currentRangeBlogs.length;
                const prevCount = prevRangeBlogs.length;

                const diff = count - prevCount;
                const dir = diff >= 0 ? '↑' : '↓';
                const prevLabel = { daily: 'yesterday', weekly: 'last week', monthly: 'last month', yearly: 'last year' }[useRange] || 'previous period';

                // Display logic: If current is 0, but total exists, 
                // we show a helpful message about the last post
                if (count === 0 && blogs.length > 0) {
                    const latest = new Date(blogs[0].timestamp || blogs[0]._creationTime);
                    trendSub.textContent = `Last published: ${latest.toLocaleDateString()}`;
                    trendSub.className = 'stat-trend';
                } else {
                    trendSub.textContent = `${dir} ${Math.abs(diff)} published from ${prevLabel}`;
                    trendSub.className = `stat-trend ${diff >= 0 ? 'trend-up' : 'trend-down'}`;
                }
            }
        } else {
            const submissions = await convex.query("tools:getAllTools") || [];
            updateStats(submissions);
        }

        const PAGE_TYPE = window.location.pathname.includes('admin-blogs') ? 'blog' : 'website';
        const metrics = await convex.query("analytics:getMetrics", { type: PAGE_TYPE, range: useRange });

        // Update traffic card
        const st = $('stat-traffic'); if (st) {
            st.textContent = metrics.total >= 1000 ? (metrics.total / 1000).toFixed(1) + 'K' : metrics.total;
        }

        const lt = $('label-traffic');
        if (lt) {
            const rangeLabel = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[range] || 'Daily';
            lt.textContent = rangeLabel + ' Traffic';
        }

        const tt = $('trend-traffic'); if (tt) {
            const prev = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[range] || 'period';
            const dir = parseFloat(metrics.trend) >= 0 ? '↑' : '↓';
            tt.textContent = `${dir} ${Math.abs(metrics.trend)}% from previous ${prev}`;
            tt.className = parseFloat(metrics.trend) >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down';
        }

        const tlive = $('trend-live'); if (tlive) {
            const activeNow = metrics.activeNow ?? 0;
            tlive.textContent = range === 'yearly' ? 'Total live visits' : `${activeNow} Active now`;
        }
    } catch (e) {
        console.error("Analytics fetch failed", e);
    }
}

// ── Traffic Chart — Real-time, local-timezone-accurate ─────────────
let currentChart = null;

// ── Helpers ──
function getRangeTime(range) {
    const now = new Date();

    if (range === 'daily') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { startTime: start.getTime(), endTime: now.getTime() };
    }
    if (range === 'weekly') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7); // Last 7 days
        start.setHours(0, 0, 0, 0);
        return { startTime: start.getTime(), endTime: now.getTime() };
    }
    if (range === 'monthly') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { startTime: start.getTime(), endTime: now.getTime() };
    }
    // Yearly
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { startTime: start.getTime(), endTime: now.getTime() };
}

/**
 * Returns { labels, startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf }
 * Bucket strings are "YYYY-MM-DDTHH" in LOCAL timezone.
 */
function getChartConfig(range) {
    const now = new Date();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let labels = [], bucketCount, nowIdx, bucketSlotOf;

    if (range === 'daily') {
        bucketCount = 24;
        nowIdx = now.getHours();
        labels = Array.from({ length: 24 }, (_, h) => {
            const ampm = h < 12 ? 'am' : 'pm';
            return `${h % 12 === 0 ? 12 : h % 12}${ampm}`;
        });
        // timestamp (ms) → hour (0-23)
        bucketSlotOf = ts => new Date(ts).getHours();

    } else if (range === 'weekly') {
        const sun = new Date(now); sun.setHours(0, 0, 0, 0);
        sun.setDate(now.getDate() - now.getDay());
        bucketCount = 7;
        nowIdx = now.getDay();
        labels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sun); d.setDate(sun.getDate() + i);
            return DAYS[d.getDay()];
        });
        // Fold timestamps into day of week
        bucketSlotOf = ts => new Date(ts).getDay();

    } else if (range === 'monthly') {
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        bucketCount = last.getDate();
        nowIdx = now.getDate() - 1;
        labels = Array.from({ length: bucketCount }, (_, i) => String(i + 1));
        // Day-of-month (1-31) → 0-indexed slot
        bucketSlotOf = ts => new Date(ts).getDate() - 1;

    } else {
        bucketCount = 12;
        nowIdx = now.getMonth();
        labels = [...MONTHS];
        // Month number (0-11) → slot
        bucketSlotOf = ts => new Date(ts).getMonth();
    }

    return { labels, bucketCount, nowIdx, bucketSlotOf };
}

/**
 * Map { t: timestamp, c: count }[] rows from Convex into the chart data array.
 * Uses bucketSlotOf() to convert a timestamp to the right slot index.
 */
function mapBucketsToChartData(rows, bucketSlotOf, bucketCount) {
    const data = new Array(bucketCount).fill(0);
    rows.forEach(({ t, c }) => {
        const idx = bucketSlotOf(t);
        if (idx >= 0 && idx < bucketCount) data[idx] += c;
    });
    return data;
}

let isRenderingChart = false;
async function renderChart(range = 'daily') {
    if (isRenderingChart) return;
    const canvas = $('trafficChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isRenderingChart = true;
    try {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }

        const isLight = document.body.classList.contains('light');
        const gridColor = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
        const textColor = isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)';

        const { labels, startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf } = getChartConfig(range);

        const xTick = {
            daily: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 },
            weekly: { autoSkip: false, maxTicksLimit: 7, maxRotation: 0 },
            monthly: { autoSkip: true, maxTicksLimit: 15, maxRotation: 45 },
            yearly: { autoSkip: false, maxTicksLimit: 12, maxRotation: 0 }
        }[range] || { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 };



        // ── Fetch bucketed data from Convex ─────────────────────────────
        let chartData = [];
        try {
            const { startTime, endTime } = getRangeTime(range);
            const rows = await convex.query("analytics:getChartData", { type: PAGE_TYPE, startTime, endTime });
            chartData = mapBucketsToChartData(rows, bucketSlotOf, bucketCount);
        } catch (e) {
            console.warn('Chart fetch failed:', e);
            chartData = new Array(bucketCount).fill(0);
        }

        const yMax = Math.max(8, Math.ceil(Math.max(...chartData, 1)));

        currentChart = new Chart(ctx, {
            type: 'line',
            plugins: [],
            data: {
                labels,
                datasets: [{
                    label: 'Visits',
                    data: chartData,
                    borderColor: '#5cb85c',
                    backgroundColor: 'rgba(92,184,92,0.1)',
                    borderWidth: 3,
                    pointRadius: 3,
                    pointBackgroundColor: '#5cb85c',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: yMax,
                        grid: { color: gridColor },
                        ticks: { color: textColor, stepSize: 1, font: { size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            autoSkip: xTick.autoSkip,
                            maxTicksLimit: xTick.maxTicksLimit,
                            maxRotation: xTick.maxRotation,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Chart render error:", e);
    } finally {
        isRenderingChart = false;
    }
}

// ── Profile Persistence Logic ──
async function loadProfile() {
    try {
        const profile = await convex.query("profiles:getProfile", { userId: "admin_profile" }) || {};

        // Update display names
        if (profile.name) {
            document.querySelectorAll('#display-name').forEach(el => el.textContent = profile.name);
            const nameField = $('user-name');
            if (nameField) nameField.value = profile.name;
        }

        // Update avatars
        if (profile.avatar) {
            document.querySelectorAll('#display-avatar').forEach(img => img.src = profile.avatar);
            const navAvatar = document.querySelector('#profile-trigger img');
            if (navAvatar) navAvatar.src = profile.avatar;
        }

        // Update bio
        if (profile.bio) {
            const bioField = $('user-bio');
            if (bioField) bioField.value = profile.bio;
        }
    } catch (e) { console.error("Could not load admin profile", e); }
}

window.saveAdminProfile = async () => {
    const name = $('user-name')?.value;
    const bio = $('user-bio')?.value;
    const avatar = $('display-avatar')?.src;

    try {
        await convex.mutation("profiles:updateProfile", {
            userId: "admin_profile",
            name: name || '',
            bio: bio || '',
            avatar: avatar || ''
        });

        // Update Navbar immediately
        await loadProfile();
        alert('Administrative profile updated successfully!');
    } catch (e) {
        console.error("Could not save admin profile", e);
        alert("Administrative profile could not be updated.");
    }
};

// ── Dashboard Auto-Update (Real-time) ───────────────────────────────
let dashboardInterval = null;
let currentRange = 'daily';

/**
 * Refresh ONLY the chart data without destroying & recreating the chart.
 * This avoids any flicker and gives smooth bar-height updates.
 */
async function refreshChartData(range) {
    if (!currentChart) { await renderChart(range); return; }

    const { bucketCount, bucketSlotOf } = getChartConfig(range);
    try {
        const { startTime, endTime } = getRangeTime(range);
        const rows = await convex.query("analytics:getChartData", { type: PAGE_TYPE, startTime, endTime });
        const newData = mapBucketsToChartData(rows, bucketSlotOf, bucketCount);

        // Update the existing chart's data in-place (no redraw flicker)
        currentChart.data.datasets[0].data = newData;
        const newMax = Math.max(8, Math.ceil(Math.max(...newData, 0)));
        if (currentChart.options.scales.y.max !== newMax) {
            currentChart.options.scales.y.max = newMax;
        }
        currentChart.update('active'); // smooth animation
    } catch (e) {
        console.warn('Chart refresh failed:', e);
    }
}

async function startDashboardRealtime() {
    if (dashboardInterval) clearInterval(dashboardInterval);

    // Initial full load
    await loadDashboard();

    // Refresh every 10 seconds — stats + chart data update smoothly
    dashboardInterval = setInterval(async () => {
        const auth = sessionStorage.getItem('everyai_admin_auth') === 'true' || (window.Clerk && window.Clerk.user);
        if (!auth) return;
        // Stats update
        await updateStatsWithRange(currentRange);
        // Chart: update data in-place (no flicker)
        await refreshChartData(currentRange);
    }, 10000);
}

// ── Admin Notification Polling ──────────────────────────────────────
let lastNotificationTime = 0;
function playAdminNotification(message) {
    const now = Date.now();
    if (now - lastNotificationTime < 2000) return; // Prevention: Cooldown
    lastNotificationTime = now;

    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
    showAdminToast(message);
}

async function startNewSubmissionPolling() {
    if (window.__everyaiSubmissionPollingStarted) return;
    window.__everyaiSubmissionPollingStarted = true;

    let lastSubmissionsCount = 0;
    try {
        const initial = await convex.query("tools:getAllTools");
        lastSubmissionsCount = initial.length;
    } catch (e) { }

    setInterval(async () => {
        try {
            const submissions = await convex.query("tools:getAllTools");
            if (submissions.length !== lastSubmissionsCount) {
                // Change detected (new submission or deletion elsewhere)
                const isNew = submissions.length > lastSubmissionsCount;
                lastSubmissionsCount = submissions.length;

                if (isNew) {
                    // Play notification sound for NEW tools only
                    playAdminNotification('🎉 New tool submitted! Check the dashboard.');
                }

                // Refresh dashboard to stay in sync
                await loadDashboard();
            }
        } catch (e) {
            console.error("Polling check failed", e);
        }
    }, 5000); // Check every 5 seconds
}

async function startMessagePolling() {
    if (window.__everyaiMessagePollingStarted) return;
    window.__everyaiMessagePollingStarted = true;

    let lastMessageCount = 0;
    try {
        const initial = await convex.query("messages:getMessages");
        lastMessageCount = initial.length;
    } catch (e) { }

    setInterval(async () => {
        try {
            const messages = await convex.query("messages:getMessages");
            if (messages.length > lastMessageCount) {
                // New message!
                lastMessageCount = messages.length;
                playAdminNotification('📬 New support message received!');
            } else if (messages.length < lastMessageCount) {
                lastMessageCount = messages.length; // Handle deletions
            }
        } catch (e) { }
    }, 5000);
}

function showAdminToast(message) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.style.cssText = 'position:fixed;bottom:-60px;right:20px;background:var(--accent-1);color:#fff;padding:14px 28px;border-radius:var(--radius-full);font-weight:600;font-size:0.95rem;box-shadow:0 8px 30px rgba(92,184,92,0.4);transition:bottom 0.4s cubic-bezier(0.4,0,0.2,1);z-index:9999;display:flex;align-items:center;gap:12px;';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        ${message}
    `;

    // Slide in
    setTimeout(() => {
        toast.style.bottom = '30px';
    }, 100);

    // Slide out after 4 seconds
    setTimeout(() => {
        toast.style.bottom = '-60px';
    }, 4000);
}

// ── Startup ────────────────────────────────────────────────────────
// initAdminAuth is called in the initial check block around line 360
// initAdminAuth();
