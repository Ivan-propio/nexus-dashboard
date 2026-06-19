// Equipes (Team Management) Page
import { getAll, put, remove } from '../services/db.js';
import { formatDateTime, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast, openModal, closeModal } from '../app.js';
import { t } from '../i18n.js';

const PAGE_SIZE = 10;

function makeInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function avatarClasses(role) {
    if (role === 'ADMIN') return { bg: 'bg-primary-container', text: 'text-on-primary-container' };
    if (role === 'MANAGER') return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
    return { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' };
}

function roleBadge(role) {
    if (role === 'ADMIN') return 'badge-blue';
    if (role === 'MANAGER') return 'badge-purple';
    return 'badge-grey';
}

function statusDot(statut) {
    if (statut === 'active') return 'active';
    if (statut === 'pending') return 'pending';
    return 'inactive';
}

function statusLabel(statut) {
    if (statut === 'active') return t('team.active_label');
    if (statut === 'pending') return t('team.pending_label');
    return t('team.inactive_label');
}

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

export async function renderEquipes() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let team = await getAll('team');
    let currentPage = 1;

    function render() {
        const totalMembers = team.length;
        const admins = team.filter(m => m.role === 'ADMIN').length;
        const active = team.filter(m => m.statut === 'active').length;
        const pending = team.filter(m => m.statut === 'pending').length;

        const totalPages = Math.max(1, Math.ceil(team.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageData = team.slice(start, start + PAGE_SIZE);

        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Metric Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('team.total_members')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${totalMembers}</p>
                            </div>
                            <div class="metric-icon bg-primary-container">
                                <span class="material-symbols-outlined text-on-primary-container text-[22px]">group</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('team.admins')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${admins}</p>
                            </div>
                            <div class="metric-icon bg-secondary-container">
                                <span class="material-symbols-outlined text-on-secondary-container text-[22px]">admin_panel_settings</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('team.active')}</p>
                                <p class="text-2xl font-headline font-bold text-green-600 mt-1">${active}</p>
                            </div>
                            <div class="metric-icon bg-green-100">
                                <span class="material-symbols-outlined text-green-600 text-[22px]">check_circle</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm card-hover">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('team.pending')}</p>
                                <p class="text-2xl font-headline font-bold text-amber-600 mt-1">${pending}</p>
                            </div>
                            <div class="metric-icon bg-amber-100">
                                <span class="material-symbols-outlined text-amber-600 text-[22px]">pending</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Header + Add Button -->
                <div class="flex items-center justify-between">
                    <h3 class="font-headline font-semibold text-on-surface">${t('team.list_title')}</h3>
                    <button id="add-member-btn" class="btn-primary flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">person_add</span>
                        ${t('team.add')}
                    </button>
                </div>

                <!-- Table -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                    <table class="nx-table w-full">
                        <thead>
                            <tr class="text-left">
                                <th>${t('team.member')}</th>
                                <th>${t('team.email')}</th>
                                <th>${t('team.username')}</th>
                                <th>${t('team.role')}</th>
                                <th>${t('team.status')}</th>
                                <th>${t('team.last_activity')}</th>
                                <th class="text-right">${t('team.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.length === 0 ? `
                                <tr><td colspan="7" class="text-center py-8 text-on-surface-variant">${t('team.no_members')}</td></tr>
                            ` : pageData.map(m => {
                                const av = avatarClasses(m.role);
                                return `
                                <tr>
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-full ${av.bg} flex items-center justify-center">
                                                <span class="text-xs font-bold ${av.text}">${esc(m.initials)}</span>
                                            </div>
                                            <span class="font-medium text-on-surface">${esc(m.nom)}</span>
                                        </div>
                                    </td>
                                    <td class="text-on-surface-variant">${esc(m.email)}</td>
                                    <td class="text-on-surface-variant font-mono text-xs">${esc(m.username || '')}</td>
                                    <td>
                                        <span class="badge ${roleBadge(m.role)}">${esc(m.role)}</span>
                                    </td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <span class="status-dot ${statusDot(m.statut)}"></span>
                                            <span class="text-sm text-on-surface-variant capitalize">${statusLabel(m.statut)}</span>
                                        </div>
                                    </td>
                                    <td class="text-on-surface-variant text-xs">${formatDateTime(m.derniereActivite)}</td>
                                    <td class="text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <button data-edit="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="${t('team.edit')}">
                                                <span class="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button data-delete="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors" title="${t('team.delete')}">
                                                <span class="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>

                    ${totalPages > 1 ? `
                        <div class="flex items-center justify-between px-6 py-4 border-t border-surface-container">
                            <p class="text-xs text-on-surface-variant">${start + 1}-${Math.min(start + PAGE_SIZE, team.length)} ${t('team.of')} ${team.length}</p>
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

        // -- Event Listeners --

        // Pagination
        content.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1 && p <= totalPages) { currentPage = p; render(); }
            });
        });

        // Add member
        document.getElementById('add-member-btn')?.addEventListener('click', showAddModal);

        // Edit buttons
        content.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const m = team.find(x => x.id === btn.dataset.edit);
                if (m) showEditModal(m);
            });
        });

        // Delete buttons
        content.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const m = team.find(x => x.id === btn.dataset.delete);
                if (m) showDeleteConfirm(m);
            });
        });
    }

    // ── Add Member Modal ──────────────────────────────────────────────
    function showAddModal() {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('team.modal_add_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="add-member-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.full_name')}</label>
                        <input type="text" name="nom" required class="${INPUT_CLS}" placeholder="${t('team.placeholder_name')}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.email')}</label>
                        <input type="email" name="email" required class="${INPUT_CLS}" placeholder="${t('team.placeholder_email')}">
                    </div>

                    <div class="p-4 rounded-lg bg-surface-container border border-outline-variant">
                        <p class="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[16px]">login</span>
                            ${t('team.login_credentials')}
                        </p>
                        <p class="text-[11px] text-on-surface-variant mb-3">${t('team.credentials_hint')}</p>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.username')}</label>
                                <input type="text" name="username" required class="${INPUT_CLS}" placeholder="${t('team.placeholder_username')}" autocomplete="off">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.password')}</label>
                                <input type="text" name="password" required class="${INPUT_CLS}" placeholder="${t('team.placeholder_password')}" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.role')}</label>
                        <select name="role" class="${INPUT_CLS}">
                            <option value="VIEWER">Viewer</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('team.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('team.add_btn')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const f = e.target;
            const nom = f.nom.value.trim();
            const email = f.email.value.trim();
            const username = f.username.value.trim();
            const password = f.password.value.trim();
            const role = f.role.value;

            if (!username || !password) {
                showToast(t('team.toast_credentials_required'), 'error');
                return;
            }

            // Check for duplicate username
            const existing = team.find(m => m.username && m.username.toLowerCase() === username.toLowerCase());
            if (existing) {
                showToast(t('team.toast_username_taken'), 'error');
                return;
            }

            const newMember = {
                id: 'usr-' + Date.now(),
                nom,
                email,
                username,
                password,
                role,
                statut: 'active',
                initials: makeInitials(nom),
                derniereActivite: new Date().toISOString()
            };

            await put('team', newMember);
            team = await getAll('team');
            closeModal();
            showToast(t('team.toast_added'), 'success');
            render();
        });
    }

    // ── Edit Member Modal ─────────────────────────────────────────────
    function showEditModal(member) {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('team.modal_edit_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form id="edit-member-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.full_name')}</label>
                        <input type="text" name="nom" value="${esc(member.nom)}" required class="${INPUT_CLS}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.email')}</label>
                        <input type="email" name="email" value="${esc(member.email)}" required class="${INPUT_CLS}">
                    </div>

                    <div class="p-4 rounded-lg bg-surface-container border border-outline-variant">
                        <p class="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[16px]">login</span>
                            ${t('team.login_credentials')}
                        </p>
                        <p class="text-[11px] text-on-surface-variant mb-3">${t('team.credentials_hint')}</p>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.username')}</label>
                                <input type="text" name="username" value="${esc(member.username || '')}" required class="${INPUT_CLS}" autocomplete="off">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.password')}</label>
                                <input type="text" name="password" value="${esc(member.password || '')}" required class="${INPUT_CLS}" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.role')}</label>
                            <select name="role" class="${INPUT_CLS}">
                                <option value="VIEWER" ${member.role === 'VIEWER' ? 'selected' : ''}>Viewer</option>
                                <option value="MANAGER" ${member.role === 'MANAGER' ? 'selected' : ''}>Manager</option>
                                <option value="ADMIN" ${member.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('team.status')}</label>
                            <select name="statut" class="${INPUT_CLS}">
                                <option value="active" ${member.statut === 'active' ? 'selected' : ''}>${t('team.active_label')}</option>
                                <option value="pending" ${member.statut === 'pending' ? 'selected' : ''}>${t('team.pending_label')}</option>
                                <option value="inactive" ${member.statut === 'inactive' ? 'selected' : ''}>${t('team.inactive_label')}</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" id="modal-cancel" class="btn-secondary">${t('team.cancel')}</button>
                        <button type="submit" class="btn-primary">${t('team.save')}</button>
                    </div>
                </form>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('edit-member-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const f = e.target;
            const nom = f.nom.value.trim();
            const email = f.email.value.trim();
            const username = f.username.value.trim();
            const password = f.password.value.trim();
            const role = f.role.value;
            const statut = f.statut.value;

            if (!username || !password) {
                showToast(t('team.toast_credentials_required'), 'error');
                return;
            }

            // Check duplicate username (excluding current member)
            const existing = team.find(m => m.id !== member.id && m.username && m.username.toLowerCase() === username.toLowerCase());
            if (existing) {
                showToast(t('team.toast_username_taken'), 'error');
                return;
            }

            const updated = {
                ...member,
                nom,
                email,
                username,
                password,
                role,
                statut,
                initials: makeInitials(nom)
            };

            await put('team', updated);
            team = await getAll('team');
            closeModal();
            showToast(t('team.toast_updated'), 'success');
            render();
        });
    }

    // ── Delete Confirmation Modal ─────────────────────────────────────
    function showDeleteConfirm(member) {
        openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-headline font-bold text-lg text-on-surface">${t('team.modal_delete_title')}</h3>
                    <button id="modal-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="flex items-center gap-3 p-4 rounded-lg bg-error-container/30 mb-4">
                    <span class="material-symbols-outlined text-error text-[22px]">warning</span>
                    <p class="text-sm text-on-surface">${t('team.delete_confirm')} <strong>${esc(member.nom)}</strong>?</p>
                </div>
                <p class="text-xs text-on-surface-variant mb-6">${t('team.delete_warning')}</p>
                <div class="flex justify-end gap-3">
                    <button id="modal-cancel" class="btn-secondary">${t('team.cancel')}</button>
                    <button id="confirm-delete" class="px-4 py-2.5 rounded-lg bg-error text-on-error text-sm font-semibold hover:bg-error/90 transition-colors">${t('team.delete_btn')}</button>
                </div>
            </div>
        `);

        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

        document.getElementById('confirm-delete')?.addEventListener('click', async () => {
            await remove('team', member.id);
            team = await getAll('team');
            closeModal();
            showToast(t('team.toast_deleted'), 'success');
            render();
        });
    }

    render();
}
