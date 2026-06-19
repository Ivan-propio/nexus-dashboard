// Devis (Quotes) Page
import { getAll, put, remove } from '../services/db.js';
import { formatCurrency, formatDate, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast, openModal, closeModal } from '../app.js';
import { t } from '../i18n.js';
import { saveDocument, removeDocument, openDocumentViewer } from '../services/documents.js';

const PAGE_SIZE = 10;

const STATUT_BADGE = {
    BROUILLON: 'badge-grey',
    EN_ATTENTE: 'badge-orange',
    VALIDE: 'badge-blue',
    REFUSE: 'badge-red',
};

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

export async function renderDevis() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let currentPage = 1;
    let allDevis = await getAll('devis');

    function render() {
        const totalAmount = allDevis.reduce((s, d) => s + d.montant, 0);
        const enAttente = allDevis.filter(d => d.statut === 'EN_ATTENTE');
        const enAttenteAmount = enAttente.reduce((s, d) => s + d.montant, 0);
        const valides = allDevis.filter(d => d.statut === 'VALIDE').length;
        const tauxValidation = allDevis.length > 0 ? Math.round((valides / allDevis.length) * 100) : 0;

        const totalPages = Math.ceil(allDevis.length / PAGE_SIZE);
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageData = allDevis.slice(start, start + PAGE_SIZE);

        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Metric Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('devis.total')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${formatCurrency(totalAmount)}</p>
                                <p class="text-xs text-on-surface-variant mt-1">${t('devis.count', { n: allDevis.length })}</p>
                            </div>
                            <div class="metric-icon bg-primary-container">
                                <span class="material-symbols-outlined text-on-primary-container text-[22px]">request_quote</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('devis.pending')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${formatCurrency(enAttenteAmount)}</p>
                                <p class="text-xs text-on-surface-variant mt-1">${t('devis.pending_count', { n: enAttente.length })}</p>
                            </div>
                            <div class="metric-icon bg-surface-container-high">
                                <span class="material-symbols-outlined text-on-surface-variant text-[22px]">hourglass_top</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('devis.validation_rate')}</p>
                                <p class="text-2xl font-headline font-bold text-primary mt-1">${tauxValidation}%</p>
                                <p class="text-xs text-on-surface-variant mt-1">${t('devis.validated_count', { n: valides, total: allDevis.length })}</p>
                            </div>
                            <div class="metric-icon bg-primary-container">
                                <span class="material-symbols-outlined text-on-primary-container text-[22px]">verified</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions bar -->
                <div class="flex items-center justify-between">
                    <h3 class="font-headline font-semibold text-on-surface">${t('devis.list_title')}</h3>
                    <button id="add-devis-btn" class="btn-primary flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        ${t('devis.new')}
                    </button>
                </div>

                <!-- Table -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                    <table class="nx-table w-full">
                        <thead>
                            <tr class="text-left">
                                <th>${t('devis.provider')}</th>
                                <th>${t('devis.service')}</th>
                                <th>${t('devis.date')}</th>
                                <th class="text-right">${t('devis.amount')}</th>
                                <th>${t('devis.status')}</th>
                                <th class="text-center">${t('devis.doc')}</th>
                                <th class="text-right">${t('devis.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.map(d => `
                                <tr>
                                    <td class="font-medium text-on-surface">${esc(d.prestataire)}</td>
                                    <td class="text-on-surface-variant">${esc(d.prestation)}</td>
                                    <td class="text-on-surface-variant">${formatDate(d.date)}</td>
                                    <td class="text-right font-semibold text-on-surface">${formatCurrency(d.montant)}</td>
                                    <td>
                                        <span class="badge ${STATUT_BADGE[d.statut] || 'badge-grey'}">
                                            ${t('status.' + d.statut.toLowerCase())}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        ${d.hasDocument
                                            ? `<button data-action="view-doc" data-id="${esc(d.id)}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary transition-colors" title="${t('devis.view_doc')}">
                                                    <span class="material-symbols-outlined text-[18px]">description</span>
                                               </button>`
                                            : `<span class="p-1.5 inline-block text-on-surface-variant/40">
                                                    <span class="material-symbols-outlined text-[18px]">no_photography</span>
                                               </span>`
                                        }
                                    </td>
                                    <td class="text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            ${d.statut === 'EN_ATTENTE' ? `
                                                <button data-action="validate" data-id="${esc(d.id)}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary transition-colors" title="${t('devis.validate')}">
                                                    <span class="material-symbols-outlined text-[18px]">check_circle</span>
                                                </button>
                                                <button data-action="refuse" data-id="${esc(d.id)}" class="p-1.5 rounded-lg hover:bg-error-container/30 text-error transition-colors" title="${t('devis.refuse')}">
                                                    <span class="material-symbols-outlined text-[18px]">cancel</span>
                                                </button>
                                            ` : ''}
                                            <button data-action="edit" data-id="${esc(d.id)}" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="${t('devis.edit')}">
                                                <span class="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button data-action="delete" data-id="${esc(d.id)}" class="p-1.5 rounded-lg hover:bg-error-container/30 text-error transition-colors" title="${t('devis.delete')}">
                                                <span class="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${pageData.length === 0 ? `<tr><td colspan="7" class="text-center py-8 text-on-surface-variant">${t('devis.none')}</td></tr>` : ''}
                        </tbody>
                    </table>

                    <!-- Pagination -->
                    ${totalPages > 1 ? `
                        <div class="flex items-center justify-between px-6 py-4 border-t border-surface-container">
                            <p class="text-xs text-on-surface-variant">${start + 1}-${Math.min(start + PAGE_SIZE, allDevis.length)} ${t('devis.of')} ${allDevis.length}</p>
                            <div class="flex items-center gap-1">
                                <button class="page-btn ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}" data-page="${currentPage - 1}">
                                    <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                ${Array.from({ length: totalPages }, (_, i) => `
                                    <button class="page-btn ${currentPage === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>
                                `).join('')}
                                <button class="page-btn ${currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''}" data-page="${currentPage + 1}">
                                    <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        bindEvents(totalPages);
    }

    function bindEvents(totalPages) {
        const content = document.getElementById('page-content');

        // Pagination
        content.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1 && p <= totalPages) {
                    currentPage = p;
                    render();
                }
            });
        });

        // Row actions
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                const d = allDevis.find(x => x.id === id);
                if (!d) return;

                if (action === 'validate') {
                    d.statut = 'VALIDE';
                    await put('devis', d);
                    allDevis = await getAll('devis');
                    showToast(t('devis.toast_validated'), 'success');
                    render();
                } else if (action === 'refuse') {
                    d.statut = 'REFUSE';
                    await put('devis', d);
                    allDevis = await getAll('devis');
                    showToast(t('devis.toast_refused'), 'info');
                    render();
                } else if (action === 'edit') {
                    showEditModal(d);
                } else if (action === 'delete') {
                    if (!confirm(t('devis.confirm_delete'))) return;
                    await remove('devis', id);
                    await removeDocument(id);
                    allDevis = await getAll('devis');
                    showToast(t('devis.toast_deleted'), 'info');
                    render();
                } else if (action === 'view-doc') {
                    openDocumentViewer(id);
                }
            });
        });

        // Add button
        document.getElementById('add-devis-btn')?.addEventListener('click', showCreateModal);
    }

    // ---------- Create Modal ----------

    function showCreateModal() {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('devis.modal_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="devis-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.provider')}</label>
                        <input type="text" name="prestataire" required class="${INPUT_CLS}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.service')}</label>
                        <input type="text" name="prestation" required class="${INPUT_CLS}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.date')}</label>
                            <input type="date" name="date" required class="${INPUT_CLS}">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.amount_eur')}</label>
                            <input type="number" name="montant" step="0.01" min="0" required class="${INPUT_CLS}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.document')}</label>
                        <input type="file" name="document" class="${INPUT_CLS}">
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('devis.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('devis.create')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('devis-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = 'dev-' + Date.now();
            const file = form.document.files[0];

            const newDevis = {
                id,
                prestataire: form.prestataire.value.trim(),
                prestation: form.prestation.value.trim(),
                date: form.date.value,
                montant: parseFloat(form.montant.value),
                statut: 'BROUILLON',
                reference: 'DEV-' + Date.now().toString().slice(-6),
                hasDocument: !!file,
            };

            await put('devis', newDevis);
            if (file) await saveDocument(id, file);
            allDevis = await getAll('devis');
            closeModal();
            showToast(t('devis.toast_created'), 'success');
            render();
        });
    }

    // ---------- Edit Modal ----------

    function showEditModal(d) {
        const statusOptions = ['BROUILLON', 'EN_ATTENTE', 'VALIDE', 'REFUSE']
            .map(s => `<option value="${s}" ${d.statut === s ? 'selected' : ''}>${t('status.' + s.toLowerCase())}</option>`)
            .join('');

        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('devis.modal_edit_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="devis-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.provider')}</label>
                        <input type="text" name="prestataire" required value="${esc(d.prestataire)}" class="${INPUT_CLS}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.service')}</label>
                        <input type="text" name="prestation" required value="${esc(d.prestation)}" class="${INPUT_CLS}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.date')}</label>
                            <input type="date" name="date" required value="${esc(d.date)}" class="${INPUT_CLS}">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.amount_eur')}</label>
                            <input type="number" name="montant" step="0.01" min="0" required value="${d.montant}" class="${INPUT_CLS}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.status')}</label>
                        <select name="statut" class="${INPUT_CLS}">${statusOptions}</select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('devis.document')}</label>
                        <input type="file" name="document" class="${INPUT_CLS}">
                        ${d.hasDocument ? `<p class="text-xs text-on-surface-variant mt-1">${t('devis.doc_replace_hint')}</p>` : ''}
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('devis.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('devis.save')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('devis-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const file = form.document.files[0];

            const updated = {
                ...d,
                prestataire: form.prestataire.value.trim(),
                prestation: form.prestation.value.trim(),
                date: form.date.value,
                montant: parseFloat(form.montant.value),
                statut: form.statut.value,
                hasDocument: file ? true : d.hasDocument,
            };

            await put('devis', updated);
            if (file) await saveDocument(d.id, file);
            allDevis = await getAll('devis');
            closeModal();
            showToast(t('devis.toast_updated'), 'success');
            render();
        });
    }

    render();
}
