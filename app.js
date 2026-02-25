/* ================================================================
   EveryAI – App Data & Logic (Pagination Version)
   ================================================================ */

'use strict';

// ── App Data ─────────────────────────────────────────────────────

import { convex } from './convex-client.js';

// ── Analytics Tracking ─────────────────────────────────────────────
// Fires on every page load — Convex upserts into the current hour bucket,
// so the database stays clean (one row per hour) with an accurate visit count.
(async function trackVisit() {
  try {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const bucket = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
    await convex.mutation("analytics:recordVisit", { bucket });
  } catch (e) { console.error("Analytics failure", e); }
})();

let APPS = [];

async function loadAppsFromConvex() {
  try {
    const tools = await convex.query("tools:getApprovedTools");
    APPS = tools.map(t => ({
      id: t._id,
      name: t.name,
      tagline: t.description ? t.description.slice(0, 50) + "..." : "",
      icon: "🤖",
      category: t.category,
      subcategory: t.subcategory,
      description: t.description || '',
      features: t.features ? (t.features.includes('\n') ? t.features.split('\n') : t.features.split(',')).map(f => f.trim()).filter(f => f) : [],
      rating: 5.0,
      reviews: Math.floor(Math.random() * 1000) + 100, // mock reviews for UI layout
      price: t.partnership === 'yes' ? "PAID" : "FREE",
      url: t.url,
      social: t.social,
      email: t.email,
      phone: t.phone,
      socialLinks: t.social ? (t.social.includes(',') ? t.social.split(',') : [t.social]).map(s => s.trim()) : [],
      featured: !!t.transactionId,
      new: true,
      logo: (() => {
        try {
          return `https://www.google.com/s2/favicons?sz=128&domain=${new URL(t.url).hostname}`;
        } catch (e) { return null; }
      })(),
      banner: `https://s0.wp.com/mshots/v1/${encodeURIComponent(t.url || '')}?w=1200`
    }));
  } catch (err) {
    console.error("Failed to load apps from convex:", err);
  }
}

// ── Pagination State ──────────────────────────────────────────────
let currentPage = 1;
const PAGE_SIZE = 40; // 40 cards per page
let currentFilter = 'all';
let currentSort = 'popular';
let searchQuery = '';

// ── DOM References ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Logo helper ────────────────────────────────────────────────────
function iconHTML(app) {
  if (app.logo) {
    return `<img src="${app.logo}" alt="${app.name} logo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="icon-fallback" style="display:none;align-items:center;justify-content:center;height:100%;width:100%;font-size:1.5rem">${app.icon}</span>`;
  }
  return app.icon;
}

// ── Render Card ───────────────────────────────────────────────────
function renderAppCard(app) {
  return `
    <div class="app-card reveal" data-id="${app.id}" role="button" tabindex="0">
      <div class="app-card-top">
        <div class="app-icon-sm logo-wrap">${iconHTML(app)}</div>
        <div>
          <div class="app-name">${app.name}${app.new ? ' <span class="card-tag" style="font-size:0.65rem;margin-left:4px">NEW</span>' : ''}</div>
          <div class="app-category-label">${app.category}</div>
        </div>
      </div>
      <p class="app-desc">${app.description.length > 95 ? app.description.slice(0, 95) + '...' : app.description}</p>
      <div class="app-card-footer">
        <span class="app-price ${app.price}">${app.price.charAt(0).toUpperCase() + app.price.slice(1)}</span>
        <button class="app-visit-btn" data-url="${app.url}">Visit →</button>
      </div>
    </div>
  `;
}

// ── Filter & Sort Logic ───────────────────────────────────────────
function getFilteredApps() {
  let apps = [...APPS];

  if (currentFilter !== 'all') {
    const filter = currentFilter.toLowerCase().replace(/-/g, ' ');
    apps = apps.filter(a =>
      a.category.toLowerCase() === filter ||
      (a.tags && a.tags.some(t => t.toLowerCase() === filter)) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(filter)))
    );
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    apps = apps.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  switch (currentSort) {
    case 'newest':
      apps.sort((a, b) => b.id - a.id);
      break;
    case 'name':
      apps.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'rating':
      apps.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    default:
      apps.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
      break;
  }
  return apps;
}

// ── Render Main Grid ──────────────────────────────────────────────
function renderApps() {
  const allFiltered = getFilteredApps();
  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE);

  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageApps = allFiltered.slice(start, start + PAGE_SIZE);

  const grid = $('apps-grid');
  if (!grid) return;

  if (pageApps.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-muted)">No tools found matching your criteria.</div>`;
    updatePaginationUI(0, 0);
    return;
  }

  grid.innerHTML = pageApps.map(renderAppCard).join('');

  document.querySelectorAll('.app-card').forEach(card => {
    io.observe(card);
    card.addEventListener('click', e => {
      if (e.target.classList.contains('app-visit-btn')) return;
      window.location.href = `tool.html?id=${card.dataset.id}`;
    });
    card.querySelector('.app-visit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      window.open(e.target.dataset.url, '_blank');
    });
  });

  updatePaginationUI(currentPage, totalPages);
}

