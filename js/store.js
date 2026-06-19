// Central Data Store
import { openDB, clearStore } from './services/db.js';
import { getLocale } from './i18n.js';

const DATA_VERSION = 'nexus_data_v4';

export async function seedDatabase() {
    await openDB();

    // Clear all data on version bump so user starts fresh
    if (!localStorage.getItem(DATA_VERSION)) {
        // Remove old version keys
        ['nexus_data_v2', 'nexus_data_v3'].forEach(k => localStorage.removeItem(k));
        const stores = ['devis', 'factures', 'transactions', 'team', 'settings', 'documents', 'bdc', 'repertoire'];
        for (const store of stores) {
            try { await clearStore(store); } catch(e) { /* store may not exist yet */ }
        }
        localStorage.setItem(DATA_VERSION, '1');
        console.log('[Nexus] Database cleared for fresh start v4');
    }
}

// XSS prevention
export function esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Utility formatting (locale-aware)
export function formatCurrency(amount) {
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
}
