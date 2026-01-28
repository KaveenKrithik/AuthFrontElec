// RBAC OS - Authentication Script

document.addEventListener('DOMContentLoaded', () => {
    // ===== Window Controls =====
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (window.electronAPI) {
        minimizeBtn?.addEventListener('click', () => window.electronAPI.minimizeWindow());
        maximizeBtn?.addEventListener('click', () => window.electronAPI.maximizeWindow());
        closeBtn?.addEventListener('click', () => window.electronAPI.closeWindow());
    }

    // ===== Elements =====
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const togglePassword = document.getElementById('toggle-password');
    const biometricBtn = document.getElementById('biometric-btn');
    const biometricStatus = document.getElementById('biometric-status');

    // SSO Buttons
    const microsoftSso = document.getElementById('microsoft-sso');
    const oktaSso = document.getElementById('okta-sso');
    const samlSso = document.getElementById('saml-sso');

    // ===== Toggle Password Visibility =====
    togglePassword?.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePassword.classList.toggle('active', isPassword);
    });

    // ===== Biometric Authentication =====
    biometricBtn?.addEventListener('click', async () => {
        // Hide button, show status
        biometricBtn.style.display = 'none';
        biometricStatus.classList.add('active');
        biometricStatus.classList.remove('success');

        try {
            let result;
            
            if (window.electronAPI) {
                // Use Electron's biometric API
                result = await window.electronAPI.authenticateBiometric();
            } else {
                // Simulate for browser testing
                result = await simulateBiometric();
            }

            if (result.success) {
                // Success state
                biometricStatus.classList.add('success');
                biometricStatus.querySelector('.status-text').textContent = 'Authentication successful!';
                
                showNotification('Biometric authentication successful!', 'success');
                
                // Redirect to workspace
                setTimeout(() => {
                    console.log('Redirecting to RBAC OS Workspace...');
                    showNotification('Launching RBAC OS Workspace...', 'info');
                }, 1500);
            } else {
                throw new Error('Biometric authentication failed');
            }
        } catch (error) {
            biometricStatus.querySelector('.status-text').textContent = 'Authentication failed. Please try again.';
            biometricStatus.querySelector('.pulse-ring').style.borderColor = 'var(--error)';
            biometricStatus.querySelector('.status-icon').style.color = 'var(--error)';
            
            showNotification('Biometric authentication failed', 'error');
            
            // Reset after delay
            setTimeout(() => {
                resetBiometricUI();
            }, 2000);
        }
    });

    function resetBiometricUI() {
        biometricBtn.style.display = 'flex';
        biometricStatus.classList.remove('active', 'success');
        biometricStatus.querySelector('.status-text').textContent = 'Scanning biometric data...';
        biometricStatus.querySelector('.pulse-ring').style.borderColor = '';
        biometricStatus.querySelector('.status-icon').style.color = '';
    }

    function simulateBiometric() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, method: 'fingerprint' });
            }, 2500);
        });
    }

    // ===== Form Submission =====
    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showNotification('Please enter a valid corporate email', 'error');
            return;
        }

        // Loading state
        setLoading(loginBtn, true);

        try {
            await simulateLogin(email, password);
            showNotification('Authentication successful!', 'success');
            
            setTimeout(() => {
                showNotification('Launching RBAC OS Workspace...', 'info');
            }, 1500);
        } catch (error) {
            showNotification(error.message || 'Authentication failed', 'error');
        } finally {
            setLoading(loginBtn, false);
        }
    });

    // ===== SSO Handlers =====
    microsoftSso?.addEventListener('click', () => handleSSO('Microsoft'));
    oktaSso?.addEventListener('click', () => handleSSO('Okta'));
    samlSso?.addEventListener('click', () => handleSSO('SAML'));

    function handleSSO(provider) {
        showNotification(`Connecting to ${provider}...`, 'info');
        console.log(`SSO Provider: ${provider}`);
    }

    // ===== Utilities =====
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setLoading(button, isLoading) {
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }

    function simulateLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (password.length >= 6) {
                    resolve({ success: true });
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1500);
        });
    }

    // ===== Notification System =====
    function showNotification(message, type = 'info') {
        // Remove existing
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
            error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
            warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
            info: { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)', text: '#6366f1' }
        };
        
        const color = colors[type] || colors.info;

        notification.innerHTML = `
            <div class="notification-icon">
                ${type === 'success' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' :
                  type === 'error' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' :
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'}
            </div>
            <span class="notification-text">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Inject styles if needed
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 60px;
                    right: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    z-index: 10000;
                    animation: notifSlide 0.3s ease;
                    font-size: 14px;
                    font-weight: 500;
                }
                @keyframes notifSlide {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .notification-icon svg {
                    width: 18px;
                    height: 18px;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    opacity: 0.6;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    margin-left: 8px;
                    transition: opacity 0.15s;
                }
                .notification-close:hover { opacity: 1; }
            `;
            document.head.appendChild(style);
        }

        notification.style.cssText = `
            background: ${color.bg};
            border: 1px solid ${color.border};
            color: ${color.text};
        `;

        document.body.appendChild(notification);

        // Close handlers
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ===== Input Enhancements =====
    const inputs = document.querySelectorAll('.input-wrapper input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.closest('.input-wrapper').classList.add('focused');
        });
        input.addEventListener('blur', () => {
            input.closest('.input-wrapper').classList.remove('focused');
        });
    });

    // ===== Keyboard Shortcuts =====
    document.addEventListener('keydown', (e) => {
        // Alt + B for biometric
        if (e.altKey && e.key === 'b') {
            e.preventDefault();
            biometricBtn?.click();
        }
    });
});
