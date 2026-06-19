// Dashboard Page
import { getAll, put, getById } from '../services/db.js';
import { formatCurrency, formatDate, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast } from '../app.js';
import { t } from '../i18n.js';

/* ── Status badge helpers ── */

function devisBadge(statut) {
    const map = { VALIDE: 'badge-blue', REFUSE: 'badge-red', EN_ATTENTE: 'badge-grey', BROUILLON: 'badge-grey' };
    return map[statut] || 'badge-grey';
}

function factureBadge(statut) {
    const map = { VALIDEE: 'badge-green', REJETEE: 'badge-red', PAYEE: 'badge-blue', EN_ATTENTE: 'badge-grey' };
    return map[statut] || 'badge-grey';
}

function bdcBadge(statut) {
    const map = { SIGNE: 'badge-blue', PAYE: 'badge-green', ENVOYE: 'badge-orange', BROUILLON: 'badge-grey' };
    return map[statut] || 'badge-grey';
}

/* ── Metric card template ── */

function metricCard(label, value, subtitle, icon, iconBg, iconColor) {
    return `
        <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${label}</p>
                    <p class="text-2xl font-headline font-bold text-on-surface mt-1">${value}</p>
                    <p class="text-xs text-on-surface-variant mt-1">${subtitle}</p>
                </div>
                <div class="metric-icon ${iconBg}">
                    <span class="material-symbols-outlined ${iconColor} text-[22px]">${icon}</span>
                </div>
            </div>
        </div>`;
}

/* ── Main render ── */

