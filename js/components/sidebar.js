// Sidebar Navigation Component
import { getSession, logout } from '../auth.js';
import { navigate, getCurrentRoute } from '../router.js';
import { t } from '../i18n.js';

const MAIN_ITEMS = [
    { hash: '#/bdc', icon: 'description', key: 'nav.bdc' },
    { hash: '#/equipes', icon: 'group', key: 'nav.equipes' },
    { hash: '#/parametres', icon: 'settings', key: 'nav.parametres' },
];

const OTHER_ITEMS = [
    { hash: '#/dashboard', icon: 'dashboard', key: 'nav.dashboard' },
    { hash: '#/devis', icon: 'request_quote', key: 'nav.devis' },
    { hash: '#/factures', icon: 'receipt_long', key: 'nav.factures' },
    { hash: '#/rapprochement', icon: 'compare_arrows', key: 'nav.rapprochement' },
    { hash: '#/repertoire', icon: 'contacts', key: 'nav.repertoire' },
];

export function renderSidebar() {
    const container = document.getElementById('sidebar-container');
    const session = getSession();
    const current = getCurrentRoute().split('?')[0];

    container.innerHTML = `
        <nav class="fixed top-0 left-0 w-64 h-full bg-surface-container-lowest border-r border-surface-container-high flex flex-col z-30">
            <!-- Logo -->
            <div class="px-6 py-5 border-b border-surface-container-high">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-[20px]">hub</span>
                    </div>
                    <div>
                        <h1 class="font-headline font-bold text-[15px] text-on-surface leading-tight">Nexus</h1>
                        <p class="text-[11px] text-on-surface-variant leading-tight">Dashboard</p>
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <div class="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                ${MAIN_ITEMS.map(item => `
                    <a href="${item.hash}" class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${current === item.hash ? 'active' : 'text-on-surface-variant'}">
                        <span class="material-symbols-outlined text-[20px]">${item.icon}</span>
                        <span>${t(item.key)}</span>
                    </a>
                `).join('')}

                <!-- Otros (collapsed) -->
                <div class="mt-4 pt-3 border-t border-surface-container-high">
                    <button id="otros-toggle" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                        <span class="material-symbols-outlined text-[20px]">more_horiz</span>
                        <span>Otros</span>
                        <span class="material-symbols-outlined text-[16px] ml-auto transition-transform" id="otros-chevron">expand_more</span>
                    </button>
                    <div id="otros-menu" class="hidden mt-1 space-y-0.5 pl-2">
                        ${OTHER_ITEMS.map(item => `
                            <a href="${item.hash}" class="sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] ${current === item.hash ? 'active' : 'text-on-surface-variant'}">
                                <span class="material-symbols-outlined text-[18px]">${item.icon}</span>
                                <span>${t(item.key)}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- User -->
            <div class="px-4 py-4 border-t border-surface-container-high">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                        <span class="text-xs font-bold text-on-primary-container">${session?.initials || '??'}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-on-surface truncate">${session?.username || 'User'}</p>
                        <p class="text-[11px] text-on-surface-variant">${session?.role || ''}</p>
                    </div>
                    <button id="logout-btn" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors" title="${t('sidebar.logout')}">
                        <span class="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </div>
        </nav>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
        navigate('#/login');
    });

    const otrosToggle = document.getElementById('otros-toggle');
    const otrosMenu = document.getElementById('otros-menu');
    const otrosChevron = document.getElementById('otros-chevron');

    const otrosHashes = OTHER_ITEMS.map(i => i.hash);
    if (otrosHashes.includes(current)) {
        otrosMenu.classList.remove('hidden');
        otrosChevron.style.transform = 'rotate(180deg)';
    }

    otrosToggle.addEventListener('click', () => {
        const open = otrosMenu.classList.toggle('hidden');
        otrosChevron.style.transform = open ? '' : 'rotate(180deg)';
    });
}
