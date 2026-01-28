// RBAC OS - Multi-View Authentication

document.addEventListener('DOMContentLoaded', () => {
    // Window Controls
    document.getElementById('minimize-btn')?.addEventListener('click', () => window.electronAPI?.minimizeWindow());
    document.getElementById('maximize-btn')?.addEventListener('click', () => window.electronAPI?.maximizeWindow());
    document.getElementById('close-btn')?.addEventListener('click', () => window.electronAPI?.closeWindow());

    // Views
    const views = {
        signup: document.getElementById('signup-view'),
        enroll: document.getElementById('enroll-view'),
        login: document.getElementById('login-view'),
        workspace: document.getElementById('workspace-view')
    };

    // State
    let currentUser = null;

    // View Navigation
    function showView(viewName) {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        views[viewName]?.classList.remove('hidden');
    }

    // Check if user exists on load
    async function init() {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail && window.electronAPI) {
            const { available } = await window.electronAPI.checkBiometric(savedEmail);
            if (available) {
                document.getElementById('user-email-display').textContent = savedEmail;
                showView('login');
                return;
            }
        }
        showView('signup');
    }

    // Navigation links
    document.getElementById('goto-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            document.getElementById('user-email-display').textContent = savedEmail;
            showView('login');
        } else {
            showNotification('No account found. Please sign up first.', 'warning');
        }
    });

    document.getElementById('goto-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('signup');
    });

    document.getElementById('switch-user')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userEmail');
        showView('signup');
    });

    // SIGN UP FORM
    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (password !== confirm) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        const btn = document.getElementById('signup-btn');
        setLoading(btn, true);

        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.register(email, password);
                if (!result.success) {
                    throw new Error(result.error);
                }
                currentUser = { email };
            }

            localStorage.setItem('userEmail', email);
            showNotification('Account created! Now set up your biometric.', 'success');
            
            setTimeout(() => showView('enroll'), 1000);
        } catch (error) {
            showNotification(error.message || 'Sign up failed', 'error');
        } finally {
            setLoading(btn, false);
        }
    });

    // BIOMETRIC ENROLLMENT
    document.getElementById('enroll-btn')?.addEventListener('click', async () => {
        const status = document.getElementById('enroll-status');
        const btn = document.getElementById('enroll-btn');
        
        btn.classList.add('hidden');
        status.classList.remove('hidden');

        try {
            if (window.electronAPI) {
                // First login to set currentUser in main process
                const email = localStorage.getItem('userEmail');
                const result = await window.electronAPI.enableBiometric();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
            }

            // Simulate Windows Hello prompt delay
            await new Promise(r => setTimeout(r, 2000));

            showNotification('Biometric enrolled successfully!', 'success');
            
            // Show login view
            setTimeout(() => {
                document.getElementById('user-email-display').textContent = localStorage.getItem('userEmail');
                showView('login');
            }, 1500);
        } catch (error) {
            showNotification(error.message || 'Enrollment failed', 'error');
            btn.classList.remove('hidden');
            status.classList.add('hidden');
        }
    });

    // BIOMETRIC LOGIN
    document.getElementById('biometric-login-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('biometric-login-btn');
        const status = document.getElementById('login-status');
        const statusText = status.querySelector('.status-text');
        
        btn.classList.add('hidden');
        status.classList.remove('hidden');
        status.classList.remove('success');

        try {
            const email = localStorage.getItem('userEmail');
            
            if (window.electronAPI) {
                // This triggers the actual biometric check
                const result = await window.electronAPI.authenticateBiometric(email);
                
                if (!result.success) {
                    throw new Error(result.error || 'Biometric verification failed');
                }
                
                currentUser = result.user;
            } else {
                // Fallback for browser testing
                await new Promise(r => setTimeout(r, 2000));
            }

            status.classList.add('success');
            statusText.textContent = 'Authentication successful!';
            showNotification('Welcome back!', 'success');

            setTimeout(() => {
                document.getElementById('workspace-email').textContent = localStorage.getItem('userEmail');
                showView('workspace');
            }, 1500);
        } catch (error) {
            showNotification(error.message || 'Authentication failed', 'error');
            statusText.textContent = 'Authentication failed';
            
            setTimeout(() => {
                btn.classList.remove('hidden');
                status.classList.add('hidden');
                statusText.textContent = 'Scanning biometric data...';
            }, 2000);
        }
    });

    // LOGOUT
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (window.electronAPI) {
            await window.electronAPI.logout();
        }
        currentUser = null;
        showNotification('Signed out successfully', 'info');
        
        const email = localStorage.getItem('userEmail');
        if (email) {
            document.getElementById('user-email-display').textContent = email;
            showView('login');
        } else {
            showView('signup');
        }
    });

    // Utilities
    function setLoading(button, isLoading) {
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }

    function showNotification(message, type = 'info') {
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
            error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
            warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
            info: { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)', text: '#6366f1' }
        };
        
        const color = colors[type] || colors.info;

        notification.innerHTML = `<span>${message}</span><button class="notification-close">&times;</button>`;

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 56px;
                    right: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                    z-index: 10000;
                    animation: notifSlide 0.25s ease;
                    font-size: 13px;
                    font-weight: 500;
                }
                @keyframes notifSlide {
                    from { opacity: 0; transform: translateX(16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    opacity: 0.5;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                }
                .notification-close:hover { opacity: 1; }
            `;
            document.head.appendChild(style);
        }

        notification.style.cssText = `background: ${color.bg}; border: 1px solid ${color.border}; color: ${color.text};`;
        document.body.appendChild(notification);

        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.2s';
            setTimeout(() => notification.remove(), 200);
        }, 4000);
    }

    // Initialize
    init();
});
