// Hash-based SPA Router

const routes = {};
let currentCleanup = null;

export function registerRoute(hash, handler) {
    routes[hash] = handler;
}

export function navigate(hash) {
    window.location.hash = hash;
}

export function getCurrentRoute() {
    return window.location.hash || '#/login';
}

export function startRouter(authGuard) {
    async function handleRoute() {
        const hash = getCurrentRoute();
        const route = hash.split('?')[0];

        // Auth guard
        if (route !== '#/login' && authGuard && !authGuard()) {
            navigate('#/login');
            return;
        }
        if (route === '#/login' && authGuard && authGuard()) {
            navigate('#/bdc');
            return;
        }

        // Run cleanup of previous page
        if (currentCleanup && typeof currentCleanup === 'function') {
            currentCleanup();
            currentCleanup = null;
        }

        const handler = routes[route];
        if (handler) {
            const result = await handler();
            if (typeof result === 'function') {
                currentCleanup = result;
            }
        } else if (route !== '#/login') {
            navigate('#/bdc');
        }
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
