import { getAll, put, remove } from '../services/db.js';
import { formatCurrency, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast, openModal, closeModal } from '../app.js';
import { PACKAGES, CATEGORIES, BANNER_PRICES, getPackageById } from '../data/packages.js';
import { downloadBDC } from '../services/pdf-generator.js';

const PAGE_SIZE = 10;
const STATUS_FLOW = ['BROUILLON', 'ENVOYE', 'SIGNE', 'PAYE_PARTIEL', 'PAYE', 'ANNULE'];
const STATUS_BADGE = {
    BROUILLON: 'badge-grey', ENVOYE: 'badge-orange', SIGNE: 'badge-blue',
    PAYE_PARTIEL: 'badge-purple', PAYE: 'badge-green', ANNULE: 'badge-red'
};
const STATUS_LABELS = {
    BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', SIGNE: 'Signé',
    PAYE_PARTIEL: 'Paiement partiel', PAYE: 'Payé', ANNULE: 'Annulé'
};

const DEFAULT_ICONS = ['chair', 'mic', 'confirmation_number', 'visibility', 'handshake', 'star', 'category', 'inventory_2', 'local_shipping', 'build'];

async function nextOrderNumber() {
    const all = await getAll('bdc');
    let max = 0;
    for (const b of all) {
        const m = b.orderNumber?.match(/2026\/(\d+)/);
        if (m) max = Math.max(max, parseInt(m[1]));
    }
    return `2026/${String(max + 1).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════
// ITEM PARSING: "2x TV Screens" → {qty:2, label:"TV Screens"}
// ═══════════════════════════════════════════

function parseItem(str) {
    if (typeof str === 'object' && str !== null) return { qty: str.qty || 1, label: str.label || '' };
    const m = String(str).match(/^(\d+)\s*[x×]\s*(.+)$/i);
    if (m) return { qty: parseInt(m[1]), label: m[2].trim() };
    const m2 = String(str).match(/^Up to (\d+)\s+(.+)$/i);
    if (m2) return { qty: parseInt(m2[1]), label: m2[2].trim(), prefix: 'Up to' };
    return { qty: 1, label: String(str) };
}

function formatItem(item) {
    if (item.prefix) return `${item.prefix} ${item.qty} ${item.label}`;
    if (item.qty === 1) return item.label;
    return `${item.qty}x ${item.label}`;
}

// ═══════════════════════════════════════════
// CONVERT PACKAGE → SECTIONS MODEL
// ═══════════════════════════════════════════

function packageToSections(pkg) {
    const sections = [];
    const add = (name, icon, arr) => {
        if (arr?.length) sections.push({ name, icon, items: arr.map(parseItem) });
    };
    add('Furniture', 'chair', pkg.furniture);
    add('Talks', 'mic', pkg.talks);
    add('Tickets', 'confirmation_number', pkg.tickets);
    add('Visibility', 'visibility', pkg.visibility);
    add('Lead Generation', 'handshake', pkg.leadGeneration);
    if (pkg.specialLabel && pkg.specialItems?.length) {
        add(pkg.specialLabel, 'star', pkg.specialItems);
    }
    return sections;
}

function deepClonePackage(pkg) {
    const sections = pkg.sections
        ? pkg.sections.map(s => ({ name: s.name, icon: s.icon, items: s.items.map(i => ({ ...i })) }))
        : packageToSections(pkg);
    return {
        name: pkg.name,
        priceHT: pkg.priceHT,
        standM2: pkg.standM2 ?? null,
        hasBanners: pkg.hasBanners || false,
        category: pkg.category,
        vatRate: pkg.vatRate || 17,
        dinner: pkg.dinner || '',
        dinnerLabel: pkg.dinnerLabel || '',
        bonus: pkg.bonus || '',
        sections
    };
}

function calcBannersTotal(banners) {
    if (!banners) return 0;
    return ['A', 'B', 'C'].reduce((sum, k) => {
        const b = banners[k] || {};
        return sum + (b.qty || 0) * (b.price ?? BANNER_PRICES[k].price);
    }, 0);
}

function computeFinancials(state) {
    const cp = state.customPackage;
    const bannersTotal = calcBannersTotal(state.banners);
    const specialHT = state.specialRequestAmount || 0;
    const totalHT = (cp.priceHT || 0) + bannersTotal + specialHT;
    const vat = state.tauxTVA || 17;
    const totalVAT = Math.round(totalHT * vat / 100 * 100) / 100;
    const totalTTC = totalHT + totalVAT;
    const half = Math.round(totalTTC / 2 * 100) / 100;
    return { bannersTotal, totalHT, totalVAT, totalTTC, half, vat };
}

// ═══════════════════════════════════════════
// EXCEL / CSV EXPORT
// ═══════════════════════════════════════════

function exportBDCtoCSV(bdcList) {
    const rows = [['N° Commande', 'Date', 'Client', 'Package', 'Catégorie', 'Qty', 'Élément', 'Prix HT Package', 'Banners HT', 'Special HT', 'Total HT', 'TVA', 'Total TTC', 'Statut']];
    for (const b of bdcList) {
        const cp = b.customPackage || getPackageById(b.packageId) || {};
        const client = b.client?.companyName || '';
        const sections = cp.sections || packageToSections(cp);
        let first = true;
        for (const sec of sections) {
            for (const item of sec.items) {
                rows.push([
                    first ? b.orderNumber : '', first ? b.date : '', first ? client : '',
                    first ? cp.name : '', `[${sec.name}]`,
                    item.qty, item.prefix ? `${item.prefix} ${item.label}` : item.label,
                    first ? cp.priceHT : '', first ? (b.bannersTotal || 0) : '',
                    first ? (b.specialRequestAmount || 0) : '',
                    first ? b.montantHT : '', first ? b.montantTVA : '', first ? b.montantTTC : '',
                    first ? (STATUS_LABELS[b.statut] || b.statut) : ''
                ]);
                first = false;
            }
        }
        if (cp.dinner) rows.push(['', '', '', '', '[Dinner]', 1, cp.dinner, '', '', '', '', '', '', '']);
        if (b.banners) {
            for (const k of ['A', 'B', 'C']) {
                const bk = b.banners[k];
                if (bk?.qty > 0) {
                    const price = bk.price ?? BANNER_PRICES[k].price;
                    rows.push(['', '', '', '', '[Banner]', bk.qty, `Banner ${k} (${BANNER_PRICES[k].dimensions}) @ €${price}`, '', '', '', '', '', '', '']);
                }
            }
        }
        if (first) rows.push([b.orderNumber, b.date, client, cp.name, '', '', '', cp.priceHT, b.bannersTotal || 0, b.specialRequestAmount || 0, b.montantHT, b.montantTVA, b.montantTTC, STATUS_LABELS[b.statut] || b.statut]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BDC_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════

export async function renderBDC() {
    const shell = document.getElementById('app-shell');
    document.getElementById('login-screen').classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let currentPage = 1;
    let allBDC = await getAll('bdc');
    allBDC.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    function render() {
        const totalHT = allBDC.reduce((s, b) => s + (b.montantHT || 0), 0);
        const totalTTC = allBDC.reduce((s, b) => s + (b.montantTTC || 0), 0);
        const collected = allBDC.reduce((s, b) => {
            let c = 0;
            if (b.paiement1Recu) c += (b.paiement1 || 0);
            if (b.paiement2Recu) c += (b.paiement2 || 0);
            return s + c;
        }, 0);
        const pending = totalTTC - collected;
        const signedCount = allBDC.filter(b => ['SIGNE', 'PAYE_PARTIEL', 'PAYE'].includes(b.statut)).length;
        const totalPages = Math.ceil(allBDC.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageData = allBDC.slice(start, start + PAGE_SIZE);

        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    ${metricCard('receipt_long', 'Total HT', formatCurrency(totalHT), `${allBDC.length} BDC`, 'bg-primary-container', 'text-on-primary-container')}
                    ${metricCard('account_balance', 'Total TTC', formatCurrency(totalTTC), `${signedCount} signés`, 'bg-surface-container-high', 'text-on-surface-variant')}
                    ${metricCard('payments', 'Encaissé', formatCurrency(collected), `${allBDC.filter(b => b.statut === 'PAYE').length} payés`, 'bg-green-50', 'text-green-700')}
                    ${metricCard('pending_actions', 'En attente', formatCurrency(pending), 'À recouvrer', 'bg-orange-50', 'text-orange-700')}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <h3 class="font-headline font-semibold text-on-surface">Bons de Commande</h3>
                    <div class="flex gap-2">
                        ${allBDC.length ? '<button id="export-csv-btn" class="btn-secondary flex items-center gap-1.5 text-xs"><span class="material-symbols-outlined text-[16px]">download</span><span class="hidden sm:inline">Export Excel</span><span class="sm:hidden">CSV</span></button>' : ''}
                        <button id="add-bdc-btn" class="btn-primary flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            <span class="hidden sm:inline">Nouveau BDC</span><span class="sm:hidden">Nouveau</span>
                        </button>
                    </div>
                </div>
                <!-- Desktop table -->
                <div class="hidden md:block bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                    <table class="nx-table w-full"><thead><tr class="text-left">
                        <th>Client</th><th>N°</th><th>Package</th><th class="text-right">TTC</th><th>Statut</th><th class="text-center">Paiement</th><th class="text-right">Actions</th>
                    </tr></thead><tbody>
                        ${pageData.map(bdcRow).join('')}
                        ${pageData.length === 0 ? '<tr><td colspan="7" class="text-center py-8 text-on-surface-variant">Aucun bon de commande</td></tr>' : ''}
                    </tbody></table>
                    ${totalPages > 1 ? paginationHTML(currentPage, totalPages, start, allBDC.length) : ''}
                </div>
                <!-- Mobile cards -->
                <div class="md:hidden space-y-3">
                    ${pageData.map(bdcCard).join('')}
                    ${pageData.length === 0 ? '<p class="text-center py-8 text-on-surface-variant">Aucun bon de commande</p>' : ''}
                </div>
            </div>
        `;

        content.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => { const p = parseInt(btn.dataset.page); if (p >= 1 && p <= totalPages) { currentPage = p; render(); } }));
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id, action = btn.dataset.action;
                const b = allBDC.find(x => x.id === id);
                if (!b) return;
                if (action === 'edit') showEditWizard(b);
                else if (action === 'pdf') { try { await downloadBDC(b); showToast('PDF téléchargé', 'success'); } catch (err) { showToast('Erreur PDF: ' + err.message, 'error'); } }
                else if (action === 'delete') { if (!confirm('Supprimer ce BDC ?')) return; await remove('bdc', id); allBDC = await getAll('bdc'); allBDC.sort((a2, b2) => (b2.createdAt || '').localeCompare(a2.createdAt || '')); showToast('BDC supprimé', 'info'); render(); }
                else if (action === 'toggle-p1') { b.paiement1Recu = !b.paiement1Recu; await put('bdc', b); const idx = allBDC.findIndex(x => x.id === b.id); if (idx >= 0) allBDC[idx] = b; render(); }
                else if (action === 'toggle-p2') { b.paiement2Recu = !b.paiement2Recu; await put('bdc', b); const idx = allBDC.findIndex(x => x.id === b.id); if (idx >= 0) allBDC[idx] = b; render(); }
            });
        });
        document.getElementById('add-bdc-btn')?.addEventListener('click', () => showCreateWizard());
        document.getElementById('export-csv-btn')?.addEventListener('click', () => { exportBDCtoCSV(allBDC); showToast('CSV exporté', 'success'); });
    }

    function bdcRow(b) {
        const pkgName = b.customPackage?.name || getPackageById(b.packageId)?.name || '—';
        const clientName = b.client?.companyName || '(sans client)';
        return `<tr>
            <td class="font-medium text-on-surface">${esc(clientName)}</td>
            <td class="text-on-surface-variant font-mono text-xs">${esc(b.orderNumber)}</td>
            <td class="text-on-surface-variant text-xs">${esc(pkgName)}</td>
            <td class="text-right font-semibold text-on-surface">${formatCurrency(b.montantTTC)}</td>
            <td><span class="badge ${STATUS_BADGE[b.statut] || 'badge-grey'}">${STATUS_LABELS[b.statut] || b.statut}</span></td>
            <td class="text-center"><div class="flex items-center justify-center gap-1.5">
                <button data-action="toggle-p1" data-id="${b.id}" title="50% à la signature" class="inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-colors ${b.paiement1Recu ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}"><span class="material-symbols-outlined text-[14px]">${b.paiement1Recu ? 'check' : 'circle'}</span></button>
                <button data-action="toggle-p2" data-id="${b.id}" title="50% avant événement" class="inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-colors ${b.paiement2Recu ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}"><span class="material-symbols-outlined text-[14px]">${b.paiement2Recu ? 'check' : 'circle'}</span></button>
            </div></td>
            <td class="text-right"><div class="flex items-center justify-end gap-1">
                <button data-action="pdf" data-id="${b.id}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary"><span class="material-symbols-outlined text-[18px]">picture_as_pdf</span></button>
                <button data-action="edit" data-id="${b.id}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button data-action="delete" data-id="${b.id}" class="p-1.5 rounded-lg hover:bg-error-container/30 text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </div></td>
        </tr>`;
    }

    function bdcCard(b) {
        const pkgName = b.customPackage?.name || getPackageById(b.packageId)?.name || '—';
        const clientName = b.client?.companyName || '(sans client)';
        return `<div class="bg-surface-container-lowest rounded-xl shadow-sm p-4">
            <div class="flex items-start justify-between mb-2">
                <div><p class="font-semibold text-on-surface text-sm">${esc(clientName)}</p><p class="text-xs text-on-surface-variant font-mono">${esc(b.orderNumber)}</p></div>
                <span class="badge ${STATUS_BADGE[b.statut] || 'badge-grey'} text-[10px]">${STATUS_LABELS[b.statut] || b.statut}</span>
            </div>
            <div class="flex items-center justify-between">
                <div><p class="text-xs text-on-surface-variant">${esc(pkgName)}</p><p class="font-bold text-on-surface">${formatCurrency(b.montantTTC)}</p></div>
                <div class="flex gap-1">
                    <button data-action="pdf" data-id="${b.id}" class="p-2 rounded-lg hover:bg-primary-container text-primary"><span class="material-symbols-outlined text-[20px]">picture_as_pdf</span></button>
                    <button data-action="edit" data-id="${b.id}" class="p-2 rounded-lg hover:bg-primary-container text-primary"><span class="material-symbols-outlined text-[20px]">edit</span></button>
                    <button data-action="delete" data-id="${b.id}" class="p-2 rounded-lg hover:bg-error-container/30 text-error"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════
    // WIZARD
    // ═══════════════════════════════════════════

    async function showCreateWizard() {
        const state = {
            step: 1, orderNumber: await nextOrderNumber(), date: new Date().toISOString().split('T')[0],
            client: {}, packageId: null, customPackage: null,
            banners: { A: { qty: 0, reuse: 0, price: BANNER_PRICES.A.price }, B: { qty: 0, reuse: 0, price: BANNER_PRICES.B.price }, C: { qty: 0, reuse: 0, price: BANNER_PRICES.C.price } },
            specialRequest: '', specialRequestAmount: 0, tauxTVA: 17, _activeCat: CATEGORIES[0].id
        };
        runWizard(state, false);
    }

    async function showEditWizard(bdc) {
        const origPkg = getPackageById(bdc.packageId);
        const cp = bdc.customPackage ? deepClonePackage(bdc.customPackage) : deepClonePackage(origPkg);
        const state = {
            step: 2, editId: bdc.id, orderNumber: bdc.orderNumber, date: bdc.date, statut: bdc.statut,
            client: { ...(bdc.client || {}) }, packageId: bdc.packageId, customPackage: cp,
            banners: {
                A: { ...(bdc.banners?.A || { qty: 0, reuse: 0 }), price: bdc.banners?.A?.price ?? BANNER_PRICES.A.price },
                B: { ...(bdc.banners?.B || { qty: 0, reuse: 0 }), price: bdc.banners?.B?.price ?? BANNER_PRICES.B.price },
                C: { ...(bdc.banners?.C || { qty: 0, reuse: 0 }), price: bdc.banners?.C?.price ?? BANNER_PRICES.C.price }
            },
            specialRequest: bdc.specialRequest || '', specialRequestAmount: bdc.specialRequestAmount || 0,
            tauxTVA: bdc.tauxTVA || 17, paiement1Recu: bdc.paiement1Recu || false, paiement2Recu: bdc.paiement2Recu || false,
            _activeCat: origPkg?.category || CATEGORIES[0].id
        };
        runWizard(state, true);
    }

    function runWizard(state, isEdit) {
        const STEPS = ['Package', 'Personnaliser', 'Client', 'Résumé'];

        function renderWizard() {
            openModal(`
                <div class="p-4 sm:p-6 w-full max-w-[780px]">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h3 class="font-headline font-bold text-base sm:text-lg text-on-surface">${isEdit ? 'Modifier BDC' : 'Nouveau Bon de Commande'}</h3>
                            ${isEdit ? `<p class="text-xs text-on-surface-variant font-mono">${esc(state.orderNumber)}</p>` : ''}
                        </div>
                        <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
                        ${STEPS.map((s, i) => `
                            <div class="flex items-center gap-1 sm:gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''} min-w-0">
                                <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${state.step === i + 1 ? 'bg-primary text-on-primary' : state.step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}">
                                    ${state.step > i + 1 ? '<span class="material-symbols-outlined text-[12px] sm:text-[14px]">check</span>' : i + 1}
                                </div>
                                <span class="text-[10px] sm:text-xs ${state.step === i + 1 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'} hidden sm:inline truncate">${s}</span>
                                ${i < STEPS.length - 1 ? '<div class="flex-1 h-px bg-surface-container-high min-w-2"></div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div id="wizard-content" class="overflow-x-hidden"></div>
                    <div class="flex justify-between pt-3 mt-3 border-t border-surface-container">
                        <button id="wizard-back" class="btn-secondary text-xs sm:text-sm ${state.step === 1 || (isEdit && state.step === 2) ? 'invisible' : ''}" type="button">
                            <span class="material-symbols-outlined text-[14px] mr-0.5">arrow_back</span> <span class="hidden sm:inline">Précédent</span><span class="sm:hidden">Retour</span>
                        </button>
                        <div class="flex gap-2">
                            <button id="wizard-cancel" class="btn-secondary text-xs sm:text-sm" type="button">Annuler</button>
                            ${state.step < STEPS.length
                                ? '<button id="wizard-next" class="btn-primary text-xs sm:text-sm" type="button">Suivant <span class="material-symbols-outlined text-[14px] ml-0.5">arrow_forward</span></button>'
                                : `<button id="wizard-save" class="btn-primary text-xs sm:text-sm" type="button"><span class="material-symbols-outlined text-[14px] mr-0.5">save</span> ${isEdit ? 'Enregistrer & PDF' : 'Créer & PDF'}</button>`}
                        </div>
                    </div>
                </div>
            `);

            const wc = document.getElementById('wizard-content');
            if (state.step === 1) renderStepPackage(wc, state);
            else if (state.step === 2) renderStepEditor(wc, state);
            else if (state.step === 3) renderStepClient(wc, state);
            else renderStepSummary(wc, state, isEdit);

            document.getElementById('modal-close')?.addEventListener('click', closeModal);
            document.getElementById('wizard-cancel')?.addEventListener('click', closeModal);
            document.getElementById('wizard-back')?.addEventListener('click', () => { collectCurrentStep(state); state.step--; renderWizard(); });
            document.getElementById('wizard-next')?.addEventListener('click', () => {
                if (!collectCurrentStep(state)) return;
                if (state.step === 1 && !state.packageId) { showToast('Sélectionnez un package', 'error'); return; }
                if (state.step === 1 && !state.customPackage) state.customPackage = deepClonePackage(getPackageById(state.packageId));
                state.step++;
                renderWizard();
            });
            document.getElementById('wizard-save')?.addEventListener('click', async () => { collectCurrentStep(state); await saveBDC(state, isEdit); });
        }

        async function saveBDC(st, edit) {
            if (!st.customPackage) return;
            const fin = computeFinancials(st);
            const bdc = {
                id: edit ? st.editId : 'bdc-' + Date.now(),
                orderNumber: st.orderNumber, date: st.date,
                statut: edit ? (st.statut || 'BROUILLON') : 'BROUILLON',
                client: { ...st.client }, packageId: st.packageId,
                customPackage: deepClonePackage(st.customPackage),
                banners: JSON.parse(JSON.stringify(st.banners)),
                bannersTotal: fin.bannersTotal,
                specialRequest: st.specialRequest, specialRequestAmount: st.specialRequestAmount || 0,
                montantHT: fin.totalHT, tauxTVA: fin.vat, montantTVA: fin.totalVAT, montantTTC: fin.totalTTC,
                paiement1: fin.half, paiement2: fin.totalTTC - fin.half,
                paiement1Recu: edit ? (st.paiement1Recu || false) : false,
                paiement2Recu: edit ? (st.paiement2Recu || false) : false
            };
            if (edit) {
                const existing = (await getAll('bdc')).find(b => b.id === st.editId);
                if (existing) { Object.assign(existing, bdc); await put('bdc', existing); }
            } else { bdc.createdAt = new Date().toISOString(); await put('bdc', bdc); }
            closeModal();
            showToast(edit ? 'BDC mis à jour' : 'BDC créé avec succès', 'success');
            try { const saved = edit ? (await getAll('bdc')).find(b2 => b2.id === bdc.id) || bdc : bdc; await downloadBDC(saved); showToast('PDF téléchargé', 'success'); } catch (err) { showToast('Erreur PDF: ' + err.message, 'error'); }
            allBDC = await getAll('bdc'); allBDC.sort((a2, b2) => (b2.createdAt || '').localeCompare(a2.createdAt || '')); render();
        }

        renderWizard();
    }

    // ═══════════════════════════════════════════
    // COLLECT STEP DATA
    // ═══════════════════════════════════════════

    function collectCurrentStep(state) {
        const wc = document.getElementById('wizard-content');
        if (!wc) return true;

        if (state.step === 2 && state.customPackage) {
            state.customPackage.name = wc.querySelector('[name="pkgName"]')?.value?.trim() || state.customPackage.name;
            state.customPackage.priceHT = parseFloat(wc.querySelector('[name="pkgPrice"]')?.value) || 0;
            const sv = wc.querySelector('[name="pkgStand"]')?.value;
            state.customPackage.standM2 = sv ? parseFloat(sv) || null : null;
            state.customPackage.dinner = wc.querySelector('[name="pkgDinner"]')?.value?.trim() || '';
            state.customPackage.bonus = wc.querySelector('[name="pkgBonus"]')?.value?.trim() || '';

            const sections = [];
            wc.querySelectorAll('.pkg-section').forEach(secEl => {
                const name = secEl.querySelector('.section-name-input')?.value?.trim() || 'Section';
                const icon = secEl.dataset.icon || 'category';
                const items = [];
                secEl.querySelectorAll('.list-item').forEach(row => {
                    const qty = parseInt(row.querySelector('.item-qty')?.value) || 1;
                    const label = row.querySelector('.item-label')?.value?.trim() || '';
                    if (label) items.push({ qty, label });
                });
                if (name) sections.push({ name, icon, items });
            });
            state.customPackage.sections = sections;

            if (state.customPackage.hasBanners) {
                for (const k of ['A', 'B', 'C']) {
                    state.banners[k] = {
                        qty: parseInt(wc.querySelector(`[name="banner${k}_qty"]`)?.value) || 0,
                        reuse: parseInt(wc.querySelector(`[name="banner${k}_reuse"]`)?.value) || 0,
                        price: parseFloat(wc.querySelector(`[name="banner${k}_price"]`)?.value) ?? BANNER_PRICES[k].price
                    };
                }
            }
            state.specialRequest = wc.querySelector('[name="specialRequest"]')?.value?.trim() || '';
            state.specialRequestAmount = parseFloat(wc.querySelector('[name="specialRequestAmount"]')?.value) || 0;
        }
        else if (state.step === 3) {
            const fields = ['companyName', 'representedBy', 'streetName', 'number', 'floor', 'postalCode', 'city', 'state', 'country', 'legalForm', 'tradeRegister', 'vatNumber', 'billingContact', 'email'];
            state.client = {};
            fields.forEach(f => { state.client[f] = wc.querySelector(`[name="${f}"]`)?.value?.trim() || ''; });
            state.date = wc.querySelector('[name="date"]')?.value || state.date;
            if (state.statut !== undefined) {
                state.statut = wc.querySelector('[name="statut"]')?.value || state.statut;
                state.paiement1Recu = wc.querySelector('[name="paiement1Recu"]')?.checked || false;
                state.paiement2Recu = wc.querySelector('[name="paiement2Reuse"]')?.checked || wc.querySelector('[name="paiement2Recu"]')?.checked || false;
            }
        }
        return true;
    }

    // ═══════════════════════════════════════════
    // STEP 1: PACKAGE SELECTION
    // ═══════════════════════════════════════════

    function renderStepPackage(container, state) {
        container.innerHTML = `
            <div class="space-y-3">
                <p class="text-xs sm:text-sm text-on-surface-variant">Sélectionnez un package comme base. Vous pourrez le personnaliser entièrement à l'étape suivante.</p>
                <div class="flex gap-1.5 flex-wrap" id="category-tabs">
                    ${CATEGORIES.map(cat => `
                        <button data-cat="${cat.id}" class="cat-tab px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px] sm:text-[16px]">${cat.icon}</span>
                            <span class="hidden sm:inline">${cat.label}</span>
                            <span class="sm:hidden">${cat.label.split('/')[0].split(' ')[0]}</span>
                        </button>
                    `).join('')}
                </div>
                <div id="package-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1"></div>
            </div>
        `;
        showCategoryPackages(container, state, state._activeCat || CATEGORIES[0].id);
        container.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => { state._activeCat = btn.dataset.cat; showCategoryPackages(container, state, btn.dataset.cat); }));
    }

    function showCategoryPackages(container, state, catId) {
        container.querySelectorAll('.cat-tab').forEach(t => {
            const a = t.dataset.cat === catId;
            t.classList.toggle('bg-primary', a); t.classList.toggle('text-on-primary', a);
            t.classList.toggle('bg-surface-container', !a); t.classList.toggle('text-on-surface-variant', !a);
        });
        const grid = container.querySelector('#package-grid');
        grid.innerHTML = PACKAGES.filter(p => p.category === catId).map(p => `
            <button data-pkg="${p.id}" class="pkg-card text-left p-3 sm:p-4 rounded-xl border-2 transition-all ${state.packageId === p.id ? 'border-primary bg-primary-container/30 shadow-md' : 'border-surface-container-high hover:border-primary/40 hover:shadow-sm'}">
                <div class="flex justify-between items-start mb-1.5">
                    <span class="font-headline font-bold text-xs sm:text-sm text-on-surface">${esc(p.name)}</span>
                    <span class="font-headline font-bold text-primary text-xs sm:text-sm ml-2">${formatCurrency(p.priceHT)}</span>
                </div>
                <div class="text-[10px] sm:text-xs text-on-surface-variant space-y-0.5">
                    ${p.standM2 ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">square_foot</span> ${p.standM2} m²</div>` : ''}
                    ${p.dinner ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">restaurant</span> ${esc(p.dinner)}</div>` : ''}
                    ${p.talks?.length ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">mic</span> ${p.talks.length} talk${p.talks.length > 1 ? 's' : ''}</div>` : ''}
                </div>
            </button>
        `).join('');
        grid.querySelectorAll('[data-pkg]').forEach(btn => {
            btn.addEventListener('click', () => {
                const prev = state.packageId;
                state.packageId = btn.dataset.pkg;
                if (prev !== btn.dataset.pkg) state.customPackage = deepClonePackage(getPackageById(btn.dataset.pkg));
                grid.querySelectorAll('.pkg-card').forEach(c => { c.classList.remove('border-primary', 'bg-primary-container/30', 'shadow-md'); c.classList.add('border-surface-container-high'); });
                btn.classList.add('border-primary', 'bg-primary-container/30', 'shadow-md'); btn.classList.remove('border-surface-container-high');
            });
        });
    }

    // ═══════════════════════════════════════════
    // STEP 2: FULL PACKAGE EDITOR
    // ═══════════════════════════════════════════

    function renderStepEditor(container, state) {
        const cp = state.customPackage;
        if (!cp) { container.innerHTML = '<p class="text-error">No package selected</p>'; return; }
        if (!cp.sections) cp.sections = packageToSections(cp);

        container.innerHTML = `
            <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div class="sm:col-span-2">
                        <label class="lbl">Nom du Package</label>
                        <input type="text" name="pkgName" value="${esc(cp.name)}" class="inp font-semibold">
                    </div>
                    <div>
                        <label class="lbl">Prix HT (€)</label>
                        <input type="number" name="pkgPrice" value="${cp.priceHT}" min="0" step="0.01" class="inp font-semibold">
                    </div>
                </div>
                ${cp.standM2 != null ? `<div class="w-28"><label class="lbl">Stand (m²)</label><input type="number" name="pkgStand" value="${cp.standM2 || ''}" min="0" step="0.25" class="inp"></div>` : '<input type="hidden" name="pkgStand" value="">'}

                <div id="sections-container" class="space-y-3">
                    ${cp.sections.map((sec, si) => renderSection(sec, si)).join('')}
                </div>

                <button type="button" id="add-section-btn" class="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dim font-semibold py-2">
                    <span class="material-symbols-outlined text-[16px]">add_circle</span> Ajouter une catégorie
                </button>

                <div>
                    <label class="lbl">Dinner</label>
                    <input type="text" name="pkgDinner" value="${esc(cp.dinner || '')}" placeholder="ex: 2 tables of 8 guests each" class="inp">
                </div>
                <div>
                    <label class="lbl">Bonus</label>
                    <textarea name="pkgBonus" rows="2" class="inp resize-none" placeholder="Discount or bonus benefits...">${esc(cp.bonus || '')}</textarea>
                </div>

                ${cp.hasBanners ? renderBannersSection(state) : ''}

                <div class="border-t border-surface-container-high pt-3 mt-3">
                    <label class="lbl">Special Request</label>
                    <textarea name="specialRequest" rows="2" class="inp resize-none" placeholder="Any additional requests or notes...">${esc(state.specialRequest || '')}</textarea>
                    <div class="w-40 mt-2">
                        <label class="lbl">Montant Special (HT €)</label>
                        <input type="number" name="specialRequestAmount" value="${state.specialRequestAmount || 0}" min="0" step="0.01" class="inp">
                    </div>
                </div>
            </div>
        `;

        bindAllSections(container);
        if (cp.hasBanners) bindBannerInputs(container, state);

        document.getElementById('add-section-btn')?.addEventListener('click', () => {
            collectCurrentStep(state);
            state.customPackage.sections.push({ name: 'New Section', icon: DEFAULT_ICONS[state.customPackage.sections.length % DEFAULT_ICONS.length], items: [{ qty: 1, label: '' }] });
            renderStepEditor(container, state);
        });
    }

    function renderSection(sec, idx) {
        return `
            <div class="pkg-section border border-surface-container-high rounded-xl overflow-hidden" data-icon="${sec.icon}" data-idx="${idx}">
                <div class="bg-surface-container px-3 py-2 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] text-on-surface-variant">${sec.icon}</span>
                    <input type="text" class="section-name-input flex-1 bg-transparent text-xs font-bold uppercase tracking-wider text-on-surface-variant outline-none border-b border-transparent focus:border-primary" value="${esc(sec.name)}">
                    <span class="text-[10px] text-on-surface-variant">${sec.items.length}</span>
                    <button type="button" class="remove-section p-0.5 rounded hover:bg-error-container/30 text-error" title="Supprimer cette catégorie">
                        <span class="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                </div>
                <div class="p-2 sm:p-3 space-y-1">
                    ${sec.items.map(item => `
                        <div class="list-item flex items-center gap-2 py-1 border-b border-surface-container last:border-0">
                            <input type="number" class="item-qty w-12 h-8 text-center text-sm font-bold bg-primary-container/40 text-primary rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/30" value="${item.qty}" min="0">
                            <span class="text-xs text-on-surface-variant font-medium">×</span>
                            <input type="text" class="item-label flex-1 h-8 px-2 text-sm bg-transparent border-b border-outline-variant/50 outline-none focus:border-primary text-on-surface" value="${esc(item.prefix ? `${item.prefix} ${item.label}` : item.label)}">
                            <button type="button" class="remove-item p-1 rounded-lg hover:bg-error-container/30 text-on-surface-variant hover:text-error shrink-0">
                                <span class="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    `).join('')}
                    <button type="button" class="add-item flex items-center gap-1 text-[11px] text-primary hover:text-primary-dim font-medium pt-1.5">
                        <span class="material-symbols-outlined text-[14px]">add</span> Ajouter
                    </button>
                </div>
            </div>
        `;
    }

    function bindAllSections(container) {
        container.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', () => btn.closest('.list-item').remove()));
        container.querySelectorAll('.remove-section').forEach(btn => btn.addEventListener('click', () => { if (confirm('Supprimer cette catégorie ?')) btn.closest('.pkg-section').remove(); }));
        container.querySelectorAll('.add-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = document.createElement('div');
                row.className = 'list-item flex items-center gap-2 py-1 border-b border-surface-container last:border-0';
                row.innerHTML = `
                    <input type="number" class="item-qty w-12 h-8 text-center text-sm font-bold bg-primary-container/40 text-primary rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/30" value="1" min="0">
                    <span class="text-xs text-on-surface-variant font-medium">×</span>
                    <input type="text" class="item-label flex-1 h-8 px-2 text-sm bg-transparent border-b border-outline-variant/50 outline-none focus:border-primary text-on-surface" value="" placeholder="Nouvel élément...">
                    <button type="button" class="remove-item p-1 rounded-lg hover:bg-error-container/30 text-on-surface-variant hover:text-error shrink-0"><span class="material-symbols-outlined text-[14px]">close</span></button>
                `;
                btn.parentElement.insertBefore(row, btn);
                row.querySelector('.remove-item').addEventListener('click', () => row.remove());
                row.querySelector('.item-label').focus();
            });
        });
    }

    function renderBannersSection(state) {
        const b = state.banners;
        return `
            <div class="border border-surface-container-high rounded-xl overflow-hidden">
                <div class="bg-surface-container px-3 py-2 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] text-on-surface-variant">flag</span>
                    <span class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Banners</span>
                    <span id="banners-total" class="text-xs font-semibold text-primary ml-auto">${formatCurrency(calcBannersTotal(b))}</span>
                </div>
                <div class="p-2 sm:p-3 space-y-2">
                    <div class="hidden sm:grid grid-cols-[1fr_70px_55px_55px] gap-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                        <span></span><span>€/unité</span><span>Qty</span><span>Reuse</span>
                    </div>
                    ${['A', 'B', 'C'].map(k => {
                        const bp = BANNER_PRICES[k];
                        const bv = b[k] || {};
                        return `
                        <div class="grid grid-cols-2 sm:grid-cols-[1fr_70px_55px_55px] gap-2 items-center">
                            <div class="col-span-2 sm:col-span-1">
                                <span class="font-semibold text-xs">Banner ${k}</span>
                                <span class="text-[10px] text-on-surface-variant ml-1">${bp.dimensions}</span>
                                ${bp.mandatory ? '<span class="text-[10px] text-error ml-1">(oblig.)</span>' : '<span class="text-[10px] text-on-surface-variant ml-1">(opt.)</span>'}
                            </div>
                            <div><label class="sm:hidden text-[9px] text-on-surface-variant">€/unité</label><input type="number" name="banner${k}_price" value="${bv.price ?? bp.price}" min="0" step="0.01" class="banner-input inp !py-1 text-center w-full"></div>
                            <div><label class="sm:hidden text-[9px] text-on-surface-variant">Qty</label><input type="number" name="banner${k}_qty" value="${bv.qty || 0}" min="0" max="20" class="banner-input inp !py-1 text-center w-full"></div>
                            <div><label class="sm:hidden text-[9px] text-on-surface-variant">Reuse</label><input type="number" name="banner${k}_reuse" value="${bv.reuse || 0}" min="0" max="20" class="inp !py-1 text-center w-full"></div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    function bindBannerInputs(container) {
        container.querySelectorAll('.banner-input').forEach(inp => {
            inp.addEventListener('input', () => {
                const newB = {};
                for (const k of ['A', 'B', 'C']) {
                    newB[k] = { qty: parseInt(container.querySelector(`[name="banner${k}_qty"]`)?.value) || 0, price: parseFloat(container.querySelector(`[name="banner${k}_price"]`)?.value) ?? BANNER_PRICES[k].price };
                }
                const total = document.getElementById('banners-total');
                if (total) total.textContent = formatCurrency(calcBannersTotal(newB));
            });
        });
    }

    // ═══════════════════════════════════════════
    // STEP 3: CLIENT (all optional)
    // ═══════════════════════════════════════════

    function renderStepClient(container, state) {
        const c = state.client;
        const isEdit = state.editId !== undefined;
        container.innerHTML = `
            <div class="space-y-2.5">
                <div class="bg-blue-50 rounded-xl p-2.5 flex items-start gap-2">
                    <span class="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
                    <p class="text-xs text-on-surface-variant">Tous les champs sont <strong>optionnels</strong>. Laissez vide ce que le client remplira lui-même.</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="lbl">N° Commande</label><input type="text" value="${esc(state.orderNumber)}" readonly class="inp bg-surface-container-high/30 font-mono"></div>
                    <div><label class="lbl">Date</label><input type="date" name="date" value="${state.date}" class="inp"></div>
                </div>
                ${isEdit ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><label class="lbl">Statut</label><select name="statut" class="inp">${STATUS_FLOW.map(s => `<option value="${s}" ${state.statut === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}</select></div>
                    <div class="flex flex-col justify-end gap-1.5">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="paiement1Recu" ${state.paiement1Recu ? 'checked' : ''} class="w-4 h-4 rounded"><span class="text-xs">50% signature reçu</span></label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="paiement2Recu" ${state.paiement2Recu ? 'checked' : ''} class="w-4 h-4 rounded"><span class="text-xs">50% événement reçu</span></label>
                    </div>
                </div>` : ''}
                <div><label class="lbl">Company Name</label><input type="text" name="companyName" value="${esc(c.companyName || '')}" placeholder="Laisser vide pour que le client remplisse" class="inp"></div>
                <div><label class="lbl">Represented by</label><input type="text" name="representedBy" value="${esc(c.representedBy || '')}" class="inp"></div>
                <div class="grid grid-cols-3 gap-2">
                    <div><label class="lbl">Street</label><input type="text" name="streetName" value="${esc(c.streetName || '')}" class="inp"></div>
                    <div><label class="lbl">Number</label><input type="text" name="number" value="${esc(c.number || '')}" class="inp"></div>
                    <div><label class="lbl">Floor/Unit</label><input type="text" name="floor" value="${esc(c.floor || '')}" class="inp"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="lbl">Postal Code</label><input type="text" name="postalCode" value="${esc(c.postalCode || '')}" class="inp"></div>
                    <div><label class="lbl">City</label><input type="text" name="city" value="${esc(c.city || '')}" class="inp"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="lbl">State</label><input type="text" name="state" value="${esc(c.state || '')}" class="inp"></div>
                    <div><label class="lbl">Country</label><input type="text" name="country" value="${esc(c.country || '')}" class="inp"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="lbl">Legal Form</label><input type="text" name="legalForm" value="${esc(c.legalForm || '')}" class="inp"></div>
                    <div><label class="lbl">Trade Register N°</label><input type="text" name="tradeRegister" value="${esc(c.tradeRegister || '')}" class="inp"></div>
                </div>
                <div><label class="lbl">Intra-Community VAT N°</label><input type="text" name="vatNumber" value="${esc(c.vatNumber || '')}" class="inp"></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="lbl">Billing Contact</label><input type="text" name="billingContact" value="${esc(c.billingContact || '')}" class="inp"></div>
                    <div><label class="lbl">Email</label><input type="email" name="email" value="${esc(c.email || '')}" class="inp"></div>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════
    // STEP 4: SUMMARY
    // ═══════════════════════════════════════════

    function renderStepSummary(container, state, isEdit) {
        const cp = state.customPackage;
        if (!cp) { container.innerHTML = '<p class="text-error">No package data</p>'; return; }
        const fin = computeFinancials(state);
        const hasClient = state.client?.companyName;
        const catLabel = CATEGORIES.find(c => c.id === cp.category)?.label || '';
        const sections = cp.sections || [];

        container.innerHTML = `
            <div class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-surface-container rounded-xl p-3">
                        <p class="lbl mb-1.5">Client</p>
                        ${hasClient ? `<p class="font-semibold text-sm text-on-surface">${esc(state.client.companyName)}</p><p class="text-xs text-on-surface-variant">${esc([state.client.postalCode, state.client.city, state.client.country].filter(Boolean).join(', '))}</p>` : '<p class="text-xs text-on-surface-variant italic">À remplir par le client</p>'}
                    </div>
                    <div class="bg-surface-container rounded-xl p-3">
                        <p class="lbl mb-1.5">Package</p>
                        <p class="font-semibold text-sm text-on-surface">${esc(cp.name)}</p>
                        <p class="text-xs text-on-surface-variant">${esc(catLabel)}</p>
                        <p class="text-sm font-bold text-primary mt-0.5">${formatCurrency(cp.priceHT)} HT</p>
                    </div>
                </div>
                <div class="bg-surface-container rounded-xl p-3 text-xs text-on-surface-variant space-y-1">
                    ${sections.map(s => `<p><strong>${esc(s.name)}:</strong> ${s.items.map(i => formatItem(i)).join(', ')}</p>`).join('')}
                    ${cp.dinner ? `<p><strong>Dinner:</strong> ${esc(cp.dinner)}</p>` : ''}
                </div>
                <div class="bg-surface-container-lowest rounded-xl border border-surface-container-high p-3 sm:p-4">
                    <p class="lbl mb-2">Récapitulatif financier</p>
                    <div class="space-y-1.5 text-sm">
                        <div class="flex justify-between"><span>${esc(cp.name)}</span><span class="font-semibold">${formatCurrency(cp.priceHT)}</span></div>
                        ${fin.bannersTotal > 0 ? `<div class="flex justify-between"><span>Banners</span><span class="font-semibold">${formatCurrency(fin.bannersTotal)}</span></div>` : ''}
                        ${state.specialRequestAmount > 0 ? `<div class="flex justify-between"><span>Special request</span><span class="font-semibold">${formatCurrency(state.specialRequestAmount)}</span></div>` : ''}
                        <div class="border-t border-surface-container pt-1.5 flex justify-between"><span>Total HT</span><span class="font-bold">${formatCurrency(fin.totalHT)}</span></div>
                        <div class="flex justify-between text-on-surface-variant"><span>TVA ${fin.vat}%</span><span>${formatCurrency(fin.totalVAT)}</span></div>
                        <div class="border-t border-surface-container pt-1.5 flex justify-between text-base"><span class="font-bold">Total TTC</span><span class="font-bold text-primary">${formatCurrency(fin.totalTTC)}</span></div>
                    </div>
                </div>
                <div class="bg-blue-50 rounded-xl p-2.5 text-xs text-on-surface-variant">
                    <p>N° <span class="font-mono font-semibold">${esc(state.orderNumber)}</span> — 50% signature (${formatCurrency(fin.half)}) + 50% avant événement</p>
                    <p class="mt-0.5 text-[10px]">Le PDF inclut les Conditions Générales de Vente.</p>
                </div>
            </div>
        `;
    }

    function metricCard(icon, label, value, sub, bgClass, iconColor) {
        return `<div class="bg-surface-container-lowest p-3 sm:p-5 rounded-xl shadow-sm card-hover">
            <div class="flex items-start justify-between">
                <div><p class="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${label}</p><p class="text-lg sm:text-xl font-headline font-bold text-on-surface mt-0.5">${value}</p><p class="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">${sub}</p></div>
                <div class="metric-icon ${bgClass} hidden sm:flex"><span class="material-symbols-outlined ${iconColor} text-[20px]">${icon}</span></div>
            </div>
        </div>`;
    }

    function paginationHTML(current, total, start, count) {
        return `<div class="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-surface-container">
            <p class="text-xs text-on-surface-variant">${start + 1}-${Math.min(start + PAGE_SIZE, count)} de ${count}</p>
            <div class="flex items-center gap-1">
                <button class="page-btn ${current === 1 ? 'opacity-40 pointer-events-none' : ''}" data-page="${current - 1}"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
                ${Array.from({ length: total }, (_, i) => `<button class="page-btn ${current === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
                <button class="page-btn ${current === total ? 'opacity-40 pointer-events-none' : ''}" data-page="${current + 1}"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
        </div>`;
    }

    render();
}
