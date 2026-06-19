// Top App Bar Component
import { getSession } from '../auth.js';
import { t, getLang, setLang } from '../i18n.js';

const PAGE_TITLE_KEYS = {
    '#/dashboard': 'nav.dashboard',
    '#/devis': 'nav.devis',
    '#/factures': 'nav.factures',
    '#/bdc': 'nav.bdc',
    '#/rapprochement': 'topbar.rapprochement',
    '#/repertoire': 'nav.repertoire',
    '#/equipes': 'nav.equipes',
    '#/parametres': 'nav.parametres',
};

export function renderTopbar() {
    const container = document.getElementById('topbar-container');
    const session = getSession();
    const route = (window.location.hash || '#/dashboard').split('?')[0];
    const titleKey = PAGE_TITLE_KEYS[route] || 'nav.dashboard';
    const title = t(titleKey);
    const lang = getLang();

    container.innerHTML = `
        <header class="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-container-high z-20 flex items-center justify-between px-6">
            <div>
                <h2 class="font-headline font-bold text-lg text-on-surface">${title}</h2>
            </div>
            <div class="flex items-center gap-4">
                <!-- Language Switcher -->
                <div class="flex items-center bg-surface-container-low rounded-lg overflow-hidden border border-transparent">
                    <button class="lang-btn px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'fr' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}" data-lang="fr">FR</button>
                    <button class="lang-btn px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}" data-lang="en">EN</button>
                    <button class="lang-btn px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'es' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}" data-lang="es">ES</button>
                </div>
                <!-- Search -->
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                    <input type="text" placeholder="${t('topbar.search')}" class="pl-10 pr-4 py-2 bg-surface-container-low rounded-lg text-sm border border-transparent focus:border-primary focus:ring-1 focus:ring-primary/20 w-56 outline-none transition-all">
                </div>
                <!-- Notifications -->
                <button class="relative p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                    <span class="material-symbols-outlined text-[22px]">notifications</span>
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
                </button>
                <!-- User avatar -->
                <div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center cursor-pointer">
                    <span class="text-xs font-bold text-on-primary-container">${session?.initials || '??'}</span>
                </div>
            </div>
        </header>
    `;

    // Language switcher
    container.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLang(btn.dataset.lang);
            // Re-render current page
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
    });
}
