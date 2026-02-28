const fs = require('fs');

const adminJsPath = 'admin.js';
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

const authLogic = `
function checkAuth() {
    const checkClerk = setInterval(() => {
        if (window.Clerk && window.Clerk.isReady) {
            clearInterval(checkClerk);
            
            if (window.Clerk.user) {
                const email = window.Clerk.user.primaryEmailAddress.emailAddress.toLowerCase();
                if (AUTHORIZED_EMAILS.includes(email)) {
                    $('admin-auth-overlay').style.display = 'none';
                    loadDashboard();
                    setupAdminUserButton();
                } else {
                    alert('Unauthorized admin email. You do not have access to the admin dashboard.');
                    window.Clerk.signOut().then(() => {
                        window.location.reload();
                    });
                }
            } else {
                $('admin-auth-overlay').style.display = 'flex';
                // Mount Clerk Sign In
                const authCard = document.querySelector('.auth-card');
                authCard.innerHTML = '<div id="clerk-sign-in"></div>';
                window.Clerk.mountSignIn(document.getElementById('clerk-sign-in'));
            }
        }
    }, 100);
}

function setupAdminUserButton() {
    const userButtonDiv = document.createElement('div');
    userButtonDiv.id = 'clerk-admin-user-button';
    
    // Replace the custom profile menu with Clerk's UserButton
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.replaceWith(userButtonDiv);
        
        window.Clerk.mountUserButton(userButtonDiv, {
            customMenuItems: [
                {
                    label: "Dashboard",
                    href: "/admin.html"
                },
                {
                    label: "Profile",
                    href: "/admin-profile.html"
                },
                {
                    label: "Blogs",
                    href: "/admin-blogs.html"
                }
            ]
        });
    }
}

// remove old auth events
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'auth-submit') {
        const email = $('auth-email').value.trim().toLowerCase();
        if (AUTHORIZED_EMAILS.includes(email)) {
            sessionStorage.setItem('everyai_admin_auth', 'true');
            $('admin-auth-overlay').style.display = 'none';
            loadDashboard();
        } else {
            $('auth-error').style.display = 'block';
        }
    }
});
`;

adminJs = adminJs.replace(/function checkAuth\(\) \{[\s\S]*?function logout\(\) \{[\s\S]*?\}/, authLogic);

// also update the initialization to await Clerk load
const initLogic = `
window.addEventListener('load', async () => {
    await window.Clerk?.load();
});
`;
adminJs = initLogic + adminJs;

fs.writeFileSync(adminJsPath, adminJs);
