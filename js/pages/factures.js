// Factures (Invoices) Page with OCR + Full CRUD
import { getAll, put, remove } from '../services/db.js';
import { formatCurrency, formatDate, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast, openModal, closeModal } from '../app.js';
import { extractFromFile, renderPDFPage } from '../services/ocr.js';
import { t } from '../i18n.js';
import { saveDocument, removeDocument, openDocumentViewer } from '../services/documents.js';

const PAGE_SIZE = 10;
const STATUSES = ['EN_ATTENTE', 'VALIDEE', 'REJETEE', 'PAYEE'];
const STATUS_BADGE = { EN_ATTENTE: 'badge-grey', VALIDEE: 'badge-green', REJETEE: 'badge-red', PAYEE: 'badge-blue' };

let currentPage = 0;
let uploadedFile = null;

function statusBadge(statut) {
    const cls = STATUS_BADGE[statut] || 'badge-grey';
    return `<span class="badge ${cls}">${t('status.' + statut.toLowerCase())}</span>`;
}

function fieldLabel(key) {
    return `<label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.' + key)}</label>`;
}

function inputField(name, value, type = 'text') {
    return `<input type="${type}" name="${name}" value="${esc(String(value ?? ''))}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">`;
}

export async function renderFactures() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let allFactures = await getAll('factures');
    currentPage = 0;
    uploadedFile = null;

    // ── List View ──────────────────────────────────────────────
    function renderList() {
        const content = document.getElementById('page-content');
        const totalPages = Math.max(1, Math.ceil(allFactures.length / PAGE_SIZE));
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        const start = currentPage * PAGE_SIZE;
        const pageItems = allFactures.slice(start, start + PAGE_SIZE);

        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline font-semibold text-on-surface">${t('fac.all_invoices')}</h3>
                    <button id="upload-facture-btn" class="btn-primary flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">upload_file</span>
                        ${t('fac.import')}
                    </button>
                </div>

                <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                    <table class="nx-table w-full">
                        <thead>
                            <tr class="text-left">
                                <th>${t('fac.provider')}</th>
                                <th>${t('fac.number')}</th>
                                <th>${t('fac.date')}</th>
                                <th class="text-right">${t('fac.amount_ttc')}</th>
                                <th>${t('fac.status')}</th>
                                <th>${t('fac.doc')}</th>
                                <th class="text-right">${t('fac.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageItems.length === 0 ? `<tr><td colspan="7" class="text-center py-8 text-on-surface-variant">${t('fac.none')}</td></tr>` : pageItems.map(f => `
                                <tr>
                                    <td class="font-medium text-on-surface">${esc(f.fournisseur)}</td>
                                    <td class="text-on-surface-variant font-mono text-xs">${esc(f.numero)}</td>
                                    <td class="text-on-surface-variant">${formatDate(f.date)}</td>
                                    <td class="text-right font-semibold text-on-surface">${formatCurrency(f.montantTTC)}</td>
                                    <td>${statusBadge(f.statut)}</td>
                                    <td>
                                        ${f.hasDocument ? `<button data-doc="${esc(f.id)}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary transition-colors" title="${t('fac.view_doc')}"><span class="material-symbols-outlined text-[18px]">description</span></button>` : `<span class="text-on-surface-variant text-xs">-</span>`}
                                    </td>
                                    <td class="text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <button data-view="${esc(f.id)}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary transition-colors" title="${t('fac.view_details')}">
                                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>
                                            <button data-edit="${esc(f.id)}" class="p-1.5 rounded-lg hover:bg-primary-container text-primary transition-colors" title="${t('fac.edit')}">
                                                <span class="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button data-delete="${esc(f.id)}" class="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors" title="${t('fac.delete')}">
                                                <span class="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${totalPages > 1 ? `
                <div class="flex items-center justify-between">
                    <p class="text-xs text-on-surface-variant">${t('fac.showing')} ${start + 1}-${Math.min(start + PAGE_SIZE, allFactures.length)} / ${allFactures.length}</p>
                    <div class="flex items-center gap-2">
                        <button id="page-prev" class="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors ${currentPage === 0 ? 'opacity-40 pointer-events-none' : ''}">
                            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <span class="text-xs font-medium text-on-surface">${currentPage + 1} / ${totalPages}</span>
                        <button id="page-next" class="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors ${currentPage >= totalPages - 1 ? 'opacity-40 pointer-events-none' : ''}">
                            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Bind events
        document.getElementById('upload-facture-btn')?.addEventListener('click', showUploadView);
        document.getElementById('page-prev')?.addEventListener('click', () => { currentPage--; renderList(); });
        document.getElementById('page-next')?.addEventListener('click', () => { currentPage++; renderList(); });

        content.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = allFactures.find(x => x.id === btn.dataset.view);
                if (f) renderDetail(f);
            });
        });
        content.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = allFactures.find(x => x.id === btn.dataset.edit);
                if (f) openEditModal(f);
            });
        });
        content.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = allFactures.find(x => x.id === btn.dataset.delete);
                if (f) openDeleteConfirm(f);
            });
        });
        content.querySelectorAll('[data-doc]').forEach(btn => {
            btn.addEventListener('click', () => openDocumentViewer(btn.dataset.doc));
        });
    }

    // ── Detail View ────────────────────────────────────────────
    function renderDetail(facture) {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                <div class="flex items-center gap-3">
                    <button id="back-to-list" class="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h3 class="font-headline font-semibold text-on-surface">${t('fac.detail_title')}</h3>
                    ${statusBadge(facture.statut)}
                </div>

                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.provider')}</p>
                            <p class="text-sm font-semibold text-on-surface">${esc(facture.fournisseur)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.number')}</p>
                            <p class="text-sm font-mono text-on-surface">${esc(facture.numero)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.date')}</p>
                            <p class="text-sm text-on-surface">${formatDate(facture.date)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.amount_ht')}</p>
                            <p class="text-sm font-semibold text-on-surface">${formatCurrency(facture.montantHT)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.vat_rate')}</p>
                            <p class="text-sm text-on-surface">${esc(String(facture.tauxTVA ?? '-'))}%</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.amount_ttc')}</p>
                            <p class="text-lg font-headline font-bold text-primary">${formatCurrency(facture.montantTTC)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.vat_number')}</p>
                            <p class="text-sm font-mono text-on-surface">${esc(facture.tva || '-')}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.siren')}</p>
                            <p class="text-sm font-mono text-on-surface">${esc(facture.siren || '-')}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.iban')}</p>
                            <p class="text-sm font-mono text-on-surface">${esc(facture.iban || '-')}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.bic')}</p>
                            <p class="text-sm font-mono text-on-surface">${esc(facture.bic || '-')}</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.address')}</p>
                            <p class="text-sm text-on-surface">${esc(facture.adresse || '-')}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">${t('fac.ocr_score')}</p>
                            <span class="badge ${facture.ocrScore >= 80 ? 'badge-green' : facture.ocrScore >= 50 ? 'badge-orange' : 'badge-red'}">${facture.ocrScore ?? 0}%</span>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-surface-container">
                        ${facture.hasDocument ? `
                        <button id="detail-view-doc" class="btn-outline flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">description</span>
                            ${t('fac.view_doc')}
                        </button>
                        ` : ''}
                        <button id="detail-edit" class="btn-primary flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                            ${t('fac.edit')}
                        </button>
                        <button id="detail-delete" class="btn-danger flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                            ${t('fac.delete')}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('back-to-list')?.addEventListener('click', () => renderList());
        document.getElementById('detail-edit')?.addEventListener('click', () => openEditModal(facture));
        document.getElementById('detail-delete')?.addEventListener('click', () => openDeleteConfirm(facture));
        document.getElementById('detail-view-doc')?.addEventListener('click', () => openDocumentViewer(facture.id));
    }

    // ── Edit Modal ─────────────────────────────────────────────
    function openEditModal(facture) {
        const statusOptions = STATUSES.map(s =>
            `<option value="${s}" ${facture.statut === s ? 'selected' : ''}>${t('status.' + s.toLowerCase())}</option>`
        ).join('');

        openModal(`
            <div class="p-6 max-w-lg w-full">
                <h3 class="font-headline font-semibold text-on-surface text-lg mb-6">${t('fac.edit_title')}</h3>
                <form id="edit-facture-form" class="space-y-4">
                    <div>
                        ${fieldLabel('provider')}
                        ${inputField('fournisseur', facture.fournisseur)}
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            ${fieldLabel('invoice_number')}
                            ${inputField('numero', facture.numero)}
                        </div>
                        <div>
                            ${fieldLabel('date')}
                            ${inputField('date', facture.date)}
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            ${fieldLabel('amount_ht')}
                            ${inputField('montantHT', facture.montantHT)}
                        </div>
                        <div>
                            ${fieldLabel('vat_rate')}
                            ${inputField('tauxTVA', facture.tauxTVA)}
                        </div>
                        <div>
                            ${fieldLabel('amount_ttc')}
                            ${inputField('montantTTC', facture.montantTTC)}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            ${fieldLabel('vat_number')}
                            ${inputField('tva', facture.tva)}
                        </div>
                        <div>
                            ${fieldLabel('siren')}
                            ${inputField('siren', facture.siren)}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            ${fieldLabel('iban')}
                            ${inputField('iban', facture.iban)}
                        </div>
                        <div>
                            ${fieldLabel('bic')}
                            ${inputField('bic', facture.bic)}
                        </div>
                    </div>
                    <div>
                        ${fieldLabel('address')}
                        <textarea name="adresse" rows="2" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">${esc(facture.adresse || '')}</textarea>
                    </div>
                    <div>
                        ${fieldLabel('status')}
                        <select name="statut" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-surface-container">
                        <button type="button" id="edit-cancel" class="btn-outline">${t('common.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('common.save')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('edit-cancel')?.addEventListener('click', () => closeModal());
        document.getElementById('edit-facture-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const updated = {
                ...facture,
                fournisseur: form.fournisseur.value || facture.fournisseur,
                numero: form.numero.value || facture.numero,
                date: form.date.value || facture.date,
                montantHT: parseFloat(form.montantHT.value) || 0,
                montantTTC: parseFloat(form.montantTTC.value) || 0,
                tauxTVA: parseFloat(form.tauxTVA.value) || 0,
                statut: form.statut.value,
                tva: form.tva.value,
                siren: form.siren.value,
                iban: form.iban.value,
                bic: form.bic.value,
                adresse: form.adresse.value
            };
            await put('factures', updated);
            allFactures = await getAll('factures');
            closeModal();
            showToast(t('fac.toast_updated'), 'success');
            renderList();
        });
    }

    // ── Delete Confirm ─────────────────────────────────────────
    function openDeleteConfirm(facture) {
        openModal(`
            <div class="p-6 max-w-sm w-full text-center">
                <span class="material-symbols-outlined text-[48px] text-error mb-3">warning</span>
                <h3 class="font-headline font-semibold text-on-surface text-lg mb-2">${t('fac.delete_title')}</h3>
                <p class="text-sm text-on-surface-variant mb-6">${t('fac.delete_confirm')} <strong>${esc(facture.fournisseur)}</strong> - ${esc(facture.numero)}?</p>
                <div class="flex justify-center gap-3">
                    <button id="del-cancel" class="btn-outline">${t('common.cancel')}</button>
                    <button id="del-confirm" class="btn-danger">${t('common.delete')}</button>
                </div>
            </div>
        `);

        document.getElementById('del-cancel')?.addEventListener('click', () => closeModal());
        document.getElementById('del-confirm')?.addEventListener('click', async () => {
            if (facture.hasDocument) {
                await removeDocument(facture.id);
            }
            await remove('factures', facture.id);
            allFactures = await getAll('factures');
            closeModal();
            showToast(t('fac.toast_deleted'), 'success');
            renderList();
        });
    }

    // ── Upload / OCR View ──────────────────────────────────────
    function showUploadView() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <div class="flex items-center gap-3">
                    <button id="back-to-list" class="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h3 class="font-headline font-semibold text-on-surface">${t('fac.import_title')}</h3>
                </div>

                <div id="upload-area" class="drop-zone py-16">
                    <span class="material-symbols-outlined text-[48px] text-outline-variant mb-3">cloud_upload</span>
                    <p class="text-sm font-medium text-on-surface mb-1">${t('fac.drop_text')}</p>
                    <p class="text-xs text-on-surface-variant">${t('fac.drop_formats')}</p>
                    <input type="file" id="facture-file-input" class="hidden" accept=".pdf,.png,.jpg,.jpeg">
                </div>

                <div id="ocr-processing" class="hidden">
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-8 text-center">
                        <div class="spinner mx-auto mb-4" style="width:40px;height:40px;border-width:4px;"></div>
                        <p class="text-sm font-medium text-on-surface">${t('fac.ocr_processing')}</p>
                        <p class="text-xs text-on-surface-variant mt-1" id="ocr-status">${t('fac.ocr_extracting')}</p>
                    </div>
                </div>

                <div id="ocr-result" class="hidden"></div>
            </div>
        `;

        document.getElementById('back-to-list')?.addEventListener('click', () => renderList());

        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('facture-file-input');

        uploadArea?.addEventListener('click', () => fileInput?.click());
        uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
        });
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) processFile(e.target.files[0]);
        });
    }

    async function processFile(file) {
        uploadedFile = file;
        document.getElementById('upload-area')?.classList.add('hidden');
        document.getElementById('ocr-processing')?.classList.remove('hidden');

        try {
            const statusEl = document.getElementById('ocr-status');
            statusEl.textContent = t('fac.ocr_extracting');

            const result = await extractFromFile(file);

            statusEl.textContent = t('fac.ocr_done');
            document.getElementById('ocr-processing')?.classList.add('hidden');

            renderOCRResult(result, file);
        } catch (err) {
            document.getElementById('ocr-processing')?.classList.add('hidden');
            document.getElementById('upload-area')?.classList.remove('hidden');
            showToast(t('fac.ocr_error') + err.message, 'error');
        }
    }

    function renderOCRResult(result, file) {
        const ocrDiv = document.getElementById('ocr-result');
        ocrDiv.classList.remove('hidden');

        const scoreColor = result.confidence >= 70 ? 'badge-green' : result.confidence >= 40 ? 'badge-orange' : 'badge-red';

        ocrDiv.innerHTML = `
            <div class="split-view">
                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="font-headline font-semibold text-sm text-on-surface">${t('fac.doc_preview')}</h4>
                        <span class="text-xs text-on-surface-variant">${esc(file.name)}</span>
                    </div>
                    <div class="bg-surface-container rounded-lg overflow-auto" style="max-height: calc(100vh - 320px)">
                        ${file.type === 'application/pdf' ? `
                            <canvas id="pdf-preview-canvas" class="w-full"></canvas>
                        ` : `
                            <img id="img-preview" class="w-full" alt="Document">
                        `}
                    </div>
                </div>

                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6 overflow-y-auto">
                    <div class="flex items-center justify-between mb-6">
                        <h4 class="font-headline font-semibold text-on-surface">${t('fac.ocr_validation')}</h4>
                        <span class="badge ${scoreColor}">${t('fac.score')}: ${result.confidence}%</span>
                    </div>
                    <p class="text-xs text-on-surface-variant mb-4">${t('fac.method')}: ${esc(result.method || 'N/A')}</p>

                    <form id="ocr-validation-form" class="space-y-4">
                        <div>
                            ${fieldLabel('provider')}
                            ${inputField('fournisseur', result.fournisseur)}
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                ${fieldLabel('vat_number')}
                                ${inputField('tva', result.tva)}
                            </div>
                            <div>
                                ${fieldLabel('siren')}
                                ${inputField('siren', result.siren)}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                ${fieldLabel('invoice_number')}
                                ${inputField('numero', result.numero)}
                            </div>
                            <div>
                                ${fieldLabel('date')}
                                ${inputField('date', result.date)}
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                ${fieldLabel('amount_ht')}
                                ${inputField('montantHT', result.montantHT)}
                            </div>
                            <div>
                                ${fieldLabel('vat_rate')}
                                ${inputField('tauxTVA', result.tauxTVA)}
                            </div>
                            <div>
                                ${fieldLabel('amount_ttc')}
                                ${inputField('montantTTC', result.montantTTC)}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                ${fieldLabel('iban')}
                                ${inputField('iban', result.iban)}
                            </div>
                            <div>
                                ${fieldLabel('bic')}
                                ${inputField('bic', result.bic)}
                            </div>
                        </div>
                        <div>
                            ${fieldLabel('address')}
                            <textarea name="adresse" rows="2" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">${esc(result.adresse || '')}</textarea>
                        </div>

                        <details class="mt-4">
                            <summary class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider cursor-pointer">${t('fac.raw_text')}</summary>
                            <pre class="mt-2 p-3 bg-surface-container rounded-lg text-xs text-on-surface-variant max-h-40 overflow-auto whitespace-pre-wrap">${esc((result.rawText || '').substring(0, 2000))}</pre>
                        </details>

                        <div class="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button type="button" id="reject-ocr" class="btn-danger flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">close</span>
                                ${t('fac.reject')}
                            </button>
                            <button type="submit" class="btn-primary flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">check</span>
                                ${t('fac.approve_save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Render preview
        if (file.type === 'application/pdf') {
            const canvas = document.getElementById('pdf-preview-canvas');
            if (canvas) renderPDFPage(file, canvas);
        } else {
            const img = document.getElementById('img-preview');
            if (img) img.src = URL.createObjectURL(file);
        }

        // Approve + save
        document.getElementById('ocr-validation-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = 'fac-' + Date.now();
            const newFacture = {
                id,
                fournisseur: form.fournisseur.value || 'Inconnu',
                numero: form.numero.value || 'N/A',
                date: form.date.value || new Date().toISOString().split('T')[0],
                montantHT: parseFloat(form.montantHT.value) || 0,
                montantTTC: parseFloat(form.montantTTC.value) || 0,
                tauxTVA: parseFloat(form.tauxTVA.value) || 20,
                statut: 'VALIDEE',
                tva: form.tva.value || '',
                siren: form.siren.value || '',
                iban: form.iban.value || '',
                bic: form.bic.value || '',
                adresse: form.adresse.value || '',
                ocrScore: result.confidence || 0,
                hasDocument: true
            };
            await put('factures', newFacture);
            await saveDocument(id, uploadedFile);
            allFactures = await getAll('factures');
            showToast(t('fac.toast_saved'), 'success');
            renderList();
        });

        // Reject
        document.getElementById('reject-ocr')?.addEventListener('click', () => {
            showToast(t('fac.toast_rejected'), 'info');
            renderList();
        });
    }

    // Initial render
    renderList();
}
