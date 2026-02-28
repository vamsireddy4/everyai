/* ================================================================
   EveryAI – App Data & Logic (Pagination Version)
   ================================================================ */

'use strict';

// ── App Data ─────────────────────────────────────────────────────

import { convex } from './convex-client.js';

// ── Analytics Tracking ─────────────────────────────────────────────
(async function trackVisit() {
  try {
    const path = window.location.pathname.toLowerCase();
    const isBlogPage = path.includes('blogs.html') || path.includes('blog-post.html');
    const isAdminPage = path.includes('admin');

    const isAdminSession = localStorage.getItem('everyai_is_admin') === 'true';
    if (isAdminSession) return; // Don't track admin browsing ever

    let type;
    if (isBlogPage && !isAdminPage) {
      type = 'blog';
    } else if (!isAdminPage) {
      type = 'website';
    } else {
      return; // Don't record admin page visits
    }
    await convex.mutation("analytics:recordVisit", { type });
  } catch (e) { console.error("Analytics failure", e); }
})();

let APPS = [];

async function loadAppsFromConvex() {
  // 1. Try Loading from Cache First (Instant Render)
  const cached = localStorage.getItem('everyai_apps_cache');
  if (cached) {
    try {
      APPS = JSON.parse(cached);
      console.log("🚀 EveryAI: Instant cache load success.");
      if (typeof renderApps === 'function' && $('apps-grid')) renderApps();
    } catch (e) { console.warn("Cache parse failed", e); }
  }

  try {
    const tools = await convex.query("tools:getApprovedTools");
    const newApps = tools.map(t => {
      const isMagicTeams = t.name.toLowerCase().includes('magicteams');
      return {
        id: t._id,
        name: t.name,
        tagline: t.description ? t.description.slice(0, 50) + "..." : "",
        icon: "🤖",
        category: t.category,
        subcategory: t.subcategory,
        description: t.description || '',
        features: fList(t.features),
        rating: 5.0,
        reviews: Math.floor(Math.random() * 1000) + 100,
        price: (t.planType === 'paid' || isMagicTeams) ? "PAID" : "FREE",
        url: t.url,
        social: t.social,
        email: t.email,
        phone: t.phone,
        socialLinks: t.social ? (t.social.includes(',') ? t.social.split(',') : [t.social]).map(s => s.trim()) : [],
        featured: t.planType === 'paid' || isMagicTeams,
        hasSavedBanner: !!t.bannerUrl,
        logo: (() => {
          try {
            return `https://www.google.com/s2/favicons?sz=128&domain=${new URL(t.url).hostname}`;
          } catch (e) { return null; }
        })(),
        banner: t.bannerUrl || `https://api.microlink.io?url=${encodeURIComponent(t.url || '')}&screenshot=true&meta=false&embed=screenshot.url`
      };
    });

    // 2. 🗲 Pre-warm Asset Cache (Banners and Favicons for first 15 apps)
    newApps.slice(0, 15).forEach(a => {
      if (a.banner) { const i = new Image(); i.src = a.banner; }
      if (a.logo) { const i = new Image(); i.src = a.logo; }
    });

    // 3. Update if data changed or first load
    if (JSON.stringify(newApps) !== JSON.stringify(APPS)) {
      APPS = newApps;
      localStorage.setItem('everyai_apps_cache', JSON.stringify(APPS));
      console.log("✅ EveryAI: Backend data synced and cached.");
      if (typeof renderApps === 'function' && $('apps-grid')) renderApps();
    }

  } catch (err) {
    console.error("Failed to load apps from convex:", err);
  }
}

function fList(str) {
  if (!str) return [];
  return (str.includes('\n') ? str.split('\n') : str.split(',')).map(f => f.trim()).filter(f => f);
}

