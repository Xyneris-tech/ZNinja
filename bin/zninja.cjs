#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const appPath = path.join(__dirname, '..');
const args = process.argv.slice(2);

// Handle CLI Flags
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🥷 ZNinja - Service Host Runtime CLI

Usage:
  zninja           Launch the application
  zninja --setup   Configure API keys via terminal
  zninja --version Show version info
  zninja --help    Show this help menu
    `);
    process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
    const pkg = require(path.join(appPath, 'package.json'));
    console.log(`ZNinja v${pkg.version}`);
    process.exit(0);
}

if (args.includes('--setup')) {
    // Launch the setup script
    const setupScript = path.join(appPath, 'scripts', 'setup.js');
    if (fs.existsSync(setupScript)) {
        require(setupScript);
    } else {
        console.error('Setup script not found at:', setupScript);
        process.exit(1);
    }
    return;
}

// Launch Electron
let electronPath;
try {
    // Try to find electron in the project's node_modules
    electronPath = require(path.join(appPath, 'node_modules', 'electron'));
} catch (e) {
    // Fallback to global/path electron
    electronPath = 'electron';
}

console.log('🌑 Launching ZNinja Stealth Engine...');
const child = spawn(electronPath, [appPath, ...args], {
    stdio: 'inherit',
    windowsHide: false
});

child.on('close', (code) => {
    process.exit(code);
});
