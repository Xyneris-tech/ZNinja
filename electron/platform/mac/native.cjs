const { systemPreferences } = require('electron');
const koffi = require('koffi');

const kCGEventSourceStateCombinedSessionState = 1;
const kVK_Shift = 0x38;
const kVK_RightShift = 0x3C;

let CGEventSourceKeyState = null;
try {
    const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics');
    CGEventSourceKeyState = cg.func('CGEventSourceKeyState', 'bool', ['int32', 'uint16']);
} catch (e) {
    console.error('Failed to load CoreGraphics for macOS native hooks:', e);
}

// Map macOS ANSI CGKeyCode -> [unshifted, shifted]
const MAC_KEY_MAP = {
    0x00: ['a', 'A'], 0x0B: ['b', 'B'], 0x08: ['c', 'C'], 0x02: ['d', 'D'],
    0x0E: ['e', 'E'], 0x03: ['f', 'F'], 0x05: ['g', 'G'], 0x04: ['h', 'H'],
    0x22: ['i', 'I'], 0x26: ['j', 'J'], 0x28: ['k', 'K'], 0x25: ['l', 'L'],
    0x2E: ['m', 'M'], 0x2D: ['n', 'N'], 0x1F: ['o', 'O'], 0x23: ['p', 'P'],
    0x0C: ['q', 'Q'], 0x0F: ['r', 'R'], 0x01: ['s', 'S'], 0x11: ['t', 'T'],
    0x20: ['u', 'U'], 0x09: ['v', 'V'], 0x0D: ['w', 'W'], 0x07: ['x', 'X'],
    0x10: ['y', 'Y'], 0x06: ['z', 'Z'],
    0x1D: ['0', ')'], 0x12: ['1', '!'], 0x13: ['2', '@'], 0x14: ['3', '#'],
    0x15: ['4', '$'], 0x17: ['5', '%'], 0x16: ['6', '^'], 0x1A: ['7', '&'],
    0x1C: ['8', '*'], 0x19: ['9', '('],
    0x31: [' ', ' '],
    0x33: ['BACKSPACE', 'BACKSPACE'],
    0x24: ['ENTER', 'ENTER'],
    0x4C: ['ENTER', 'ENTER'],
    0x2F: ['.', '>'],
    0x2B: [',', '<'],
    0x2C: ['/', '?'],
    0x18: ['=', '+'],
    0x1B: ['-', '_'],
};

const MONITORED_KEYS = Object.keys(MAC_KEY_MAP).map(Number);

function toggleStealthMode(win, shouldEnable) {
    try {
        if (win && win.setContentProtection) {
            win.setContentProtection(shouldEnable);
            console.log(`macOS Stealth Mode ${shouldEnable ? 'enabled' : 'disabled'}`);
            return true;
        }
        return false;
    } catch (e) {
        console.error('macOS toggle-stealth error:', e);
        return false;
    }
}

function vKeyToChar(keyCode, shift) {
    const entry = MAC_KEY_MAP[keyCode];
    if (!entry) return '';
    return shift ? entry[1] : entry[0];
}

function getAsyncKeyState(keyCode) {
    if (!CGEventSourceKeyState) return 0;
    return CGEventSourceKeyState(kCGEventSourceStateCombinedSessionState, keyCode) ? 0x8000 : 0;
}

let ghostTypingInterval = null;

function startGhostTyping(onKey) {
    if (ghostTypingInterval) return true;
    if (!CGEventSourceKeyState) {
        console.warn('macOS Ghost Typing unavailable: CoreGraphics not loaded.');
        return false;
    }

    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    if (!trusted) {
        console.warn('macOS Accessibility permission not granted yet; prompted user.');
    }

    const keyStates = new Map();
    const keyCounters = new Map();

    ghostTypingInterval = setInterval(() => {
        const shift = Boolean(
            CGEventSourceKeyState(kCGEventSourceStateCombinedSessionState, kVK_Shift) ||
            CGEventSourceKeyState(kCGEventSourceStateCombinedSessionState, kVK_RightShift)
        );

        for (const keyCode of MONITORED_KEYS) {
            const isPressed = Boolean(CGEventSourceKeyState(kCGEventSourceStateCombinedSessionState, keyCode));
            if (isPressed) {
                if (!keyStates.get(keyCode)) {
                    keyStates.set(keyCode, true);
                    keyCounters.set(keyCode, 0);
                    onKey({ vKey: keyCode, text: vKeyToChar(keyCode, shift) });
                } else {
                    const count = (keyCounters.get(keyCode) || 0) + 1;
                    keyCounters.set(keyCode, count);
                    if (count > 15 && (count - 15) % 2 === 0) {
                        onKey({ vKey: keyCode, text: vKeyToChar(keyCode, shift) });
                    }
                }
            } else {
                keyStates.set(keyCode, false);
                keyCounters.set(keyCode, 0);
            }
        }
    }, 30);

    return true;
}

function stopGhostTyping() {
    if (ghostTypingInterval) {
        clearInterval(ghostTypingInterval);
        ghostTypingInterval = null;
    }
    return true;
}

function getCodeRunCommand(lang, fileName) {
    if (lang === 'python' || lang === 'py') {
        return {
            fileExt: 'py',
            compileCmd: '',
            runCmd: `python3 ${fileName}.py < input.txt`
        };
    }
    if (lang === 'cpp' || lang === 'c++') {
        return {
            fileExt: 'cpp',
            compileCmd: `g++ -O3 ${fileName}.cpp -o ${fileName}`,
            runCmd: `./${fileName} < input.txt`
        };
    }
    return null;
}

function checkPermissions() {
    return {
        screen: systemPreferences.getMediaAccessStatus('screen') === 'granted',
        microphone: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
        accessibility: systemPreferences.isTrustedAccessibilityClient(false)
    };
}

async function requestMicPermission() {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status === 'granted') return true;
    return systemPreferences.askForMediaAccess('microphone');
}

module.exports = {
    toggleStealthMode,
    vKeyToChar,
    getAsyncKeyState,
    startGhostTyping,
    stopGhostTyping,
    getCodeRunCommand,
    checkPermissions,
    requestMicPermission
};
