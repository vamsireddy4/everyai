
// Clerk logic loaded via initAdminAuth()
/* ================================================================
   EveryAI – Admin Logic
   ================================================================ */

'use strict';

import { convex } from "./convex-client.js";

// ── Track this page visit ─────────────────────────────────────────
(async function trackVisit() {
    try {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const bucket = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
        await convex.mutation("analytics:recordVisit", { bucket });
    } catch (_) { }
})();

const $ = id => document.getElementById(id);
const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];

let allSubmissions = [];
let currentStatusFilter = 'all';

// ── Auth Logic ─────────────────────────────────────────────────────

window.loadDashboard = loadDashboard;
window.loadProfile = loadProfile;
window.logout = () => {
    if (window.Clerk) {
        window.Clerk.signOut().then(() => window.location.href = 'index.html');
    }
};
async function initAdminAuth() {
    if (!window.Clerk) {
        setTimeout(initAdminAuth, 100);
        return;
    }

    try {
        const clerkAppearance = {
            elements: {
                footer: { display: 'none' },
                footerAction: { display: 'none' },
                footerPages: { display: 'none' },
                devBrowser: { display: 'none' },
                userButtonPopoverFooter: { display: 'none' },
            }
        };
        await window.Clerk.load({ appearance: clerkAppearance });

        // Scrub any Clerk branding injected dynamically
        new MutationObserver(() => {
            document.querySelectorAll('[class*="cl-footer"],[class*="cl-internal"],[data-clerk-component="footer"]')
                .forEach(el => el.style.setProperty('display', 'none', 'important'));
        }).observe(document.body, { childList: true, subtree: true });

        if (window.Clerk.user) {
            const email = window.Clerk.user.primaryEmailAddress.emailAddress.toLowerCase();
            if (AUTHORIZED_EMAILS.includes(email)) {
                const overlay = $('admin-auth-overlay');
                if (overlay) overlay.style.display = 'none';
                if (typeof startDashboardRealtime === 'function') startDashboardRealtime();
                setupAdminUserButton();
                startNewSubmissionPolling();
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
                            headerSubtitle: "Secure access for administrators only.",
                            footer: { display: 'none' },
                            footerAction: { display: 'none' },
                            footerPages: { display: 'none' },
                            devBrowser: { display: 'none' },
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

    if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted)">No ${currentStatusFilter !== 'all' ? currentStatusFilter : ''} submissions yet.</td></tr>`;
        return;
    }

    list.innerHTML = filtered.map(sub => {
        let logo = '';
        try {
            const hostname = new URL(sub.url).hostname;
            logo = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
        } catch (e) {
            logo = '🤖'; // Fallback
        }

        return `
            <tr>
                <td>
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
            const formData = {
                id: Date.now().toString(),
                title: $('blog-title').value,
                slug: $('blog-title').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                category: $('blog-category').value,
                imageUrl: finalImage,
                excerpt: $('blog-summary').value,
                content: $('blog-content').value,
                readTime: Math.max(1, Math.ceil($('blog-content').value.split(' ').length / 200)),
                timestamp: new Date().toISOString()
            };

            await convex.mutation("blogs:createBlog", formData);

            alert('🚀 Blog post published successfully!');
            e.target.reset();
            $('blog-creation-section').style.display = 'none';
        } catch (error) {
            console.error(error);
            alert('Failed to publish blog post.');
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

async function updateStatsWithRange(range) {
    try {
        const submissions = await convex.query("tools:getAllTools") || [];
        updateStats(submissions); // Sync submissions card

        const metrics = await convex.query("analytics:getMetrics", { range });

        // Update UI with real data
        const st = $('stat-traffic'); if (st) {
            const count = metrics.total;
            st.textContent = count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count;
        }

        const lt = $('label-traffic'); if (lt) lt.textContent = range.charAt(0).toUpperCase() + range.slice(1) + " Traffic";
        const tt = $('trend-traffic'); if (tt) {
            tt.textContent = `↑ ${metrics.trend}% from previous ${range === 'daily' ? 'day' : (range === 'yearly' ? 'year' : 'period')}`;
            tt.className = parseFloat(metrics.trend) >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down';
        }

        const tlive = $('trend-live'); if (tlive) {
            const activeNow = metrics.activeNow ?? 0;
            tlive.textContent = range === 'yearly' ? 'Total live tools' : `${activeNow} Active now`;
        }
    } catch (e) {
        console.error("Analytics fetch failed", e);
    }
}

// ── Traffic Chart — Real-time, local-timezone-accurate ─────────────
let currentChart = null;

// ── Helpers for bucket key generation ───────────────────────────────
const _p = n => String(n).padStart(2, '0');
const _bucketKey = d => `${d.getFullYear()}-${_p(d.getMonth() + 1)}-${_p(d.getDate())}T${_p(d.getHours())}`;
const _dateStr = d => `${d.getFullYear()}-${_p(d.getMonth() + 1)}-${_p(d.getDate())}`;

/**
 * Returns { labels, startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf }
 * Bucket strings are "YYYY-MM-DDTHH" in LOCAL timezone.
 */
function getChartConfig(range) {
    const now = new Date();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let labels = [], startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf;

    if (range === 'daily') {
        const today = _dateStr(now);
        startBucket = `${today}T00`;
        endBucket = `${today}T23`;
        bucketCount = 24;
        nowIdx = now.getHours();
        labels = Array.from({ length: 24 }, (_, h) => {
            const ampm = h < 12 ? 'am' : 'pm';
            return `${h % 12 === 0 ? 12 : h % 12}${ampm}`;
        });
        // "2026-02-25T14" → slot 14
        bucketSlotOf = b => parseInt(b.slice(11), 10);

    } else if (range === 'weekly') {
        const sun = new Date(now); sun.setHours(0, 0, 0, 0);
        sun.setDate(now.getDate() - now.getDay());
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
        startBucket = `${_dateStr(sun)}T00`;
        endBucket = `${_dateStr(sat)}T23`;
        bucketCount = 7;
        nowIdx = now.getDay();
        labels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sun); d.setDate(sun.getDate() + i);
            return DAYS[d.getDay()];
        });
        // All hour buckets in a day fold into 1 day slot
        const sunMs = sun.getTime(), DAY_MS = 86400000;
        bucketSlotOf = b => {
            const d = new Date(b.slice(0, 10) + 'T12:00:00'); // noon avoids DST edge
            return Math.floor((d.getTime() - sunMs) / DAY_MS);
        };

    } else if (range === 'monthly') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startBucket = `${_dateStr(first)}T00`;
        endBucket = `${_dateStr(last)}T23`;
        bucketCount = last.getDate();
        nowIdx = now.getDate() - 1;
        labels = Array.from({ length: bucketCount }, (_, i) => String(i + 1));
        // Day-of-month → 0-indexed slot
        bucketSlotOf = b => parseInt(b.slice(8, 10), 10) - 1;

    } else {
        startBucket = `${now.getFullYear()}-01-01T00`;
        endBucket = `${now.getFullYear()}-12-31T23`;
        bucketCount = 12;
        nowIdx = now.getMonth();
        labels = [...MONTHS];
        // Month number → 0-indexed slot
        bucketSlotOf = b => parseInt(b.slice(5, 7), 10) - 1;
    }

    return { labels, startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf };
}

/**
 * Map { bucket, count }[] rows from Convex into the chart data array.
 * Uses bucketSlotOf() to convert a bucket string to the right slot index.
 */
function mapBucketsToChartData(rows, bucketSlotOf, bucketCount) {
    const data = new Array(bucketCount).fill(0);
    rows.forEach(({ bucket, count }) => {
        const idx = bucketSlotOf(bucket);
        if (idx >= 0 && idx < bucketCount) data[idx] += count;
    });
    return data;
}

async function renderChart(range = 'daily') {
    const ctx = $('trafficChart')?.getContext('2d');
    if (!ctx) return;
    if (currentChart) { currentChart.destroy(); currentChart = null; }

    const isLight = document.body.classList.contains('light');
    const gridColor = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
    const textColor = isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)';
    const nowColor = isLight ? 'rgba(239,68,68,0.8)' : 'rgba(255,90,90,0.9)';

    const { labels, startBucket, endBucket, bucketCount, nowIdx, bucketSlotOf } = getChartConfig(range);

    // ── Fetch aggregated bucket rows from Convex ─────────────────────
    let chartData = new Array(bucketCount).fill(0);
    try {
        const rows = await convex.query("analytics:getChartData", { startBucket, endBucket });
        chartData = mapBucketsToChartData(rows, bucketSlotOf, bucketCount);
    } catch (e) {
        console.warn('Chart data fetch failed:', e);
    }

    const yMax = Math.max(8, Math.ceil(Math.max(...chartData, 0)));

    // X-axis settings
    const xCfg = {
        daily: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 },
        weekly: { autoSkip: false, maxTicksLimit: 7, maxRotation: 0 },
        monthly: { autoSkip: true, maxTicksLimit: 16, maxRotation: 45 },
        yearly: { autoSkip: false, maxTicksLimit: 12, maxRotation: 0 }
    };
    const xTick = xCfg[range] || xCfg.daily;

    // ── "NOW" vertical line plugin ────────────────────────────────────
    const nowLinePlugin = {
        id: 'nowLine',
        afterDraw(chart) {
            if (nowIdx < 0 || nowIdx >= bucketCount) return;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            const x = xScale.getPixelForValue(nowIdx);
            const c = chart.ctx;

            c.save();
            // Dashed vertical line
            c.beginPath();
            c.moveTo(x, yScale.top);
            c.lineTo(x, yScale.bottom);
            c.lineWidth = 1.5;
            c.strokeStyle = nowColor;
            c.setLineDash([4, 3]);
            c.stroke();

            // "NOW" label badge at top
            c.setLineDash([]);
            const padding = 4, fontSize = 9;
            c.font = `bold ${fontSize}px Inter, sans-serif`;
            const textW = c.measureText('NOW').width;
            const bx = x - textW / 2 - padding;
            const by = yScale.top - fontSize - padding * 2 - 1;
            const bw = textW + padding * 2;
            const bh = fontSize + padding * 2;
            c.fillStyle = nowColor;
            c.beginPath();
            c.roundRect(bx, by, bw, bh, 3);
            c.fill();
            c.fillStyle = '#fff';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('NOW', x, by + bh / 2);
            c.restore();
        }
    };

    currentChart = new Chart(ctx, {
        type: 'bar',
        plugins: [nowLinePlugin],
        data: {
            labels,
            datasets: [{
                label: 'Visits',
                data: chartData,
                backgroundColor: 'rgba(92,184,92,0.75)',
                hoverBackgroundColor: 'rgba(92,184,92,1)',
                borderColor: 'rgba(92,184,92,0.9)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: yMax,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        stepSize: 1,
                        precision: 0,
                        font: { size: 11 },
                        callback: val => Number.isInteger(val) ? val : null
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: textColor,
                        display: true,
                        autoSkip: xTick.autoSkip,
                        maxTicksLimit: xTick.maxTicksLimit,
                        maxRotation: xTick.maxRotation,
                        minRotation: 0,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
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

    const { startBucket, endBucket, bucketCount, bucketSlotOf, nowIdx } = getChartConfig(range);
    try {
        const rows = await convex.query("analytics:getChartData", { startBucket, endBucket });
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
async function startNewSubmissionPolling() {
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
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(e => console.log('Audio play failed:', e));
                    showAdminToast('🎉 New tool submitted! Check the dashboard.');
                }

                // Refresh dashboard to stay in sync
                await loadDashboard();
            }
        } catch (e) {
            console.error("Polling check failed", e);
        }
    }, 5000); // Check every 5 seconds
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