// ── Pagination UI ────────────────────────────────────────────────
function updatePaginationUI(current, total) {
  const wrap = document.querySelector('.load-more-wrap');
  if (!wrap) return;

  if (total <= 1) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = `
    <div class="pagination-bar">
      <button class="btn-pagination ${current === 1 ? 'disabled' : ''}" id="prev-page" ${current === 1 ? 'disabled' : ''}>
        ← Previous
      </button>
      <div class="page-numbers">
        Page <strong>${current}</strong> of <span>${total}</span>
      </div>
      <button class="btn-pagination ${current === total ? 'disabled' : ''}" id="next-page" ${current === total ? 'disabled' : ''}>
        Next →
      </button>
    </div>
  `;

  $('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderApps();
      window.scrollTo({ top: $('apps').offsetTop - 100, behavior: 'smooth' });
    }
  });

  $('next-page')?.addEventListener('click', () => {
    if (currentPage < total) {
      currentPage++;
      renderApps();
      window.scrollTo({ top: $('apps').offsetTop - 100, behavior: 'smooth' });
    }
  });
}

// ── Intersection Observer ─────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

// ── Animated Counters (for Hero) ──────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const startTime = performance.now();

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  });
}

// ── Initialize Event Listeners ─────────────────────────────────────
async function init() {
  // Theme Toggle
  const themeToggle = $('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light');
    if (themeToggle) themeToggle.checked = true;
  }

  themeToggle?.addEventListener('change', () => {
    document.body.classList.toggle('light', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'light' : 'dark');
  });

  // Filter Bar
  $('filter-bar')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      currentPage = 1;
      renderApps();
    }
  });

  // Sort Select
  $('sort-select')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderApps();
  });

  // Hero Search
  const searchInput = $('hero-search');
  const searchBtn = $('search-btn');

  function triggerSearch() {
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    renderApps();
    window.scrollTo({ top: $('apps').offsetTop - 100, behavior: 'smooth' });
  }

  searchBtn?.addEventListener('click', triggerSearch);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });

  // Quick Tags
  document.querySelectorAll('.tag[data-filter]').forEach(tag => {
    tag.addEventListener('click', () => {
      currentFilter = tag.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.filter === currentFilter)
      );
      currentPage = 1;
      renderApps();
      window.scrollTo({ top: $('apps').offsetTop - 100, behavior: 'smooth' });
    });
  });

  // Navbar Scroll Appereance
  window.addEventListener('scroll', () => {
    $('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile Menu
  const hamburger = $('hamburger');
  const mobileMenu = $('mobile-menu');
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  });


  // Check if it's Tool Detail Page
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get('id');
  if ($('tool-details-container') && toolId) {
    await loadAppsFromConvex();
    initDetailPage(toolId);
  }

  // Stats counter animation (triggers when visible)
  const countersSection = $('counters-section');
  if (countersSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(countersSection);
  }

  // Initial Render (Home only)
  if ($('apps-grid')) {
    await loadAppsFromConvex();
    renderApps();
  }

  // ── Clerk Initialization ──────────────────────────────────────────
  initClerk();
}

