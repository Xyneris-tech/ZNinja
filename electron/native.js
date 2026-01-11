const koffi = require('koffi');
const os = require('os');

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

function toggleStealthMode(win, shouldEnable) {
    if (!SetWindowDisplayAffinity) {
        console.warn('Stealth mode not supported: function not bound.');
        return false;
    }

    try {
        console.log(`Ensuring Skip Taskbar remains active during stealth toggle`);
        win.setSkipTaskbar(true);

        const hwndBuf = win.getNativeWindowHandle();

        // Electron returns a Buffer. We need the memory address (pointer value) stored INSIDE that buffer.
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
}

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

function getAsyncKeyState(vKey) {
    if (!GetAsyncKeyState) return 0;
    return GetAsyncKeyState(vKey);
}

module.exports = {
    toggleStealthMode,
    vKeyToChar,
    getAsyncKeyState
};
