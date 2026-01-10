const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');
const koffi = require('koffi');

// --- Native Bindings ---
let SetWindowDisplayAffinity;
let GetLastError;
let GetAsyncKeyState;

try {
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');

    // SetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity)
    SetWindowDisplayAffinity = user32.func('__stdcall', 'SetWindowDisplayAffinity', 'bool', ['size_t', 'uint32']);

    // GetAsyncKeyState(int vKey)
    GetAsyncKeyState = user32.func('__stdcall', 'GetAsyncKeyState', 'int16', ['int32']);

    // GetLastError()
    GetLastError = kernel32.func('__stdcall', 'GetLastError', 'uint32', []);
} catch (e) {
    console.error('Failed to load native libraries:', e);
}

const WDA_NONE = 0x00000000;
const WDA_MONITOR = 0x00000001;
const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

// --- Environment Setup ---
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Look in project root
if (!process.env.VITE_GEMINI) {
    // Fallback to parent dir if running in a monorepo-like structure
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// --- Config Management ---
const configPath = path.join(app.getPath('userData'), 'config.json');

function getApiKey() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (data.apiKey) return data.apiKey;
        }
    } catch (e) {
        console.error("Error reading config:", e);
    }
    return process.env.VITE_GEMINI || null;
}

function saveApiKey(key) {
    try {
        let current = {};
        if (fs.existsSync(configPath)) {
            current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        current.apiKey = key;
        fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
        return true;
    } catch (e) {
        console.error("Error saving config:", e);
        return false;

    }
}

function clearApiKey() {
    try {
        if (fs.existsSync(configPath)) {
            const current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (current.apiKey) {
                delete current.apiKey;
                fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
            }
        }
        return true;
    } catch (e) {
        console.error("Error clearing config:", e);
        return false;
    }
}


// --- Gemini Setup ---
// Helper to get authorized client
function getGenAI() {
    const key = getApiKey();
    if (!key) throw new Error("API Key not found");
    return new GoogleGenerativeAI(key);
}
// Model initialized dynamically in handler

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
        height: 400,
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
            preload: path.join(__dirname, 'preload.cjs'), // Updated to points to .cjs
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
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        console.log('Loading file from:', indexPath);
        win.loadFile(indexPath);
        // win.webContents.openDevTools();
    }

    // --- IPC Handlers ---

    // --- IPC Handlers ---

    // Dynamic model handling
    // Dynamic model handling - NOW FETCHES REAL MODELS
    ipcMain.handle('list-models', async () => {
        try {
            // Use the SDK to fetch what your API key is actually allowed to see
            // Note: If genAI.listModels is not available in the current SDK version, this will throw
            // and act as a fallback to the catch block, which is the desired behavior for now.
            let models = [];
            // Attempt to list models if the method exists, otherwise simulate error or implement alternative
            const genAI = getGenAI();
            if (typeof genAI.listModels === 'function') {
                const result = await genAI.listModels();
                models = result.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
            } else {
                throw new Error("genAI.listModels is not a function");
            }

            return { success: true, models };
        } catch (error) {
            console.error('List Models Error:', error);
            // Fallback to the most likely free tier names if the fetch fails
            return { success: true, models: ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-1.5-flash-002", "gemini-1.5-flash"] };
        }
    });

    ipcMain.handle('ask-gemini', async (event, { prompt, modelName, image }) => {
        // List of models to try in order of preference
        // 2026 Update: Prioritize newer flash models, fall back to older ones
        const modelFallbacks = [
            modelName,
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash"
        ].filter((v, i, a) => v && a.indexOf(v) === i); // Remove duplicates and nulls

        for (const modelId of modelFallbacks) {
            if (!modelId) continue;
            try {
                console.log(`Attempting Gemini (${modelId})...`);
                const genAI = getGenAI();
                const model = genAI.getGenerativeModel({ model: modelId });

                let contentParts = [prompt];
                if (image) {
                    // Expecting image as "data:image/png;base64,..."
                    const base64Data = image.split(',')[1];
                    contentParts = [
                        prompt,
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: "image/png"
                            }
                        }
                    ];
                }

                const result = await model.generateContent(contentParts);
                const response = await result.response;
                const text = response.text();
                // Return success immediately if one works
                return { success: true, text, usedModel: modelId };
            } catch (error) {
                // If 404 Not Found, Log and Continue
                if (error.message.includes('404') || error.message.includes('not found')) {
                    console.warn(`${modelId} failed with 404, trying next...`);
                    continue;
                }

                // If it's a different error (like quota or safety), log it. 
                // We might still want to try others if it's a specific model issue, 
                // but usually other errors are blocking. 
                // For now, let's treat 429 (Resource Exhausted) as a reason to maybe try a different tier model if available,
                // but simpler to just return error for non-404s.
                console.error(`Error with ${modelId}:`, error.message);
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: "All available models returned 404. Please check your API key permissions and region." };
    });

    ipcMain.handle('capture-screen', async () => {
        try {
            // Get screen sources. primary display is usually enough.
            // fetching a slightly larger thumbnail to ensure quality, though desktops can be huge.
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1920, height: 1080 }
            });

            // Just grab the first screen for now (Primary)
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

    ipcMain.handle('toggle-stealth', (event, shouldEnable) => {
        if (!SetWindowDisplayAffinity) {
            console.warn('Stealth mode not supported: function not bound.');
            return false;
        }

        try {
            console.log(`Ensuring Skip Taskbar remains active during stealth toggle`);
            win.setSkipTaskbar(true);

            const hwndBuf = win.getNativeWindowHandle();

            // Electron returns a Buffer. We need the memory address (pointer value) stored INSIDE that buffer.
            // On 64-bit systems, HWND is 8 bytes. On 32-bit, 4 bytes.
            let hwnd;
            if (os.endianness() === 'LE') {
                hwnd = hwndBuf.readBigUInt64LE(0);
            } else {
                hwnd = hwndBuf.readBigUInt64BE(0);
            }

            // Try both WDA_EXCLUDEFROMCAPTURE (preferred) and WDA_MONITOR (fallback)
            const targetAffinity = shouldEnable ? WDA_EXCLUDEFROMCAPTURE : WDA_NONE;

            console.log(`Toggling Stealth. HWND Buffer:`, hwndBuf);
            console.log(`Decoded HWND Value:`, hwnd);

            let success = SetWindowDisplayAffinity(hwnd, targetAffinity);

            if (!success && shouldEnable) {
                if (GetLastError) {
                    const err = GetLastError();
                    console.warn(`Initial affinity (0x11) failed with error: ${err}. Trying WDA_MONITOR (0x1)...`);
                } else {
                    console.warn(`Initial affinity (0x11) failed. GetLastError not bound. Trying WDA_MONITOR (0x1)...`);
                }

                success = SetWindowDisplayAffinity(hwnd, WDA_MONITOR);
                if (!success) {
                    if (GetLastError) {
                        const err2 = GetLastError();
                        console.error(`Fallback affinity (0x1) failed with error: ${err2}`);
                    } else {
                        console.error(`Fallback affinity (0x1) failed. GetLastError not bound.`);
                    }
                } else {
                    console.log('Success with fallback WDA_MONITOR!');
                }
            } else if (success) {
                console.log(`Success with affinity 0x${targetAffinity.toString(16)}`);
            }

            return success;
        } catch (error) {
            console.error('Exception in toggle-stealth:', error);
            return false;
        }
    });

    ipcMain.on('minimize-app', () => {
        win.hide();
    });

    ipcMain.on('close-app', () => {
        app.quit();
    });

    ipcMain.on('resize-window', (event, { width, height }) => {
        // Enforce a sensible minimum to prevent invisibility
        const w = Math.max(Math.floor(width), 200);
        const h = Math.max(Math.floor(height), 150);

        // State Toggle strategy: temporarily enable resizability to allow shrinking
        // This won't trigger the cursor because it's too fast and only happens during programmatic drag
        win.setResizable(true);
        win.setSize(w, h);
        win.setResizable(false);
    });

    ipcMain.handle('get-window-size', () => {
        const [width, height] = win.getSize();
        return { width, height };
    });

    return win;
}

