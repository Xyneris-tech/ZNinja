if (process.platform === 'win32') {
    module.exports = require('./win/native.cjs');
} else if (process.platform === 'darwin') {
    module.exports = require('./mac/native.cjs');
} else {
    // Fallback stub for linux/unsupported
    module.exports = {
        toggleStealthMode: () => false,
        vKeyToChar: () => '',
        getAsyncKeyState: () => 0
    };
}
