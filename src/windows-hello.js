const { exec } = require('child_process');
const path = require('path');

class WindowsHello {
    static isAvailable() {
        return process.platform === 'win32';
    }

    static async requestVerification() {
        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                reject(new Error('Windows Hello is only available on Windows'));
                return;
            }

            // Path to the PowerShell script
            const scriptPath = path.join(__dirname, 'windows-hello.ps1');
            
            // Execute the PowerShell script
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;

            console.log('Executing Windows Hello script...');
            
            exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
                const output = stdout.trim();
                console.log('Windows Hello output:', output);
                
                if (stderr) {
                    console.error('Windows Hello stderr:', stderr);
                }
                
                if (output === 'VERIFIED') {
                    resolve({ success: true, verified: true });
                } else if (output.startsWith('UNAVAILABLE')) {
                    reject(new Error('Windows Hello is not available. Please set it up in Windows Settings.'));
                } else if (output === 'CANCELED') {
                    resolve({ success: false, verified: false, reason: 'User cancelled verification' });
                } else if (output.startsWith('ERROR')) {
                    reject(new Error(output.replace('ERROR:', '')));
                } else {
                    resolve({ success: false, verified: false, reason: output || 'Verification failed' });
                }
            });
        });
    }
}

module.exports = WindowsHello;
