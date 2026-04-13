const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');

console.log('\x1b[32m%s\x1b[0m', `
      Z N I N J A  |  S E T U P
    ================================
`);

async function runSetup() {
    try {
        console.log('Checking dependencies...');
        if (!fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
            console.log('Installing dependencies (this may take a minute)...');
            execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        }

        const keys = [];
        const askKey = () => {
            return new Promise((resolve) => {
                rl.question(`Enter Gemini API Key ${keys.length + 1} (or press Enter to finish): `, (key) => {
                    if (key.trim()) {
                        keys.push(key.trim());
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });
        };

        let adding = true;
        while (adding && keys.length < 5) {
            adding = await askKey();
        }

        if (keys.length > 0) {
            // Write to .env
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }

            // Update VITE_GEMINI
            if (envContent.includes('VITE_GEMINI=')) {
                envContent = envContent.replace(/VITE_GEMINI=.*/, `VITE_GEMINI=${keys[0]}`);
            } else {
                envContent += `\nVITE_GEMINI=${keys[0]}`;
            }

            fs.writeFileSync(envPath, envContent.trim() + '\n');
            console.log('\x1b[32m%s\x1b[0m', '✔ Environment configured successfully (.env updated)');
            
            if (keys.length > 1) {
                console.log('\x1b[33m%s\x1b[0m', 'ℹ Multiple keys detected. These will be used for auto-rotation by the runtime.');
            }
        }

        console.log('\x1b[32m%s\x1b[0m', '\n✔ Setup Complete. You can now run "zninja" from anywhere.');
        rl.close();
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '✖ Setup failed:', error.message);
        rl.close();
        process.exit(1);
    }
}

if (require.main === module) {
    runSetup();
}

module.exports = runSetup;