export async function renderDashboard() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');

    renderSidebar();
    renderTopbar();

    /* Fetch all stores in parallel */
    const [devis, factures, bdc, repertoire, transactions, notesDoc] = await Promise.all([
        getAll('devis'),
        getAll('factures'),
        getAll('bdc'),
        getAll('repertoire'),
        getAll('transactions'),
        getById('settings', 'dashboard_notes')
    ]);

    /* ── Compute metrics ── */

    const totalDevis = devis.reduce((s, d) => s + (d.montant || 0), 0);
    const totalFactures = factures.reduce((s, f) => s + (f.montantTTC || 0), 0);
    const totalBdc = bdc.reduce((s, b) => s + (b.montantTTC || 0), 0);

    const clients = repertoire.filter(c => c.type === 'client').length;
    const fournisseurs = repertoire.filter(c => c.type === 'fournisseur').length;

    const pendingRec = transactions.filter(tx => !tx.matched).length;
    const invoicesPaid = factures.filter(f => f.statut === 'PAYEE').length;

    const savedNotes = notesDoc ? notesDoc.content : '';

    /* ── Sort by date descending for recents ── */

    const recentDevis = [...devis].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
    const recentFactures = [...factures].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
    const recentBdc = [...bdc].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);

    /* ── Render ── */

    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="max-w-7xl mx-auto space-y-6">

            <!-- Row 1: Metric cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${metricCard(
                    t('dash.total_devis'),
                    formatCurrency(totalDevis),
                    t('dash.devis_count', { n: devis.length }),
                    'request_quote',
                    'bg-primary-container',
                    'text-on-primary-container'
                )}
                ${metricCard(
                    t('dash.total_factures'),
                    formatCurrency(totalFactures),
                    t('dash.factures_count', { n: factures.length }),
                    'receipt_long',
                    'bg-secondary-container',
                    'text-on-secondary-container'
                )}
                ${metricCard(
                    t('dash.total_bdc'),
                    formatCurrency(totalBdc),
                    t('dash.bdc_count', { n: bdc.length }),
                    'description',
                    'bg-tertiary-container',
                    'text-on-tertiary-container'
                )}
                ${metricCard(
                    t('dash.contacts'),
                    repertoire.length.toString(),
                    `${clients} ${t('dash.clients')} / ${fournisseurs} ${t('dash.fournisseurs')}`,
                    'contacts',
                    'bg-primary-container',
                    'text-on-primary-container'
                )}
                ${metricCard(
                    t('dash.pending_rec'),
                    pendingRec.toString(),
                    t('dash.unmatched_txn'),
                    'compare_arrows',
                    'bg-tertiary-container',
                    'text-tertiary'
                )}
                ${metricCard(
                    t('dash.invoices_paid'),
                    invoicesPaid.toString(),
                    t('dash.of_total', { n: factures.length }),
                    'payments',
                    'bg-secondary-container',
                    'text-on-secondary-container'
                )}
            </div>

            <!-- Row 2: Recent Devis + Recent Factures -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <!-- Recent Devis -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-surface-container">
                        <h3 class="font-headline font-semibold text-on-surface">${t('dash.recent_devis')}</h3>
                        <a href="#/devis" class="text-xs font-semibold text-primary hover:underline">${t('dash.view_all')}</a>
                    </div>
                    <div class="divide-y divide-surface-container-low">
                        ${recentDevis.length === 0
                            ? `<div class="px-6 py-8 text-center text-on-surface-variant text-sm">${t('devis.none')}</div>`
                            : recentDevis.map(d => `
                                <div class="px-6 py-3.5 flex items-center justify-between">
                                    <div class="min-w-0 mr-3">
                                        <p class="text-sm font-medium text-on-surface truncate">${esc(d.prestataire || '')}</p>
                                        <p class="text-xs text-on-surface-variant truncate">${esc(d.prestation || '')}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-sm font-semibold text-on-surface">${formatCurrency(d.montant || 0)}</p>
                                        <span class="badge ${devisBadge(d.statut)}">${t('status.' + (d.statut || 'brouillon').toLowerCase())}</span>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>

                <!-- Recent Factures -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-surface-container">
                        <h3 class="font-headline font-semibold text-on-surface">${t('dash.recent_factures')}</h3>
                        <a href="#/factures" class="text-xs font-semibold text-primary hover:underline">${t('dash.view_all')}</a>
                    </div>
                    <div class="divide-y divide-surface-container-low">
                        ${recentFactures.length === 0
                            ? `<div class="px-6 py-8 text-center text-on-surface-variant text-sm">${t('fac.none')}</div>`
                            : recentFactures.map(f => `
                                <div class="px-6 py-3.5 flex items-center justify-between">
                                    <div class="min-w-0 mr-3">
                                        <p class="text-sm font-medium text-on-surface truncate">${esc(f.fournisseur || '')}</p>
                                        <p class="text-xs text-on-surface-variant truncate">${esc(f.numero || '')} - ${formatDate(f.date)}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-sm font-semibold text-on-surface">${formatCurrency(f.montantTTC || 0)}</p>
                                        <span class="badge ${factureBadge(f.statut)}">${t('status.' + (f.statut || 'en_attente').toLowerCase())}</span>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>

            <!-- Row 3: Recent BDC + Quick Links -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <!-- Recent BDC -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-surface-container">
                        <h3 class="font-headline font-semibold text-on-surface">${t('dash.recent_bdc')}</h3>
                        <a href="#/bdc" class="text-xs font-semibold text-primary hover:underline">${t('dash.view_all')}</a>
                    </div>
                    <div class="divide-y divide-surface-container-low">
                        ${recentBdc.length === 0
                            ? `<div class="px-6 py-8 text-center text-on-surface-variant text-sm">${t('bdc.none')}</div>`
                            : recentBdc.map(b => `
                                <div class="px-6 py-3.5 flex items-center justify-between">
                                    <div class="min-w-0 mr-3">
                                        <p class="text-sm font-medium text-on-surface truncate">${esc(b.client || b.fournisseur || '')}</p>
                                        <p class="text-xs text-on-surface-variant truncate">${esc(b.orderNumber || '')} - ${formatDate(b.date)}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-sm font-semibold text-on-surface">${formatCurrency(b.montantTTC || 0)}</p>
                                        <span class="badge ${bdcBadge(b.statut)}">${t('status.' + (b.statut || 'brouillon').toLowerCase())}</span>
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>

                <!-- Quick Links -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                    <h3 class="font-headline font-semibold text-on-surface mb-4">${t('dash.quick_access')}</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <a href="#/devis" class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined text-primary">add_circle</span>
                            <span class="text-sm font-medium text-on-surface">${t('dash.new_devis')}</span>
                        </a>
                        <a href="#/factures" class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined text-primary">upload_file</span>
                            <span class="text-sm font-medium text-on-surface">${t('dash.import_invoice')}</span>
                        </a>
                        <a href="#/bdc" class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined text-primary">note_add</span>
                            <span class="text-sm font-medium text-on-surface">${t('dash.new_bdc')}</span>
                        </a>
                        <a href="#/repertoire" class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                            <span class="material-symbols-outlined text-primary">contacts</span>
                            <span class="text-sm font-medium text-on-surface">${t('dash.directory')}</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Row 4: Notes -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-headline font-semibold text-on-surface">${t('dash.notes')}</h3>
                    <button id="dash-save-notes" class="btn-primary text-sm px-4 py-2 rounded-lg">
                        <span class="material-symbols-outlined text-[18px] mr-1 align-middle">save</span>
                        ${t('actions.save')}
                    </button>
                </div>
                <textarea
                    id="dash-notes"
                    rows="5"
                    class="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface text-sm p-4 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="${t('dash.notes_placeholder')}"
                >${esc(savedNotes)}</textarea>
            </div>

        </div>
    `;

    /* ── Notes: save handler ── */

    document.getElementById('dash-save-notes').addEventListener('click', async () => {
        const textarea = document.getElementById('dash-notes');
        const noteContent = textarea.value;
        await put('settings', {
            id: 'dashboard_notes',
            content: noteContent,
            updatedAt: new Date().toISOString()
        });
        showToast(t('dash.notes_saved'));
    });
}
