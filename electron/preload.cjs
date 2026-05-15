const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    toggleStealth: (shouldEnable) => ipcRenderer.invoke('toggle-stealth', shouldEnable),
    listModels: () => ipcRenderer.invoke('list-models'),
    askGemini: (data) => ipcRenderer.invoke('ask-gemini', data),
    streamGemini: (data) => ipcRenderer.send('stream-gemini', data),
    onGeminiChunk: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('gemini-chunk', subscription);
        return () => ipcRenderer.removeListener('gemini-chunk', subscription);
    },
    onGeminiDone: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('gemini-done', subscription);
        return () => ipcRenderer.removeListener('gemini-done', subscription);
    },
    onGeminiError: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('gemini-error', subscription);
        return () => ipcRenderer.removeListener('gemini-error', subscription);
    },
    getSessions: () => ipcRenderer.invoke('get-sessions'),
    saveSession: (session) => ipcRenderer.invoke('save-session', session),
    deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),
    clearAllSessions: () => ipcRenderer.invoke('clear-all-sessions'),
    captureScreen: () => ipcRenderer.invoke('capture-screen'),
    getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    minimize: () => ipcRenderer.send('minimize-app'),
    closeApp: () => ipcRenderer.send('close-app'),
    getApiKey: () => ipcRenderer.invoke('get-api-key'),
    getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
    saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
    getRole: () => ipcRenderer.invoke('get-role'),
    clearApiKey: () => ipcRenderer.invoke('clear-api-key'),
    setFocusable: (focusable) => ipcRenderer.invoke('set-focusable', focusable),
    onFocusChange: (callback) => {
        const subscription = (event, value) => callback(value);
        ipcRenderer.on('focus-changed', subscription);
        return () => ipcRenderer.removeListener('focus-changed', subscription);
    },
    onInstantAI: (callback) => {
        const subscription = () => callback();
        ipcRenderer.on('instant-ai', subscription);
        return () => ipcRenderer.removeListener('instant-ai', subscription);
    },
    onClipboardUpdate: (callback) => {
        const subscription = (event, text) => callback(text);
        ipcRenderer.on('clipboard-update', subscription);
        return () => ipcRenderer.removeListener('clipboard-update', subscription);
    },
    setGhostTyping: (active) => ipcRenderer.invoke('set-ghost-typing', active),
    onGhostKey: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('ghost-key', subscription);
        return () => ipcRenderer.removeListener('ghost-key', subscription);
    },
    resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
    getWindowSize: () => ipcRenderer.invoke('get-window-size'),
});
