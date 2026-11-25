if (process.platform === 'win32') {
    module.exports = require('./win/native.cjs');
} else if (process.platform === 'darwin') {
    module.exports = require('./mac/native.cjs');
} else {
    // Fallback stub for linux/unsupported
    module.exports = {
        toggleStealthMode: () => false,
        vKeyToChar: () => '',
        getAsyncKeyState: () => 0,
        startGhostTyping: () => false,
        stopGhostTyping: () => true,
        getCodeRunCommand: (lang, fileName) => {
            if (lang === 'python' || lang === 'py') {
                return { fileExt: 'py', compileCmd: '', runCmd: `python3 ${fileName}.py < input.txt` };
            }
            if (lang === 'cpp' || lang === 'c++') {
                return { fileExt: 'cpp', compileCmd: `g++ -O3 ${fileName}.cpp -o ${fileName}`, runCmd: `./${fileName} < input.txt` };
            }
            return null;
        },
        checkPermissions: () => ({ screen: true, microphone: true, accessibility: true }),
        requestMicPermission: async () => true
    };
}
