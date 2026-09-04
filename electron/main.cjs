const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, clipboard, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

const fs = require('fs');
const path = require('path');

// --- Load Modules ---
const config = require('./config.cjs');
const native = require('./platform/index.cjs');
const gemini = require('./gemini.cjs');

// --- Environment Setup ---
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.VITE_GEMINI) {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

// Determine initial window height based on API key status
const initialKeys = config.getApiKeys();
const initialHeight = (initialKeys && initialKeys.length > 0) ? 400 : 500;

function createWindow() {
    const helperWin = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
        frame: false,
        skipTaskbar: true,
        focusable: false,
        title: 'Service Host: Runtime',
        icon: path.join(__dirname, '../resources/icon.png'),
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const win = new BrowserWindow({
        width: 600,
        height: initialHeight,
        frame: false, // Frameless for custom UI
        transparent: true, // Transparent background
        title: 'Service Host: Runtime',
        alwaysOnTop: true, // Keep it visible to user
        resizable: false, // Prevent resize cursor 100% of the time
        type: 'utility', // Hides from Apps list in Task Manager
        show: true, // Start completely hidden
        parent: helperWin,
        hasShadow: false,
        icon: path.join(__dirname, '../resources/icon.png'),
        skipTaskbar: true, // Start hidden from taskbar (Background process)
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Elevate to screen-saver level to stay above full-screen proctoring browsers
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    win.on('closed', () => {
        if (!helperWin.isDestroyed()) helperWin.close();
    });

    // Load Vite dev server or build
    const isDev = !app.isPackaged || process.argv.includes('--dev');
    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(__dirname, '../dist-app/index.html');
        console.log('Loading file from:', indexPath);
        win.loadFile(indexPath);
    }

    // --- IPC Handlers ---

    // Config & Sessions
    ipcMain.handle('save-api-key', async (_, data) => {
        const success = config.saveApiKey(data);
        if (success) {
            // Immediately fetch available models for this new key
            const modelResult = await gemini.listModels();
            if (modelResult.success) {
                config.saveAvailableModels(modelResult.models);
            }

            win.setResizable(true);
            win.setSize(600, 400);
            win.setResizable(false);
        }
        return success;
    });
    ipcMain.handle('get-api-key', () => config.getApiKey());
    ipcMain.handle('get-api-keys', () => config.getApiKeys());
    ipcMain.handle('clear-api-key', () => {
        const success = config.clearApiKey();
        if (success) {
            win.setResizable(true);
            win.setSize(600, 500);
            win.setResizable(false);
        }
        return success;
    });
    ipcMain.handle('get-role', () => config.getSystemInstruction());

    ipcMain.handle('get-sessions', async () => config.getSessions());
    ipcMain.handle('save-session', async (_, session) => config.upsertSession(session));
    ipcMain.handle('delete-session', async (_, sessionId) => config.deleteSession(sessionId));
    ipcMain.handle('clear-all-sessions', async () => config.saveSessions([]));

    // Gemini
    ipcMain.handle('list-models', async () => {
        // Try to get from local config first (Fast)
        const storedModels = config.getAvailableModels();
        if (storedModels && storedModels.length > 0) {
            return { success: true, models: storedModels };
        }
        // Fallback to fresh fetch if none stored
        return gemini.listModels();
    });
    ipcMain.handle('ask-gemini', async (_, payload) => gemini.askGemini(payload));
    ipcMain.on('stream-gemini', async (event, payload) => {
        gemini.streamGemini(payload, {
            onChunk: (data, replace = false) => {
                if (typeof data === 'string') {
                    win.webContents.send('gemini-chunk', { text: data, replace });
                } else {
                    win.webContents.send('gemini-chunk', data);
                }
            },
            onDone: (usedModel, finalText = null) => win.webContents.send('gemini-done', { usedModel, finalText }),
            onError: (error) => win.webContents.send('gemini-error', { error })
        });
    });
    ipcMain.on('stop-gemini', () => {
        gemini.abortActiveStream();
    });

    ipcMain.handle('capture-screen', async () => {
        try {
            // Hide the window first to prevent it from being caught in the screen capture
            const wasVisible = win.isVisible();
            if (wasVisible) {
                win.hide();
                // Allow a brief moment for the window manager / OS to finish hiding the window
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1280, height: 720 }
            });

            // Restore the window's exact visibility and focus state after capturing
            if (wasVisible) {
                win.show();
                win.setSkipTaskbar(true);
                win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                win.setAlwaysOnTop(true, 'screen-saver');
                if (win.isFocusable()) win.focus();
            }

            const primarySource = sources[0];
            if (primarySource) {
                return { success: true, image: primarySource.thumbnail.toDataURL() };
            }
            return { success: false, error: "No screen source found" };
        } catch (e) {
            console.error('Screen capture error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('save-file', async (event, { buffer, defaultName }) => {
        try {
            const { filePath } = await dialog.showSaveDialog(win, {
                defaultPath: defaultName || 'recording.webm',
                filters: [{ name: 'Audio Files', extensions: ['webm', 'wav', 'mp3'] }]
            });

            if (filePath) {
                // Buffer is received as Uint8Array from renderer
                fs.writeFileSync(filePath, Buffer.from(buffer));
                return { success: true, filePath };
            }
            return { success: false, error: 'Cancelled' };
        } catch (e) {
            console.error('Save file error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('get-audio-sources', async () => {
        try {
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 150, height: 150 } // Tiny thumbnails for selection UI
            });
            return {
                success: true,
                sources: sources.map(s => ({
                    id: s.id,
                    name: s.name,
                    thumbnail: s.thumbnail.toDataURL()
                }))
            };
        } catch (e) {
            console.error('Audio source error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('toggle-stealth', (event, shouldEnable) => {
        return native.toggleStealthMode(win, shouldEnable);
    });

    ipcMain.on('minimize-app', () => win.hide());
    ipcMain.on('close-app', () => app.quit());

    ipcMain.on('resize-window', (event, { width, height }) => {
        const w = Math.max(Math.floor(width), 200);
        const h = Math.max(Math.floor(height), 150);
        win.setResizable(true);
        win.setSize(w, h);
        win.setResizable(false);
    });

    ipcMain.handle('get-window-size', () => {
        const [width, height] = win.getSize();
        return { width, height };
    });

    ipcMain.handle('set-focusable', (event, focusable) => {
        win.setFocusable(focusable);
        win.setAlwaysOnTop(true, 'screen-saver');
        return true;
    });

    ipcMain.handle('show-confirm', async (event, message) => {
        const result = await dialog.showMessageBox(win, {
            type: 'question',
            buttons: ['Cancel', 'OK'],
            defaultId: 1,
            title: 'Confirm',
            message: message
        });
        return result.response === 1;
    });

    ipcMain.handle('focus-window', () => {
        if (win.isFocusable()) win.focus();
        return true;
    });

    // Auto-Updater Handlers
    autoUpdater.autoDownload = false; // Disable auto download for manual control

    autoUpdater.on('checking-for-update', () => {
        win.webContents.send('update-message', 'Checking for update...');
    });
    autoUpdater.on('update-available', (info) => {
        win.webContents.send('update-available', info);
    });
    autoUpdater.on('update-not-available', (info) => {
        win.webContents.send('update-message', 'ZNinja is up to date.');
        win.webContents.send('update-not-available');
    });
    autoUpdater.on('error', (err) => {
        const errorMsg = err.message.toLowerCase();

        // Treat these specific "errors" as "Up to date" or "Offline" for a smoother UX
        const isNotAnError =
            !app.isPackaged ||
            errorMsg.includes('404') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('no published versions') ||
            errorMsg.includes('dev-app-update.yml') ||
            errorMsg.includes('net::err_internet_disconnected') ||
            errorMsg.includes('net::err_name_not_resolved') ||
            errorMsg.includes('net::err_connection_timed_out');

        if (isNotAnError) {
            console.log('Suppressed update error (treating as up-to-date):', err.message);
            // If it's a network error specifically, we might want to say "Check connection" 
            // but the user asked to show "Up to date" instead of technical errors.
            win.webContents.send('update-not-available');
            return;
        }

        win.webContents.send('update-error', err.message);
    });
    autoUpdater.on('download-progress', (progressObj) => {
        win.webContents.send('update-download-progress', progressObj);
    });
    autoUpdater.on('update-downloaded', (info) => {
        win.webContents.send('update-ready', info);
    });

    ipcMain.handle('check-for-update', () => {
        return autoUpdater.checkForUpdates();
    });

    ipcMain.handle('download-update', () => {
        return autoUpdater.downloadUpdate();
    });

    ipcMain.handle('install-update', () => {
        autoUpdater.quitAndInstall();
    });

    ipcMain.handle('run-code', async (_, { code, language, input }) => {
        console.log(`\n==================================================`);
        console.log(`[ZNinja Runner] IPC 'run-code' invocation received`);
        console.log(`[ZNinja Runner] Language: ${language}`);
        console.log(`[ZNinja Runner] Input size: ${input ? input.length : 0} chars`);

        const { exec } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        
        const runId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const runDir = path.join(app.getPath('temp'), 'zninja_runs', `run_${runId}`);
        
        if (!fs.existsSync(runDir)) {
            console.log(`[ZNinja Runner] Creating run subdirectory: ${runDir}`);
            fs.mkdirSync(runDir, { recursive: true });
        } else {
            console.log(`[ZNinja Runner] Using run subdirectory: ${runDir}`);
        }

        const inputPath = path.join(runDir, 'input.txt');
        fs.writeFileSync(inputPath, input || '');
        console.log(`[ZNinja Runner] Input file created: ${inputPath}`);

        let fileExt = '';
        let compileCmd = '';
        let runCmd = '';
        let fileName = 'solution';

        const lang = language.toLowerCase();
        
        if (lang === 'python' || lang === 'py') {
            fileExt = 'py';
            runCmd = `python ${fileName}.py < input.txt`;
        } else if (lang === 'cpp' || lang === 'c++') {
            fileExt = 'cpp';
            compileCmd = `g++ -O3 ${fileName}.cpp -o ${fileName}.exe`;
            runCmd = `${fileName}.exe < input.txt`;
        } else if (lang === 'java') {
            let className = 'Main';
            const publicClassMatch = code.match(/\bpublic\s+class\s+(\w+)/);
            if (publicClassMatch) {
                className = publicClassMatch[1];
            } else {
                const classRegex = /\bclass\s+(\w+)/g;
                const classes = [];
                let match;
                while ((match = classRegex.exec(code)) !== null) {
                    classes.push(match[1]);
                }
                if (classes.length > 0) {
                    if (classes.includes('Main')) {
                        className = 'Main';
                    } else if (classes.includes('Solution')) {
                        className = 'Solution';
                    } else {
                        className = classes[0];
                    }
                }
            }
            fileExt = 'java';
            fileName = className;
            compileCmd = `javac ${fileName}.java`;
            runCmd = `java ${fileName} < input.txt`;
        } else if (lang === 'javascript' || lang === 'js' || lang === 'nodejs') {
            fileExt = 'js';
            runCmd = `node ${fileName}.js < input.txt`;
        } else {
            console.log(`[ZNinja Runner] Unsupported language requested: ${language}`);
            try {
                if (fs.existsSync(runDir)) {
                    fs.rmSync(runDir, { recursive: true, force: true });
                }
            } catch (err) {}
            return {
                success: false,
                stdout: '',
                stderr: `Unsupported language: ${language}`,
                timeMs: 0,
                errorType: 'unsupported'
            };
        }

        const sourcePath = path.join(runDir, `${fileName}.${fileExt}`);
        fs.writeFileSync(sourcePath, code);
        console.log(`[ZNinja Runner] Written source code to: ${sourcePath}`);

        const fullCommand = compileCmd ? `${compileCmd} && ${runCmd}` : runCmd;
        console.log(`[ZNinja Runner] Executing command line: ${fullCommand}`);
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            exec(fullCommand, { 
                cwd: runDir, 
                timeout: 5000, 
                maxBuffer: 1024 * 1024 
            }, (error, stdout, stderr) => {
                const timeMs = Date.now() - startTime;
                console.log(`[ZNinja Runner] Process execution finished in ${timeMs}ms`);
                
                // Cleanup temp run subdirectory
                try {
                    if (fs.existsSync(runDir)) {
                        fs.rmSync(runDir, { recursive: true, force: true });
                        console.log(`[ZNinja Runner] Cleaned run directory recursively: ${runDir}`);
                    }
                } catch (cleanupErr) {
                    console.error("[ZNinja Runner] Cleanup error:", cleanupErr);
                }

                console.log(`[ZNinja Runner] stdout length: ${stdout ? stdout.length : 0} chars`);
                console.log(`[ZNinja Runner] stderr length: ${stderr ? stderr.length : 0} chars`);

                if (stdout) console.log(`[ZNinja Runner] --- Raw stdout ---\n${stdout}\n-----------------------`);
                if (stderr) console.error(`[ZNinja Runner] --- Raw stderr ---\n${stderr}\n-----------------------`);

                if (error) {
                    const isTimeout = error.killed || error.signal === 'SIGTERM';
                    console.error(`[ZNinja Runner] Execution failed. Error: ${error.message}`);
                    resolve({
                        success: false,
                        stdout: stdout || '',
                        stderr: isTimeout ? 'Execution Timed Out (Limit: 5 seconds)' : (stderr || error.message),
                        timeMs,
                        errorType: isTimeout ? 'timeout' : 'runtime'
                    });
                } else {
                    console.log(`[ZNinja Runner] Execution completed with success.`);
                    resolve({
                        success: true,
                        stdout: stdout || '',
                        stderr: stderr || '',
                        timeMs
                    });
                }
                console.log(`==================================================\n`);
            });
        });
    });

    // Ghost Typing
    let ghostTypingInterval = null;
    ipcMain.handle('set-ghost-typing', (event, active) => {
        if (active && !ghostTypingInterval) {
            const keyStates = new Array(256).fill(false);
            const keyCounters = new Array(256).fill(0);

            ghostTypingInterval = setInterval(() => {
                // Monitor A-Z (0x41-0x5A), 0-9 (0x30-0x39), Space (0x20), Backspace (0x08), Enter (0x0D), Symbols
                const vKeys = [
                    0x08, 0x0D, 0x20,
                    ...Array.from({ length: 10 }, (_, i) => 0x30 + i),
                    ...Array.from({ length: 26 }, (_, i) => 0x41 + i),
                    0xBE, 0xBC, 0xBF, 0xBB, 0xBD,
                ];

                vKeys.forEach(vKey => {
                    const state = native.getAsyncKeyState(vKey);
                    const isPressed = (state & 0x8000) !== 0;

                    if (isPressed) {
                        if (!keyStates[vKey]) {
                            // Initial Press
                            keyStates[vKey] = true;
                            keyCounters[vKey] = 0;
                            win.webContents.send('ghost-key', {
                                vKey,
                                text: native.vKeyToChar(vKey, native.getAsyncKeyState(0x10) !== 0)
                            });
                        } else {
                            // Key Held Down - Repeat Logic
                            keyCounters[vKey]++;
                            // Initial delay: 15 ticks * 30ms = 450ms, Repeat: 2 ticks = 60ms
                            if (keyCounters[vKey] > 15 && (keyCounters[vKey] - 15) % 2 === 0) {
                                win.webContents.send('ghost-key', {
                                    vKey,
                                    text: native.vKeyToChar(vKey, native.getAsyncKeyState(0x10) !== 0)
                                });
                            }
                        }
                    } else {
                        keyStates[vKey] = false;
                        keyCounters[vKey] = 0;
                    }
                });
            }, 30);
        } else if (!active && ghostTypingInterval) {
            clearInterval(ghostTypingInterval);
            ghostTypingInterval = null;
        }
        return true;
    });

    return win;
}

app.setName('Service Host: Runtime');

app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock.hide();
    
    // Shortcuts
    app.on('will-quit', () => globalShortcut.unregisterAll());

    const win = createWindow();

    // Clipboard Loop
    let lastClipboardText = '';
    setInterval(() => {
        const currentText = clipboard.readText();
        if (currentText && currentText !== lastClipboardText) {
            lastClipboardText = currentText;
            win.webContents.send('clipboard-update', currentText);
        }
    }, 1000);

    // Global Shortcuts
    globalShortcut.register('CommandOrControl+]', () => {
        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
            win.setSkipTaskbar(true);
            win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            win.setAlwaysOnTop(true, 'screen-saver');
            if (win.isFocusable()) win.focus();
        }
    });

    globalShortcut.register('CommandOrControl+L', () => {
        const nextFocusable = !win.isFocusable();
        win.setFocusable(nextFocusable);
        win.setAlwaysOnTop(true, 'screen-saver');
        win.webContents.send('focus-changed', !nextFocusable);
    });

    globalShortcut.register('CommandOrControl+I', () => {
        win.webContents.send('instant-ai');
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