// ── Pagination State ──────────────────────────────────────────────
let currentPage = 1;
const PAGE_SIZE = 60; // 60 cards per page
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
  const featuredClass = app.featured ? 'featured-card' : '';
  return `
    <div class="app-card reveal ${featuredClass}" data-id="${app.id}" role="button" tabindex="0">
      <div class="app-card-top">
        <div class="app-icon-sm logo-wrap">${iconHTML(app)}</div>
        <div>
          ${app.featured ? '<div class="featured-badge" style="font-size:0.6rem; color:var(--accent-1); font-weight:800; letter-spacing:0.05em; margin-bottom:2px">FEATURED</div>' : ''}
          <div class="app-name">${app.name}</div>
          <div class="app-category-label">${app.category}</div>
        </div>
      </div>
      <p class="app-desc">${app.description.length > 95 ? app.description.slice(0, 95) + '...' : app.description}</p>
      <div class="app-card-footer">
        <span class="app-price ${app.price}">
          ${app.price === 'PAID' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : app.price}
        </span>
        <a href="${app.url}" 
           target="_blank" 
           rel="${app.featured ? 'noopener' : 'nofollow noopener'}" 
           class="app-visit-btn" 
           onclick="event.stopPropagation()">
           Visit →
        </a>
      </div>
    </div>
  `;
}

