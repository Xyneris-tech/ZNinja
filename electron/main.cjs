const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');
const koffi = require('koffi');

// --- Native Bindings ---
let SetWindowDisplayAffinity;
let GetLastError;

try {
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');

    // SetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity)
    // HWND is a pointer-sized integer.
    SetWindowDisplayAffinity = user32.func('__stdcall', 'SetWindowDisplayAffinity', 'bool', ['size_t', 'uint32']);

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

// --- Gemini Setup ---
// In a real app, use process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI);
// Model initialized dynamically in handler

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 400,
        frame: false, // Frameless for custom UI
        transparent: true, // Transparent background
        title: 'Service Host Runtime',
        alwaysOnTop: true, // Keep it visible to user
        hasShadow: false,
        icon: path.join(__dirname, '../resources/icon.png'),
        skipTaskbar: false, // Start hidden from taskbar
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'), // Updated to points to .cjs
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load Vite dev server or build
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
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
            console.log(`Setting Skip Taskbar to: ${shouldEnable}`);
            win.setSkipTaskbar(shouldEnable);

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
        win.minimize();
    });

    ipcMain.on('close-app', () => {
        app.quit();
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

    const { globalShortcut } = require('electron');

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    const win = createWindow();

    globalShortcut.register('CommandOrControl+]', () => {
        if (win.isMinimized()) {
            win.restore();
            win.focus();
        } else {
            win.minimize();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