app.setName('Service Host Runtime');

app.whenReady().then(() => {
    const fs = require('fs');

    // ... existing code ...

    // --- Session Handlers ---
    const sessionsPath = path.join(app.getPath('userData'), 'chat-sessions.json');

    function getSessions() {
        try {
            if (!fs.existsSync(sessionsPath)) return [];
            const data = fs.readFileSync(sessionsPath, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to load sessions:', e);
            return [];
        }
    }

    function saveSessions(sessions) {
        try {
            fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
            return true;
        } catch (e) {
            console.error('Failed to save sessions:', e);
            return false;
        }
    }

    ipcMain.handle('get-sessions', async () => {
        return getSessions();
    });

    ipcMain.handle('save-session', async (event, session) => {
        const sessions = getSessions();
        const index = sessions.findIndex(s => s.id === session.id);

        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.unshift(session); // Add new to top
        }

        return saveSessions(sessions);
    });

    ipcMain.handle('delete-session', async (event, sessionId) => {
        let sessions = getSessions();
        sessions = sessions.filter(s => s.id !== sessionId);
        return saveSessions(sessions);
    });

    ipcMain.handle('clear-all-sessions', async () => {
        return saveSessions([]);
    });

    ipcMain.handle('set-focusable', (event, focusable) => {
        win.setFocusable(focusable);
        // Re-assert level when focus state changes
        win.setAlwaysOnTop(true, 'screen-saver');
        return true;
    });

    ipcMain.handle('get-api-key', () => getApiKey());
    ipcMain.handle('save-api-key', (event, key) => saveApiKey(key));
    ipcMain.handle('clear-api-key', () => clearApiKey());

    const { globalShortcut } = require('electron');

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    const win = createWindow();

    // Clipboard Monitoring Loop
    const { clipboard } = require('electron');
    let lastClipboardText = '';
    setInterval(() => {
        const currentText = clipboard.readText();
        if (currentText && currentText !== lastClipboardText) {
            lastClipboardText = currentText;
            win.webContents.send('clipboard-update', currentText);
        }
    }, 1000); // Check every second

    // Ghost Typing Monitoring
    let ghostTypingInterval = null;
    ipcMain.handle('set-ghost-typing', (event, active) => {
        if (active && !ghostTypingInterval) {
            const keyStates = new Array(256).fill(false);
            ghostTypingInterval = setInterval(() => {
                if (!GetAsyncKeyState) return;

                // Monitor A-Z (0x41-0x5A), 0-9 (0x30-0x39), Space (0x20), Backspace (0x08), Enter (0x0D)
                const vKeys = [
                    0x08, 0x0D, 0x20, // Backspace, Enter, Space
                    ...Array.from({ length: 10 }, (_, i) => 0x30 + i), // 0-9
                    ...Array.from({ length: 26 }, (_, i) => 0x41 + i), // A-Z
                    0xBE, 0xBC, 0xBF, 0xBB, 0xBD, // . , / = -
                ];

                vKeys.forEach(vKey => {
                    const state = GetAsyncKeyState(vKey);
                    const isPressed = (state & 0x8000) !== 0;

                    if (isPressed && !keyStates[vKey]) {
                        keyStates[vKey] = true;
                        win.webContents.send('ghost-key', { vKey, text: vKeyToChar(vKey, GetAsyncKeyState(0x10) !== 0) });
                    } else if (!isPressed) {
                        keyStates[vKey] = false;
                    }
                });
            }, 30); // 30ms for responsive feeling
        } else if (!active && ghostTypingInterval) {
            clearInterval(ghostTypingInterval);
            ghostTypingInterval = null;
        }
        return true;
    });

    function vKeyToChar(vKey, shift) {
        if (vKey >= 0x41 && vKey <= 0x5A) return shift ? String.fromCharCode(vKey) : String.fromCharCode(vKey).toLowerCase();
        if (vKey >= 0x30 && vKey <= 0x39) {
            const symbols = [')', '!', '@', '#', '$', '%', '^', '&', '*', '('];
            return shift ? symbols[vKey - 0x30] : String.fromCharCode(vKey);
        }
        if (vKey === 0x20) return ' ';
        if (vKey === 0x08) return 'BACKSPACE';
        if (vKey === 0x0D) return 'ENTER';
        if (vKey === 0xBE) return shift ? '>' : '.';
        if (vKey === 0xBC) return shift ? '<' : ',';
        if (vKey === 0xBF) return shift ? '?' : '/';
        if (vKey === 0xBB) return shift ? '+' : '=';
        if (vKey === 0xBD) return shift ? '_' : '-';
        return '';
    }

    globalShortcut.register('CommandOrControl+]', () => {
        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
            win.setSkipTaskbar(true);
            // Re-assert visibility and level when showing
            win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            win.setAlwaysOnTop(true, 'screen-saver');

            // ONLY focus if the window is focusable (Ghost Mode is OFF)
            if (win.isFocusable()) {
                win.focus();
            }
        }
    });

    globalShortcut.register('CommandOrControl+L', () => {
        const nextFocusable = !win.isFocusable();
        win.setFocusable(nextFocusable);
        // Re-assert level when toggling ghost mode
        win.setAlwaysOnTop(true, 'screen-saver');
        // We send 'locked' state to UI. Locked is TRUE if focusable is FALSE.
        win.webContents.send('focus-changed', !nextFocusable);
    });

    globalShortcut.register('CommandOrControl+I', () => {
        // Trigger Instant AI (Capture + Send)
        win.webContents.send('instant-ai');
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