// ── Filter & Sort Logic ───────────────────────────────────────────
function getFilteredApps() {
  let apps = [...APPS];

  if (currentFilter !== 'all') {
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const filterNorm = normalize(currentFilter);

    apps = apps.filter(a =>
      (a.category && normalize(a.category) === filterNorm) ||
      (a.subcategory && normalize(a.subcategory) === filterNorm) ||
      (a.tags && a.tags.some(t => normalize(t) === filterNorm || normalize(t).includes(filterNorm)))
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

  // Price filtering (triggered by sort dropdown)
  if (currentSort === 'free') {
    apps = apps.filter(a => a.price === 'FREE');
  } else if (currentSort === 'premium') {
    apps = apps.filter(a => a.price === 'PAID');
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

  // Sorting priority: 
  // 1. MagicTeams (Always first)
  // 2. Featured/Paid tools
  // 3. Free tools
  apps.sort((a, b) => {
    const aIsMagic = a.name.toLowerCase().includes('magicteams');
    const bIsMagic = b.name.toLowerCase().includes('magicteams');

    if (aIsMagic && !bIsMagic) return -1;
    if (!aIsMagic && bIsMagic) return 1;

    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

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
    const id = card.dataset.id;
    const app = APPS.find(a => a.id === id);

    // Proactive banner saving for the current page
    if (app && !app.hasSavedBanner && app.banner) {
      convex.mutation("tools:saveBanner", { id: app.id, bannerUrl: app.banner })
        .then(() => { app.hasSavedBanner = true; })
        .catch(e => console.error("Proactive banner save failed", e));
    }

    card.addEventListener('click', e => {
      if (e.target.closest('.app-visit-btn')) return;
      window.location.href = `tool.html?id=${card.dataset.id}`;
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
      <div class="page-info">
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

  // Navbar Scroll Logic (Shrink background only)
  const navbar = $('navbar');

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    // Toggle "scrolled" class (shrink background)
    navbar?.classList.toggle('scrolled', currentScrollY > 20);
  }, { passive: true });


  // Mobile Menu
  const hamburger = $('hamburger');
  const mobileMenu = $('mobile-menu');
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  });


  // Check if it's Tool Detail Page or Filtered Home Page
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get('id');
  const filterParam = params.get('filter');

  // Handle Filter from URL
  if (filterParam) {
    currentFilter = filterParam;
    // Update UI active state
    document.querySelectorAll('.filter-btn, .tag').forEach(btn => {
      const match = btn.dataset.filter === currentFilter;
      btn.classList.toggle('active', match);
    });
    // Dynamically update section title for context
    const secTitle = document.querySelector('.section-title');
    if (secTitle) {
      const displayFilter = filterParam.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      secTitle.innerHTML = `Explore <span class="gradient-text">${displayFilter} Tools</span>`;
    }
  }

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

  // Prompts logic (if on prompts page)
  if ($('dynamic-prompts-list')) {
    renderPrompts();
  }

  // ── Clerk Initialization ──────────────────────────────────────────
  initClerk();
}

let ALL_PROMPTS = [];

async function renderPrompts() {
  const list = $('dynamic-prompts-list');
  if (!list) return;

  // Category → Unsplash image mapping
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

  // Fallback images for unknown categories
  const fallbackImages = [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
  ];

  // 1. Load Prompts from Cache
  const cached = localStorage.getItem('everyai_prompts_cache');
  if (cached) {
    try {
      ALL_PROMPTS = JSON.parse(cached);
      displayPrompts(ALL_PROMPTS);
    } catch (e) { console.warn("Prompt cache fail", e); }
  }

  try {
    const freshPrompts = await convex.query("prompts:getPrompts");

    // 2. Preload first few prompt images
    freshPrompts.slice(0, 8).forEach(p => {
      if (p.imageUrl) {
        const img = new Image();
        img.src = p.imageUrl;
      }
    });

    if (JSON.stringify(freshPrompts) !== JSON.stringify(ALL_PROMPTS)) {
      ALL_PROMPTS = freshPrompts;
      localStorage.setItem('everyai_prompts_cache', JSON.stringify(ALL_PROMPTS));
      displayPrompts(ALL_PROMPTS);
    }
  } catch (err) {
    console.error("Failed to load prompts:", err);
  }

  function displayPrompts(prompts) {
    if (prompts.length === 0) {
      list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-muted)">No prompts found matching your search.</div>`;
      return;
    }

    list.innerHTML = prompts.map((p, idx) => {
      // 1. Priority: URL or Upload set by Admin
      let imgUrl = p.imageUrl;

      // 2. Secondary: Match any keyword in the category string
      if (!imgUrl) {
        const categories = (p.category || 'general').toLowerCase().split(/[\s,]+/).map(c => c.trim()).filter(c => c);
        const match = categories.find(c => categoryImages[c]);
        imgUrl = match ? categoryImages[match] : categoryImages['general'];
      }

      // 3. Fallback: Generic pattern if still nothing
      if (!imgUrl) {
        imgUrl = fallbackImages[idx % fallbackImages.length];
      }

      return `
        <a href="prompt.html?id=${p._id}" class="prompt-card">
            <img src="${imgUrl}" alt="${p.title}" loading="lazy" />
            <div class="prompt-card-content">
                <h3>${p.title}</h3>
                ${p.category ? `<span style="font-size:0.8rem; color: #5cb85c; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">${p.category}</span>` : ''}
            </div>
        </a>
      `;
    }).join('');
  }

  window.filterPrompts = (query) => {
    const q = query.toLowerCase().trim();
    if (!q) {
      displayPrompts(ALL_PROMPTS);
      return;
    }

    const filtered = ALL_PROMPTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
    displayPrompts(filtered);
  };
}




window.copyPromptText = (btn) => {
  const content = btn.dataset.content;
  navigator.clipboard.writeText(content).then(() => {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#5cb85c';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  });
};


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

  // Auto-save banner if not already saved to DB
  if (!tool.hasSavedBanner && tool.banner) {
    convex.mutation("tools:saveBanner", {
      id: tool.id,
      bannerUrl: tool.banner
    }).catch(e => console.error("Auto-save banner failed", e));
  }

  document.title = `${tool.name} | EveryAI`;

  // Social Icons Logic
  const socialIconsHTML = (tool.socialLinks || []).map(link => {
    let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'; // default globe
    let brandClass = '';

    if (link.includes('twitter.com') || link.includes('x.com')) {
      brandClass = 'x';
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.936H5.039z"/></svg>';
    } else if (link.includes('linkedin.com')) {
      brandClass = 'linkedin';
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>';
    } else if (link.includes('github.com')) {
      brandClass = 'github';
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>';
    }

    return `<a href="${link}" target="_blank" class="social-icon-btn ${brandClass}" title="${link}">${icon}</a>`;
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
        <div class="tool-banner-wrap shimmer-banner" style="margin-bottom:32px; border-radius:32px; overflow:hidden; border:1px solid var(--border); background:rgba(0,0,0,0.05); aspect-ratio:16/9; display: flex; align-items: center; justify-content: center; position: relative;">
            <img src="${tool.banner}" alt="${tool.name} Banner" 
                 style="width:100%; height:100%; display: block; object-fit: cover; opacity: 0; transition: opacity 0.5s ease;"
                 onload="this.style.opacity='1'; this.parentElement.classList.remove('shimmer-banner')"
                 onerror="this.src='https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200'; this.style.opacity='1'; this.parentElement.classList.remove('shimmer-banner')">
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

    const AUTHORIZED_EMAILS = ['tradephani@gmail.com', 'everyai.com@gmail.com'];
    const adminLink = document.getElementById('admin-dashboard-link');

    if (window.Clerk.user) {
      const user = window.Clerk.user;
      const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();

      if (adminLink && AUTHORIZED_EMAILS.includes(email)) {
        adminLink.style.display = 'block';
      }

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
          },
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
