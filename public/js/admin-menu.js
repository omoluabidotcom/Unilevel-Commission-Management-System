// Renders the admin sidebar menu and keeps the active page highlighted.
(function () {
  function ensureAdminNavStyles() {
    if (document.getElementById('adminNavSharedStyles')) return;

    const style = document.createElement('style');
    style.id = 'adminNavSharedStyles';
    style.textContent = `
      #adminSidebar .nav-item.logout {
        color: #dc2626;
      }
      #adminSidebar .nav-item.logout:hover {
        background: #fee2e2;
        color: #dc2626;
      }
    `;
    document.head.appendChild(style);
  }

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: 'dashboard.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      `,
    },
    {
      key: 'commissions',
      label: 'Commissions',
      href: 'commissions.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      `,
    },
    {
      key: 'purchases',
      label: 'Purchases',
      href: 'purchases.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      `,
    },
    {
      key: 'distributors',
      label: 'Distributors',
      href: 'distributors.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      `,
    },
    {
      key: 'admin-management',
      label: 'Admin Management',
      href: 'admin-management.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      `,
    },
    /*
    {
      key: 'notifications',
      label: 'Notifications',
      href: 'notifications.html',
      badgeId: 'navBadge',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      `,
    },
    */
    {
      key: 'settings',
      label: 'Settings',
      href: 'settings.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      `,
    },
    {
      key: 'profile',
      label: 'Profile',
      href: 'profile.html',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `,
    },
    {
      key: 'logout',
      label: 'Logout',
      href: '#',
      icon: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      `,
      action: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      },
    },
  ];

  function getCurrentPage() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const page = parts.length ? parts[parts.length - 1].toLowerCase() : 'dashboard.html';
    return page.split('?')[0]; // strip query strings
  }

  function renderSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    // Guard: never render twice — prevents notification pages re-running this
    if (sidebar.dataset.rendered === '1') return;
    sidebar.dataset.rendered = '1';

    const currentPage = getCurrentPage();

    sidebar.innerHTML = `
      <div class="brand">
        <div class="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <span class="brand-name">CommissionHub</span>
      </div>
    `;

    const nav = document.createElement('nav');
    nav.className = 'nav';

    menuItems.forEach((item) => {
      const a = document.createElement('a');
      a.className = 'nav-item';
      a.href = item.href;

      if (item.key === 'logout') {
        a.classList.add('logout');
      }

      const badgeHtml = item.badgeId
        ? `<span id="${item.badgeId}" class="nav-badge" style="margin-left:auto;"></span>`
        : '';
      a.innerHTML = `${item.icon}<span>${item.label}</span>${badgeHtml}`;

      if (item.key === 'logout') {
        a.addEventListener('click', (event) => {
          event.preventDefault();
          item.action();
        });
      }

      // Match exact page, or distributor-profile belongs to distributors
      const normHref = item.href ? item.href.toLowerCase().split('?')[0] : '';
      const isActive = normHref === currentPage
        || (item.key === 'distributors' && currentPage === 'distributor-profile.html');
      if (isActive) {
        a.classList.add('active');
      }

      nav.appendChild(a);
    });

    sidebar.appendChild(nav);
  }

  ensureAdminNavStyles();
  renderSidebar();
})();