/** ── Detail Page Logic (Moved from tool.html) ── */
function initDetailPage(toolId) {
  const tool = APPS.find(a => a.id === toolId);
  const container = $('tool-details-container');

  if (!tool) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 100px;">
        <h2>Tool not found</h2>
        <p>The tool you're looking for doesn't exist or has been removed.</p>
        <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:20px;">Back to Home</a>
    </div>`;
    return;
  }

  document.title = `${tool.name} | EveryAI`;

  // Social Icons Logic
  const socialIconsHTML = (tool.socialLinks || []).map(link => {
    let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'; // default globe
    if (link.includes('twitter.com') || link.includes('x.com')) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>';
    } else if (link.includes('linkedin.com')) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>';
    } else if (link.includes('github.com')) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>';
    }

    return `<a href="${link}" target="_blank" class="social-icon-btn" title="${link}">${icon}</a>`;
  }).join('');

  const featuresList = tool.features && tool.features.length > 0 ? tool.features : ['Core Functionality', 'Dynamic AI Logic', 'Modern Interface'];

  container.innerHTML = `
    <aside class="tool-sidebar">
        <div class="tool-id-card">
            <div class="tool-large-icon-wrap" style="background:#fff; width:100px; height:100px; margin:0 auto 20px; border-radius:20px; padding:15px; border:1px solid var(--border)">
                <img src="${tool.logo}" style="width:100%; height:100%; object-fit:contain" alt="${tool.name}">
            </div>
            <h2 class="tool-main-name">${tool.name}</h2>
            
            <a href="${tool.url}" class="tool-visit-btn" target="_blank">
                VISIT WEBSITE
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>

            ${socialIconsHTML ? `<div class="tool-social-links">${socialIconsHTML}</div>` : ''}

            <span class="product-info-label">Basic Details</span>
            <div class="tool-meta-grid">
                <div class="meta-item">
                    <span class="meta-label">Category</span>
                    <span class="meta-value">${tool.category}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Pricing</span>
                    ${tool.price === 'PAID' ? `
                        <div style="display:inline-flex; align-items:center; gap:8px; background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); padding:6px 14px; border-radius:100px; font-weight:700; font-size:0.85rem; margin-top:4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            PAID
                        </div>
                    ` : `
                        <span class="meta-value">${tool.price}</span>
                    `}
                </div>
            </div>
        </div>
    </aside>

    <div class="tool-content">
        <div class="tool-banner-wrap" style="margin-bottom:32px; border-radius:24px; overflow:hidden; border:1px solid var(--border); background:#111; aspect-ratio:21/9">
            <img src="${tool.banner}" alt="${tool.name} Banner" style="width:100%; height:100%; object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200'">
        </div>

        <h1 class="tool-detail-title">${tool.name}</h1>
        <div class="tool-long-desc">
            <p>${tool.description}</p>
        </div>

        <div class="features-section">
            <h3 style="font-family:var(--font-head); font-size:1.5rem; margin-top:20px; color:var(--text-primary)">Key Features:</h3>
            <ul class="features-list">
                ${featuresList.map(f => `
                    <li class="feature-item">
                        <span>${f}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    </div>
  `;
}

async function initClerk() {
  const signInBtn = document.getElementById('sign-in-btn');
  const userButtonDiv = document.getElementById('user-button');
  const mobileSignInBtn = document.getElementById('mobile-sign-in-btn');
  const mobileUserButtonDiv = document.getElementById('mobile-user-button');

  if (!window.Clerk) {
    console.warn('Clerk SDK not loaded, retrying...');
    setTimeout(initClerk, 200);
    return;
  }

  try {
    await window.Clerk.load();

    if (window.Clerk.user) {
      const user = window.Clerk.user;
      // Initialize or load manual profile
      try {
        const existingProfile = await convex.query("profiles:getProfile", { userId: user.id });
        if (!existingProfile) {
          await convex.mutation("profiles:updateProfile", {
            userId: user.id,
            name: user.fullName || '',
            email: user.primaryEmailAddress?.emailAddress || '',
            avatar: user.imageUrl || ''
          });
        }
      } catch (err) { console.error("Could not sync profile:", err); }

      const userButtonConfig = {
        afterSignOutUrl: '/index.html',
        userProfileMode: 'navigation',
        userProfileUrl: '/profile.html',
        customMenuItems: [
          {
            label: 'My Profile',
            href: '/profile.html',
            mountIcon: (el) => {
              el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
            },
            unmountIcon: () => { }
          },
          {
            label: 'My Tools',
            href: '/my-tools.html',
            mountIcon: (el) => {
              el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
            },
            unmountIcon: () => { }
          }
        ],
        appearance: {
          elements: {
            userButtonPopoverActionButton__manageAccount: { display: 'none' },
            userButtonPopoverFooter: { display: 'none' }
          }
        }
      };

      window.Clerk.mountUserButton(userButtonDiv, userButtonConfig);
      if (mobileUserButtonDiv) window.Clerk.mountUserButton(mobileUserButtonDiv, userButtonConfig);

      if (signInBtn) signInBtn.style.display = 'none';
      if (mobileSignInBtn) mobileSignInBtn.style.display = 'none';
      document.body.classList.remove('clerk-signed-out');
      document.body.classList.add('clerk-signed-in');

      console.log('Logged in as:', profile.name);
    } else {
      if (signInBtn) {
        signInBtn.style.display = 'block';
        signInBtn.addEventListener('click', () => window.Clerk.openSignIn({
          appearance: {
            elements: {
              footer: { display: 'none' }
            }
          }
        }));
      }
      if (mobileSignInBtn) {
        mobileSignInBtn.style.display = 'block';
        mobileSignInBtn.addEventListener('click', () => window.Clerk.openSignIn({
          appearance: {
            elements: {
              footer: { display: 'none' }
            }
          }
        }));
      }
      document.body.classList.remove('clerk-signed-in');
      document.body.classList.add('clerk-signed-out');
    }

    // ── Auto-refresh on login/signout ──
    let previousUserId = window.Clerk.user?.id || null;
    window.Clerk.addListener(({ user }) => {
      const currentUserId = user?.id || null;
      if (currentUserId !== previousUserId) {
        previousUserId = currentUserId;
        window.location.reload();
      }
    });

  } catch (err) {
    console.error('Error initializing Clerk:', err);
  }
}

// ── Smooth Page Transitions ──
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: external links, hashes, javascript:, new tab, modifier keys
    if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (href.startsWith('http') || href.startsWith('javascript') || href.startsWith('mailto')) return;
    if (href === '#' || href.startsWith('#')) return;

    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => {
      window.location.href = href;
    }, 280);
  });
}

init();
initPageTransitions();
