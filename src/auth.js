const bcrypt = require('bcryptjs');
const keytar = require('keytar');
const pool = require('./db');

const SERVICE_NAME = 'RBAC-OS';

class AuthService {
    // Register new user
    async register(email, password) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        try {
            const result = await pool.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
                [email, passwordHash]
            );
            return { success: true, user: result.rows[0] };
        } catch (error) {
            if (error.code === '23505') {
                return { success: false, error: 'Email already exists' };
            }
            throw error;
        }
    }

    // Login with email/password
    async login(email, password) {
        const result = await pool.query(
            'SELECT id, email, password_hash, biometric_enabled FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid credentials' };
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return { success: false, error: 'Invalid credentials' };
        }

        return { 
            success: true, 
            user: { 
                id: user.id, 
                email: user.email,
                biometricEnabled: user.biometric_enabled
            } 
        };
    }

    // Enable biometric for user
    async enableBiometric(userId, email) {
        try {
            // Store credential in Windows Credential Manager
            const token = `biometric_${userId}_${Date.now()}`;
            await keytar.setPassword(SERVICE_NAME, email, token);

            // Update database
            await pool.query(
                'UPDATE users SET biometric_enabled = TRUE WHERE id = $1',
                [userId]
            );

            return { success: true };
        } catch (error) {
            console.error('Biometric enrollment failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Authenticate with biometric
    async authenticateWithBiometric(email) {
        try {
            // Check if credential exists in Windows Credential Manager
            const credential = await keytar.getPassword(SERVICE_NAME, email);
            
            if (!credential) {
                return { success: false, error: 'Biometric not enrolled' };
            }

            // Verify user exists and has biometric enabled
            const result = await pool.query(
                'SELECT id, email, biometric_enabled FROM users WHERE email = $1 AND biometric_enabled = TRUE',
                [email]
            );

            if (result.rows.length === 0) {
                return { success: false, error: 'Biometric not enabled for this user' };
            }

            return { 
                success: true, 
                user: { 
                    id: result.rows[0].id, 
                    email: result.rows[0].email 
                } 
            };
        } catch (error) {
            console.error('Biometric auth failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user by email (for biometric lookup)
    async getUserByEmail(email) {
        const result = await pool.query(
            'SELECT id, email, biometric_enabled FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    // Check if biometric is available
    async checkBiometricAvailable(email) {
        const credential = await keytar.getPassword(SERVICE_NAME, email);
        return !!credential;
    }
}

module.exports = new AuthService();
