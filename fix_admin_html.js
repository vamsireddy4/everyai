const fs = require('fs');

const files = ['admin.html', 'admin-profile.html', 'admin-blogs.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Update clerk key
    content = content.replace(/data-clerk-publishable-key="[^"]*"/g, 'data-clerk-publishable-key="pk_test_cG9wdWxhci13ZWFzZWwtNTEuY2xlcmsuYWNjb3VudHMuZGV2JA"');

    // Replace overlay
    content = content.replace(/<div id="admin-auth-overlay">[\s\S]*?<\/div>\s*<\/div>/, `<div id="admin-auth-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 500; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
        <div class="auth-card" style="padding: 48px; border-radius: var(--radius-lg); width: 90%; max-width: 450px; text-align: center; position: relative; z-index: 501;">
            <div id="clerk-sign-in"></div>
        </div>
    </div>`);

    // Replace profile menu
    content = content.replace(/<div class="profile-menu">[\s\S]*?<\/svg> Logout<\/div>\s*<\/div>\s*<\/div>/, '<div id="clerk-admin-user-button"></div>');

    fs.writeFileSync(file, content);
});

console.log('HTML files updated successfully.');
