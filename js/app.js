// Nexus Dashboard - Entry Point
import { isAuthenticated } from './auth.js';
import { registerRoute, startRouter } from './router.js';
import { seedDatabase } from './store.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderDevis } from './pages/devis.js';
import { renderFactures } from './pages/factures.js';
import { renderBDC } from './pages/bdc.js';
import { renderRapprochement } from './pages/rapprochement.js';
import { renderRepertoire } from './pages/repertoire.js';
import { renderEquipes } from './pages/equipes.js';
import { renderParametres } from './pages/parametres.js';

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Toast system
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-600',
        error: 'bg-error',
        info: 'bg-primary',
    };
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
    };
    toast.className = `toast-enter flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[18px]">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal system
export function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

export function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
}

// Boot
async function boot() {
    await seedDatabase();

    registerRoute('#/login', renderLogin);
    registerRoute('#/dashboard', renderDashboard);
    registerRoute('#/devis', renderDevis);
    registerRoute('#/factures', renderFactures);
    registerRoute('#/bdc', renderBDC);
    registerRoute('#/rapprochement', renderRapprochement);
    registerRoute('#/repertoire', renderRepertoire);
    registerRoute('#/equipes', renderEquipes);
    registerRoute('#/parametres', renderParametres);

    startRouter(isAuthenticated);
}

boot().catch(err => console.error('[Nexus] Boot failed:', err));
