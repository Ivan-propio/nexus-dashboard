// Login Page
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';

export function renderLogin() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');

    shell.classList.add('hidden');
    loginScreen.classList.remove('hidden');

    loginScreen.innerHTML = `
        <div class="login-bg min-h-screen flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <!-- Logo -->
                <div class="flex items-center justify-center gap-3 mb-8">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-[24px]">hub</span>
                    </div>
                    <div>
                        <h1 class="font-headline font-bold text-xl text-on-surface">Nexus Dashboard</h1>
                        <p class="text-xs text-on-surface-variant">${t('login.subtitle')}</p>
                    </div>
                </div>

                <!-- Form -->
                <form id="login-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">${t('login.username')}</label>
                        <input type="text" id="login-username" required autocomplete="username"
                            class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="${t('login.username_placeholder')}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">${t('login.password')}</label>
                        <div class="relative">
                            <input type="password" id="login-password" required autocomplete="current-password"
                                class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12"
                                placeholder="${t('login.password_placeholder')}">
                            <button type="button" id="toggle-password" class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                                <span class="material-symbols-outlined text-[20px]">visibility_off</span>
                            </button>
                        </div>
                    </div>

                    <div id="login-error" class="hidden text-sm text-error bg-error-container/30 px-4 py-2.5 rounded-lg"></div>

                    <button type="submit" class="btn-primary w-full flex items-center justify-center gap-2 py-3">
                        <span class="material-symbols-outlined text-[18px]">login</span>
                        ${t('login.submit')}
                    </button>
                </form>

                <p class="text-center text-xs text-outline mt-6">${t('login.footer')}</p>
            </div>
        </div>
    `;

    // Toggle password visibility
    document.getElementById('toggle-password').addEventListener('click', () => {
        const inp = document.getElementById('login-password');
        const icon = document.querySelector('#toggle-password .material-symbols-outlined');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.textContent = 'visibility';
        } else {
            inp.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });

    // Form submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        const session = await login(username, password);
        if (session) {
            loginScreen.classList.add('hidden');
            loginScreen.innerHTML = '';
            navigate('#/dashboard');
        } else {
            errorEl.textContent = t('login.error');
            errorEl.classList.remove('hidden');
            document.getElementById('login-password').value = '';
        }
    });
}
