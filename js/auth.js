// Authentication module for admin access
const AUTH_KEY = 'rok_admin_session';
// Define passwords with permission levels
const PASSWORDS = {
    'kvk2001': { level: 'full', canManage: true },    // Full admin access
    'kvk2025': { level: 'limited', canManage: false } // Limited admin (no database management)
};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class AuthManager {
    constructor() {
        this.checkSession();
        this.setupEventListeners();
        this.startSessionTimer();
    }

    checkSession() {
        const session = localStorage.getItem(AUTH_KEY);
        if (session) {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            
            if (now - sessionData.timestamp > SESSION_TIMEOUT) {
                this.logout();
                return false;
            }
            
            // Refresh timestamp
            sessionData.timestamp = now;
            localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
            return true;
        }
        return false;
    }

    login(password) {
        if (PASSWORDS[password]) {
            const sessionData = {
                authenticated: true,
                timestamp: Date.now(),
                canManage: PASSWORDS[password].canManage,
                adminLevel: PASSWORDS[password].level
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
            return true;
        }
        return false;
    }

    logout() {
        localStorage.removeItem(AUTH_KEY);
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    isAuthenticated() {
        return this.checkSession();
    }

    setupEventListeners() {
        // Login modal
        const loginBtn = document.getElementById('adminLoginBtn');
        const loginModal = document.getElementById('loginModal');
        const loginSubmit = document.getElementById('loginSubmit');
        const loginCancel = document.getElementById('loginCancel');
        const passwordInput = document.getElementById('adminPassword');
        const loginError = document.getElementById('loginError');
        const closeBtn = loginModal?.querySelector('.close');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                loginModal.style.display = 'block';
                passwordInput.value = '';
                loginError.textContent = '';
                passwordInput.focus();
            });
        }

        if (loginSubmit) {
            loginSubmit.addEventListener('click', () => {
                const password = passwordInput.value;
                if (this.login(password)) {
                    window.location.href = 'admin.html';
                } else {
                    loginError.textContent = '❌ Invalid password. Try again.';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loginSubmit.click();
                }
            });
        }

        if (loginCancel) {
            loginCancel.addEventListener('click', () => {
                loginModal.style.display = 'none';
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                loginModal.style.display = 'none';
            });
        }

        // Logout button (on admin page)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });
    }

    startSessionTimer() {
        // Check session every minute
        setInterval(() => {
            if (window.location.pathname.includes('admin.html')) {
                if (!this.checkSession()) {
                    alert('Your session has expired. Please login again.');
                    this.logout();
                }
            }
        }, 60000);
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            alert('Please login to access the admin panel.');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // Check if user has data management permissions
    canManageData() {
        const session = localStorage.getItem(AUTH_KEY);
        if (session) {
            const sessionData = JSON.parse(session);
            return sessionData.canManage || false;
        }
        return false;
    }

    // Get admin level
    getAdminLevel() {
        const session = localStorage.getItem(AUTH_KEY);
        if (session) {
            const sessionData = JSON.parse(session);
            return sessionData.adminLevel || 'limited';
        }
        return null;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Check authentication on admin page load
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        authManager.requireAuth();
    });
}

// Export for use in other modules
window.authManager = authManager;