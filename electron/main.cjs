const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, clipboard, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// --- Load Modules ---
const config = require('./config.cjs');
const native = require('./native.cjs');
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
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const win = new BrowserWindow({
        width: 600,
        height: initialHeight,
        frame: false, // Frameless for custom UI
        transparent: true, // Transparent background
        title: 'Service Host Runtime',
        alwaysOnTop: true, // Keep it visible to user
        resizable: false, // Prevent resize cursor 100% of the time
        type: 'utility', // Hides from Apps list in Task Manager
        show: false, // Start completely hidden
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
    ipcMain.handle('save-api-key', (_, data) => {
        const success = config.saveApiKey(data);
        if (success) {
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
    ipcMain.handle('list-models', async () => gemini.listModels());
    ipcMain.handle('ask-gemini', async (_, payload) => gemini.askGemini(payload));
    ipcMain.on('stream-gemini', async (event, payload) => {
        gemini.streamGemini(payload, {
            onChunk: (chunk) => win.webContents.send('gemini-chunk', { chunk }),
            onDone: (usedModel) => win.webContents.send('gemini-done', { usedModel }),
            onError: (error) => win.webContents.send('gemini-error', { error })
        });
    });

    // Native / Window
    ipcMain.handle('capture-screen', async () => {
        try {
            // Smaller size for faster processing, still high enough for OCR/Vision
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1280, height: 720 }
            });
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

app.setName('Service Host Runtime');

app.whenReady().then(() => {
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
