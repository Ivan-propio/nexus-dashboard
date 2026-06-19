// Authentication module
import { getAll } from './services/db.js';

const USERS = [
    { username: 'Ivan', password: 'Paperjamclub1!', role: 'ADMIN', initials: 'IV' },
    { username: 'Dany', password: 'Paperjamclub1!', role: 'ADMIN', initials: 'DA' },
    { username: 'Sylvia', password: 'Paperjamclub1!', role: 'MANAGER', initials: 'SY' },
    { username: 'Etienne', password: 'Paperjam1!', role: 'VIEWER', initials: 'ET' },
];

const SESSION_KEY = 'nexus_session';
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

export async function login(username, password) {
    // Check dynamic users from DB first
    try {
        const teamMembers = await getAll('team');
        const dbUser = teamMembers.find(u =>
            u.username && u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.statut === 'active'
        );
        if (dbUser) {
            const session = {
                username: dbUser.username,
                role: dbUser.role,
                initials: dbUser.initials,
                loginAt: new Date().toISOString()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            return session;
        }
    } catch(e) { /* DB not ready, fall through to hardcoded */ }

    // Fallback to hardcoded users
    const user = USERS.find(u =>
        u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!user) return null;

    const session = {
        username: user.username,
        role: user.role,
        initials: user.initials,
        loginAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}

export function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session.loginAt) {
            const age = Date.now() - new Date(session.loginAt).getTime();
            if (age > SESSION_MAX_AGE) {
                logout();
                return null;
            }
        }
        return session;
    } catch {
        return null;
    }
}

export function logout() {
    localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
    return getSession() !== null;
}

export function requireRole(...roles) {
    const session = getSession();
    if (!session) return false;
    return roles.includes(session.role);
}
