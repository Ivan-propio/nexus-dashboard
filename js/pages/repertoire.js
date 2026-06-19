// Repertoire (Client/Supplier Directory) Page
import { getAll, put, remove } from '../services/db.js';
import { esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast, openModal, closeModal } from '../app.js';
import { t } from '../i18n.js';

const PAGE_SIZE = 10;

export async function renderRepertoire() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let allContacts = await getAll('repertoire');
    let currentPage = 1;
    let activeTab = 'all'; // 'all' | 'client' | 'fournisseur'
    let searchQuery = '';

    function getFiltered() {
        let list = allContacts;
        if (activeTab !== 'all') list = list.filter(c => c.type === activeTab);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                (c.nom || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    function render() {
        const filtered = getFiltered();
        const totalContacts = allContacts.length;
        const clientsCount = allContacts.filter(c => c.type === 'client').length;
        const fournisseursCount = allContacts.filter(c => c.type === 'fournisseur').length;

        const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageData = filtered.slice(start, start + PAGE_SIZE);

        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Metric Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('rep.total_contacts')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${totalContacts}</p>
                            </div>
                            <div class="metric-icon bg-primary-container">
                                <span class="material-symbols-outlined text-on-primary-container text-[22px]">contacts</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('rep.clients')}</p>
                                <p class="text-2xl font-headline font-bold text-blue-600 mt-1">${clientsCount}</p>
                            </div>
                            <div class="metric-icon bg-blue-100">
                                <span class="material-symbols-outlined text-blue-600 text-[22px]">person</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('rep.fournisseurs')}</p>
                                <p class="text-2xl font-headline font-bold text-purple-600 mt-1">${fournisseursCount}</p>
                            </div>
                            <div class="metric-icon bg-purple-100">
                                <span class="material-symbols-outlined text-purple-600 text-[22px]">local_shipping</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters & Actions -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <button class="tab-btn ${activeTab === 'all' ? 'active' : ''}" data-tab="all">${t('rep.tab_all')}</button>
                        <button class="tab-btn ${activeTab === 'client' ? 'active' : ''}" data-tab="client">${t('rep.tab_clients')}</button>
                        <button class="tab-btn ${activeTab === 'fournisseur' ? 'active' : ''}" data-tab="fournisseur">${t('rep.tab_fournisseurs')}</button>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                            <input type="text" id="rep-search" placeholder="${t('rep.search_placeholder')}" value="${esc(searchQuery)}"
                                class="pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none w-56">
                        </div>
                        <button id="add-contact-btn" class="btn-primary flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">person_add</span>
                            ${t('rep.add')}
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                    <table class="nx-table w-full">
                        <thead>
                            <tr class="text-left">
                                <th>${t('rep.name')}</th>
                                <th>${t('rep.type')}</th>
                                <th>${t('rep.tva')}</th>
                                <th>${t('rep.iban')}</th>
                                <th>${t('rep.email')}</th>
                                <th>${t('rep.phone')}</th>
                                <th class="text-right">${t('rep.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.map(c => `
                                <tr>
                                    <td class="font-medium text-on-surface">${esc(c.nom)}</td>
                                    <td>
                                        <span class="badge ${c.type === 'client' ? 'badge-blue' : 'badge-purple'}">${c.type === 'client' ? t('rep.client') : t('rep.fournisseur')}</span>
                                    </td>
                                    <td class="text-on-surface-variant font-mono text-xs">${esc(c.tva || '-')}</td>
                                    <td class="text-on-surface-variant font-mono text-xs">${esc(c.iban || '-')}</td>
                                    <td class="text-on-surface-variant">${esc(c.email || '-')}</td>
                                    <td class="text-on-surface-variant">${esc(c.telephone || '-')}</td>
                                    <td class="text-right">
                                        <button data-edit="${c.id}" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="${t('rep.edit')}">
                                            <span class="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button data-delete="${c.id}" class="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant transition-colors" title="${t('rep.delete')}">
                                            <span class="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${pageData.length === 0 ? `<tr><td colspan="7" class="text-center py-8 text-on-surface-variant">${t('rep.none')}</td></tr>` : ''}
                        </tbody>
                    </table>

                    ${totalPages > 1 ? `
                        <div class="flex items-center justify-between px-6 py-4 border-t border-surface-container">
                            <p class="text-xs text-on-surface-variant">${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)} ${t('rep.of')} ${filtered.length}</p>
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

        // Tab buttons
        content.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeTab = btn.dataset.tab;
                currentPage = 1;
                render();
            });
        });

        // Search
        document.getElementById('rep-search')?.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            currentPage = 1;
            render();
        });

        // Pagination
        content.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1 && p <= totalPages) { currentPage = p; render(); }
            });
        });

        // Add contact
        document.getElementById('add-contact-btn')?.addEventListener('click', showAddModal);

        // Edit buttons
        content.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = allContacts.find(x => x.id === btn.dataset.edit);
                if (c) showEditModal(c);
            });
        });

        // Delete buttons
        content.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = allContacts.find(x => x.id === btn.dataset.delete);
                if (c) showDeleteConfirm(c);
            });
        });
    }

    function contactFormHTML(contact = null) {
        const isEdit = !!contact;
        const v = (field) => isEdit ? esc(contact[field] || '') : '';
        const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

        return `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_nom')}</label>
                        <input type="text" name="nom" value="${v('nom')}" required class="${inputClass}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_type')}</label>
                        <select name="type" class="${inputClass}">
                            <option value="client" ${isEdit && contact.type === 'client' ? 'selected' : ''}>${t('rep.client')}</option>
                            <option value="fournisseur" ${isEdit && contact.type === 'fournisseur' ? 'selected' : ''}>${t('rep.fournisseur')}</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_tva')}</label>
                        <input type="text" name="tva" value="${v('tva')}" placeholder="LU12345678" class="${inputClass}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_siren')}</label>
                        <input type="text" name="siren" value="${v('siren')}" class="${inputClass}">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_adresse')}</label>
                    <input type="text" name="adresse" value="${v('adresse')}" class="${inputClass}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_email')}</label>
                        <input type="email" name="email" value="${v('email')}" class="${inputClass}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_telephone')}</label>
                        <input type="tel" name="telephone" value="${v('telephone')}" class="${inputClass}">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_iban')}</label>
                        <input type="text" name="iban" value="${v('iban')}" class="${inputClass}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_bic')}</label>
                        <input type="text" name="bic" value="${v('bic')}" class="${inputClass}">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('rep.field_notes')}</label>
                    <textarea name="notes" rows="3" class="${inputClass}">${v('notes')}</textarea>
                </div>
            </div>
        `;
    }

    function showAddModal() {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('rep.modal_add_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="add-contact-form">
                    ${contactFormHTML()}
                    <div class="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-container">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('rep.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('rep.add_btn')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('add-contact-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const newContact = {
                id: 'rep-' + Date.now(),
                nom: form.nom.value.trim(),
                type: form.type.value,
                tva: form.tva.value.trim(),
                siren: form.siren.value.trim(),
                adresse: form.adresse.value.trim(),
                email: form.email.value.trim(),
                telephone: form.telephone.value.trim(),
                iban: form.iban.value.trim(),
                bic: form.bic.value.trim(),
                notes: form.notes.value.trim(),
                createdAt: new Date().toISOString()
            };
            await put('repertoire', newContact);
            allContacts = await getAll('repertoire');
            closeModal();
            showToast(t('rep.toast_added'), 'success');
            render();
        });
    }

    function showEditModal(contact) {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('rep.modal_edit_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="edit-contact-form">
                    ${contactFormHTML(contact)}
                    <div class="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-container">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('rep.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('rep.save')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('edit-contact-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            contact.nom = form.nom.value.trim();
            contact.type = form.type.value;
            contact.tva = form.tva.value.trim();
            contact.siren = form.siren.value.trim();
            contact.adresse = form.adresse.value.trim();
            contact.email = form.email.value.trim();
            contact.telephone = form.telephone.value.trim();
            contact.iban = form.iban.value.trim();
            contact.bic = form.bic.value.trim();
            contact.notes = form.notes.value.trim();
            await put('repertoire', contact);
            allContacts = await getAll('repertoire');
            closeModal();
            showToast(t('rep.toast_updated'), 'success');
            render();
        });
    }

    function showDeleteConfirm(contact) {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('rep.modal_delete_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <p class="text-sm text-on-surface-variant mb-6">${t('rep.delete_confirm', { name: esc(contact.nom) })}</p>
                <div class="flex justify-end gap-3">
                    <button id="modal-cancel" class="btn-secondary">${t('rep.cancel')}</button>
                    <button id="confirm-delete" class="btn-danger">${t('rep.delete_btn')}</button>
                </div>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('confirm-delete')?.addEventListener('click', async () => {
            await remove('repertoire', contact.id);
            allContacts = await getAll('repertoire');
            closeModal();
            showToast(t('rep.toast_deleted'), 'success');
            render();
        });
    }

    render();
}
