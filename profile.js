/* ================================================================
   EveryAI – User Profile Logic (Manual Integration)
   ================================================================ */

'use strict';
import { convex } from './convex-client.js';

const $ = id => document.getElementById(id);

// ── Apply theme immediately (before Clerk loads) ──
(function applyThemeEarly() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    if (savedTheme === 'light') {
        body.classList.add('light');
    } else {
        body.classList.remove('light');
    }
})();

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--accent-1)' : '#ef4444';
    toast.style.bottom = '32px';
    setTimeout(() => { toast.style.bottom = '-60px'; }, 2500);
}

async function initProfile() {
    const loader = $('profile-loader');

    if (!window.Clerk) {
        console.warn('Clerk SDK not loaded');
        setTimeout(initProfile, 100);
        return;
    }

    try {
        await window.Clerk.load();

        if (!window.Clerk.user) {
            window.location.href = 'index.html';
            return;
        }

        const user = window.Clerk.user;

        // Load custom profile or initialize from Clerk using Convex
        let profile = await convex.query("profiles:getProfile", { userId: user.id });

        if (!profile) {
            profile = {
                userId: user.id,
                name: user.fullName || '',
                email: user.primaryEmailAddress?.emailAddress || '',
                avatar: user.imageUrl || '',
                bio: '',
                website: '',
                twitter: ''
            };
            await convex.mutation("profiles:updateProfile", profile);
        }

        // Populate Form
        if ($('user-name')) $('user-name').value = profile.name || '';
        if ($('user-email')) $('user-email').value = profile.email || '';
        if ($('user-bio')) $('user-bio').value = profile.bio || '';
        if ($('user-website')) $('user-website').value = profile.website || '';
        if ($('user-twitter')) $('user-twitter').value = profile.twitter || '';

        // Populate Sidebar
        if ($('sidebar-name')) $('sidebar-name').textContent = profile.name || 'User';
        if ($('sidebar-email')) $('sidebar-email').textContent = profile.email || '';
        if ($('display-avatar')) $('display-avatar').src = profile.avatar || '';

        // Mount Clerk User Button in Navbar (matching app.js config)
        const userButtonDiv = $('user-button');
        const mobileUserButtonDiv = $('mobile-user-button');
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
        if (userButtonDiv) window.Clerk.mountUserButton(userButtonDiv, userButtonConfig);
        if (mobileUserButtonDiv) window.Clerk.mountUserButton(mobileUserButtonDiv, userButtonConfig);

        document.body.classList.remove('clerk-signed-out');
        document.body.classList.add('clerk-signed-in');

        // Hide Loader
        if (loader) loader.style.display = 'none';

        // Event Listeners
        setupEventListeners(user.id);

        // Auto-refresh on login/signout
        let previousUserId = window.Clerk.user?.id || null;
        window.Clerk.addListener(({ user }) => {
            const currentUserId = user?.id || null;
            if (currentUserId !== previousUserId) {
                previousUserId = currentUserId;
                window.location.reload();
            }
        });

        // Smooth page transitions
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href) return;
            if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
            if (href.startsWith('http') || href.startsWith('javascript') || href.startsWith('mailto')) return;
            if (href === '#' || href.startsWith('#')) return;
            e.preventDefault();
            document.body.classList.add('page-exit');
            setTimeout(() => { window.location.href = href; }, 280);
        });

    } catch (err) {
        console.error('Error initializing profile:', err);
        if (loader) loader.innerHTML = `<p style="color:red">Error loading profile. Please refresh.</p>`;
    }
}

function setupEventListeners(userId) {
    // Save Changes
    $('save-profile-btn')?.addEventListener('click', async () => {
        try {
            const formData = {
                userId: userId,
                name: $('user-name')?.value || '',
                bio: $('user-bio')?.value || '',
                website: $('user-website')?.value || '',
                twitter: $('user-twitter')?.value || ''
            };

            await convex.mutation("profiles:updateProfile", formData);

            // Update Sidebar immediately
            if ($('sidebar-name')) $('sidebar-name').textContent = formData.name || 'User';

            showToast('✅ Profile saved successfully!');
        } catch (e) {
            console.error("Save failed", e);
            showToast('❌ Failed to save profile', 'error');
        }
    });

    // Theme Toggle
    const themeToggle = $('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        if (themeToggle) themeToggle.checked = true;
    }

    themeToggle?.addEventListener('change', () => {
        document.body.classList.toggle('light', themeToggle.checked);
        localStorage.setItem('theme', themeToggle.checked ? 'light' : 'dark');
    });

    // Logout
    $('logout-btn')?.addEventListener('click', () => {
        window.Clerk.signOut(() => {
            window.location.href = 'index.html';
        });
    });

    // Avatar Upload
    $('avatar-upload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Image = event.target.result;
                if ($('display-avatar')) $('display-avatar').src = base64Image;

                // Save to convex
                convex.mutation("profiles:updateProfile", { userId, avatar: base64Image })
                    .catch(e => console.error("Could not update avatar", e));

                showToast('✅ Avatar updated!');
            };
            reader.readAsDataURL(file);
        }
    });

    // Navbar scroll
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
}

initProfile();
