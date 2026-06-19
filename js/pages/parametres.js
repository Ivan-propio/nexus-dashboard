// Parametres (Settings) Page
import { getAll, put } from '../services/db.js';
import { getSession } from '../auth.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast } from '../app.js';
import { t } from '../i18n.js';

let activeSection = 'compte';

export async function renderParametres() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    const settings = await getAll('settings');
    const org = settings[0] || {};
    const session = getSession();

    function render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                    <!-- Left Nav -->
                    <div class="space-y-1">
                        <button class="settings-nav-item w-full text-left flex items-center gap-2.5 ${activeSection === 'compte' ? 'active' : ''}" data-section="compte">
                            <span class="material-symbols-outlined text-[18px]">person</span>
                            ${t('settings.account')}
                        </button>
                        <button class="settings-nav-item w-full text-left flex items-center gap-2.5 ${activeSection === 'securite' ? 'active' : ''}" data-section="securite">
                            <span class="material-symbols-outlined text-[18px]">shield</span>
                            ${t('settings.security')}
                        </button>
                        <button class="settings-nav-item w-full text-left flex items-center gap-2.5 ${activeSection === 'notifications' ? 'active' : ''}" data-section="notifications">
                            <span class="material-symbols-outlined text-[18px]">notifications</span>
                            ${t('settings.notifications')}
                        </button>
                        <button class="settings-nav-item w-full text-left flex items-center gap-2.5 ${activeSection === 'facturation' ? 'active' : ''}" data-section="facturation">
                            <span class="material-symbols-outlined text-[18px]">credit_card</span>
                            ${t('settings.billing')}
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="space-y-6" id="settings-content">
                        ${renderSection(org, session)}
                    </div>
                </div>
            </div>
        `;

        // Section nav
        content.querySelectorAll('[data-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeSection = btn.dataset.section;
                render();
            });
        });

        attachHandlers(org);
    }

    function renderSection(org, session) {
        switch (activeSection) {
            case 'compte': return renderCompte(org, session);
            case 'securite': return renderSecurite(org);
            case 'notifications': return renderNotifications(org);
            case 'facturation': return renderFacturation(org);
            default: return renderCompte(org, session);
        }
    }

    function renderCompte(org, session) {
        return `
            <!-- Profile -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <h3 class="font-headline font-semibold text-on-surface mb-6">${t('settings.profile')}</h3>
                <div class="flex items-start gap-6 mb-6">
                    <div class="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center">
                        <span class="text-2xl font-bold text-on-primary-container">${session?.initials || '??'}</span>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-on-surface">${session?.username || t('common.user')}</p>
                        <p class="text-xs text-on-surface-variant mb-3">${session?.role || ''}</p>
                        <button class="text-xs font-semibold text-primary hover:underline">${t('settings.change_photo')}</button>
                    </div>
                </div>
                <form id="profile-form" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.first_name')}</label>
                            <input type="text" name="prenom" value="${session?.username || ''}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.last_name')}</label>
                            <input type="text" name="nom" value="" placeholder="${t('settings.last_name_placeholder')}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.email')}</label>
                        <input type="email" name="email" value="${(session?.username || '').toLowerCase()}@nexus.fr" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.role')}</label>
                        <select name="role" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm bg-surface-container-low text-on-surface-variant" disabled>
                            <option>${session?.role || ''}</option>
                        </select>
                    </div>
                    <div class="flex justify-end pt-2">
                        <button type="submit" class="btn-primary">${t('settings.save')}</button>
                    </div>
                </form>
            </div>

            <!-- Organisation -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <h3 class="font-headline font-semibold text-on-surface mb-6">${t('settings.organization')}</h3>
                <form id="org-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.company_name')}</label>
                        <input type="text" name="nomEntreprise" value="${org.nomEntreprise || ''}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.siret')}</label>
                            <input type="text" name="siret" value="${org.siret || ''}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.vat_intra')}</label>
                            <input type="text" name="tvaIntra" value="${org.tvaIntra || ''}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.hq')}</label>
                        <input type="text" name="siege" value="${org.siege || ''}" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">${t('settings.currency')}</label>
                        <select name="devise" class="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
                            <option value="EUR" ${org.devise === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                            <option value="USD" ${org.devise === 'USD' ? 'selected' : ''}>USD - Dollar</option>
                            <option value="GBP" ${org.devise === 'GBP' ? 'selected' : ''}>GBP - Livre Sterling</option>
                        </select>
                    </div>
                    <div class="flex justify-end pt-2">
                        <button type="submit" class="btn-primary">${t('settings.save')}</button>
                    </div>
                </form>
            </div>

            <!-- Danger Zone -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-error/20">
                <h3 class="font-headline font-semibold text-error mb-4">${t('settings.danger_zone')}</h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between py-3 border-b border-surface-container">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.export_data')}</p>
                            <p class="text-xs text-on-surface-variant">${t('settings.export_data_desc')}</p>
                        </div>
                        <button id="export-data-btn" class="btn-secondary text-sm">${t('settings.export')}</button>
                    </div>
                    <div class="flex items-center justify-between py-3 border-b border-surface-container">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.archive_org')}</p>
                            <p class="text-xs text-on-surface-variant">${t('settings.archive_desc')}</p>
                        </div>
                        <button class="btn-secondary text-sm">${t('settings.archive')}</button>
                    </div>
                    <div class="flex items-center justify-between py-3">
                        <div>
                            <p class="text-sm font-medium text-error">${t('settings.delete_account')}</p>
                            <p class="text-xs text-on-surface-variant">${t('settings.delete_irreversible')}</p>
                        </div>
                        <button id="delete-account-btn" class="btn-danger text-sm">${t('settings.delete')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderSecurite(org) {
        const twoFA = org.securite?.twoFA || false;
        return `
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <h3 class="font-headline font-semibold text-on-surface mb-6">${t('settings.security')}</h3>
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.2fa')}</p>
                            <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.2fa_desc')}</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="twofa-toggle" class="sr-only peer" ${twoFA ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                    <div class="border-t border-surface-container pt-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-on-surface">${t('settings.change_password')}</p>
                                <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.change_password_desc')}</p>
                            </div>
                            <button class="btn-secondary text-sm" id="change-password-btn">${t('settings.change')}</button>
                        </div>
                    </div>
                    <div class="border-t border-surface-container pt-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-on-surface">${t('settings.active_sessions')}</p>
                                <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.active_sessions_desc')}</p>
                            </div>
                            <button class="text-xs font-semibold text-error hover:underline">${t('settings.disconnect_all')}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderNotifications(org) {
        const notifs = org.notifications || {};
        return `
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <h3 class="font-headline font-semibold text-on-surface mb-6">${t('settings.notifications')}</h3>
                <div class="space-y-5">
                    <label class="flex items-center justify-between cursor-pointer">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.unpaid_invoices')}</p>
                            <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.unpaid_desc')}</p>
                        </div>
                        <input type="checkbox" class="notif-checkbox w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" data-key="facturesImpayees" ${notifs.facturesImpayees ? 'checked' : ''}>
                    </label>
                    <label class="flex items-center justify-between cursor-pointer border-t border-surface-container pt-5">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.monthly_reports')}</p>
                            <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.monthly_desc')}</p>
                        </div>
                        <input type="checkbox" class="notif-checkbox w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" data-key="rapportsMensuels" ${notifs.rapportsMensuels ? 'checked' : ''}>
                    </label>
                    <label class="flex items-center justify-between cursor-pointer border-t border-surface-container pt-5">
                        <div>
                            <p class="text-sm font-medium text-on-surface">${t('settings.suspicious_logins')}</p>
                            <p class="text-xs text-on-surface-variant mt-0.5">${t('settings.suspicious_desc')}</p>
                        </div>
                        <input type="checkbox" class="notif-checkbox w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" data-key="connexionsSuspectes" ${notifs.connexionsSuspectes ? 'checked' : ''}>
                    </label>
                </div>
            </div>
        `;
    }

    function renderFacturation(org) {
        return `
            <!-- Billing Card -->
            <div class="rounded-2xl p-6 text-white" style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e3a5f 100%);">
                <div class="flex items-start justify-between mb-8">
                    <div>
                        <p class="text-xs text-white/50 uppercase tracking-wider font-semibold">${t('settings.current_plan')}</p>
                        <p class="text-xl font-headline font-bold mt-1">${org.plan || 'Business Pro'}</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-white/80">diamond</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-xs text-white/50 uppercase tracking-wider">${t('settings.next_payment')}</p>
                        <p class="text-sm font-medium mt-1">${org.prochainPaiement || '15/04/2026'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-white/50 uppercase tracking-wider">${t('settings.card')}</p>
                        <p class="text-sm font-medium mt-1 font-mono">**** **** **** ${org.carteFin || '4242'}</p>
                    </div>
                </div>
            </div>

            <!-- Billing details -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm p-6">
                <h3 class="font-headline font-semibold text-on-surface mb-4">${t('settings.billing_details')}</h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between py-3 border-b border-surface-container">
                        <span class="text-sm text-on-surface-variant">${t('settings.monthly_amount')}</span>
                        <span class="text-sm font-semibold text-on-surface">49,00 EUR / mois</span>
                    </div>
                    <div class="flex items-center justify-between py-3 border-b border-surface-container">
                        <span class="text-sm text-on-surface-variant">${t('settings.payment_method')}</span>
                        <span class="text-sm text-on-surface">Visa **** ${org.carteFin || '4242'}</span>
                    </div>
                    <div class="flex items-center justify-between py-3">
                        <span class="text-sm text-on-surface-variant">${t('settings.history')}</span>
                        <button class="text-xs font-semibold text-primary hover:underline">${t('settings.view_history')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function attachHandlers(org) {
        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast(t('settings.toast_profile'), 'success');
        });

        // Org form
        document.getElementById('org-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            org.nomEntreprise = form.nomEntreprise.value;
            org.siret = form.siret.value;
            org.tvaIntra = form.tvaIntra.value;
            org.siege = form.siege.value;
            org.devise = form.devise.value;
            await put('settings', org);
            showToast(t('settings.toast_org'), 'success');
        });

        // 2FA toggle
        document.getElementById('twofa-toggle')?.addEventListener('change', async (e) => {
            org.securite = org.securite || {};
            org.securite.twoFA = e.target.checked;
            await put('settings', org);
            showToast(e.target.checked ? t('settings.toast_2fa_on') : t('settings.toast_2fa_off'), 'info');
        });

        // Change password
        document.getElementById('change-password-btn')?.addEventListener('click', () => {
            showToast(t('settings.toast_password'), 'info');
        });

        // Notification checkboxes
        document.querySelectorAll('.notif-checkbox').forEach(cb => {
            cb.addEventListener('change', async () => {
                org.notifications = org.notifications || {};
                org.notifications[cb.dataset.key] = cb.checked;
                await put('settings', org);
                showToast(t('settings.toast_prefs'), 'success');
            });
        });

        // Export data
        document.getElementById('export-data-btn')?.addEventListener('click', async () => {
            const { getAll: ga } = await import('../services/db.js');
            const data = {
                devis: await ga('devis'),
                factures: await ga('factures'),
                transactions: await ga('transactions'),
                team: await ga('team'),
                settings: await ga('settings'),
                exportDate: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexus-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(t('settings.toast_exported'), 'success');
        });

        // Delete account
        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            showToast(t('settings.toast_delete_confirm'), 'error');
        });
    }

    render();
}
