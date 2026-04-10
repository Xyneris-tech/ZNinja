const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

// --- Config Management ---
const configPath = path.join(app.getPath('userData'), 'config.json');
const sessionsPath = path.join(app.getPath('userData'), 'chat-sessions.json');

// --- API Key & Persona ---
function getApiKeys() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            let keys = [];

            if (data.apiKeys && Array.isArray(data.apiKeys)) {
                keys = data.apiKeys;
            } else if (data.apiKey) {
                keys = [data.apiKey]; // Old format fallback
            }

            // Handle Decryption if flag is set
            if (data.isEncrypted && keys.length > 0 && safeStorage.isEncryptionAvailable()) {
                keys = keys.map(k => {
                    try {
                        // safeStorage.decryptString expects a Buffer
                        return safeStorage.decryptString(Buffer.from(k, 'base64'));
                    } catch (e) {
                        console.error("Decryption failed for a key:", e);
                        return k; // Return as is if decryption fails (might be plain text already)
                    }
                });
            }
            return keys;
        }
    } catch (e) {
        console.error("Error reading config:", e);
    }
    const envKey = process.env.VITE_GEMINI;
    return envKey ? [envKey] : [];
}

function getApiKey() {
    const keys = getApiKeys();
    return keys.length > 0 ? keys[0] : null;
}

function saveApiKey(payload) {
    try {
        let current = {};
        if (fs.existsSync(configPath)) {
            current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        let keysToSave = [];
        let shouldEncrypt = false;

        // Support saving both key(s) and role
        if (typeof payload === 'object' && !Array.isArray(payload)) {
            if (payload.keys && Array.isArray(payload.keys)) {
                keysToSave = payload.keys.filter(k => k && k.trim());
            } else if (payload.key) {
                keysToSave = [payload.key];
            }
            if (payload.role) current.systemInstruction = payload.role;
            if (payload.encrypted !== undefined) shouldEncrypt = payload.encrypted;
        } else if (Array.isArray(payload)) {
            keysToSave = payload.filter(k => k && k.trim());
        } else {
            keysToSave = [payload];
        }

        current.isEncrypted = shouldEncrypt;

        if (shouldEncrypt && safeStorage.isEncryptionAvailable()) {
            current.apiKeys = keysToSave.map(k => {
                const encryptedBuffer = safeStorage.encryptString(k);
                return encryptedBuffer.toString('base64');
            });
        } else {
            current.apiKeys = keysToSave;
        }

        // Backward compatibility
        if (current.apiKeys.length > 0) current.apiKey = current.apiKeys[0];

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

function getSystemInstruction() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (data.systemInstruction) return data.systemInstruction;
        }
    } catch (e) {
        console.error("Error reading config for role:", e);
    }
    // Default Fallback
    return `**Role:** ZNinja, Elite Senior Software Engineer.
**Goal:** Deliver precise, high-performance, bug-free code.

**Protocol (Zero-Hallucination Mode):**
1. **Independent Analysis:** Ignore any similar-sounding problems from your training data. Solve the specific problem provided in the text from first principles.
2. **Structural Check:** Identify if the task requires processing "Subarrays" (any contiguous segment) or "Prefixes" (segments starting at index 0). These are not interchangeable.
3. **Complexity Matching:** Explicitly check the constraint (N).
   - N <= 500: Optimize for O(N²).
   - N > 10^5: Optimize for O(N) or O(N log N).
4. **Variable Fidelity:** You MUST use the exact variable names provided .
5. **Logic Verification:** Mentally "dry-run" the logic with Example 1 before outputting code. Ensure the count matches the example exactly.

**Output Structure:**
- [Logic Summary]: 1 sentence.
- [The Code]: Concise, idiomatic, and clean.
- [Complexity]: Time and Space Big O.`;
}

// --- Chat Sessions ---
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

function upsertSession(session) {
    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === session.id);

    if (index >= 0) {
        sessions[index] = session;
    } else {
        sessions.unshift(session); // Add new to top
    }

    return saveSessions(sessions);
}

function deleteSession(sessionId) {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    return saveSessions(sessions);
}

module.exports = {
    getApiKey,
    getApiKeys,
    saveApiKey,
    clearApiKey,
    getSystemInstruction,
    getSessions,
    saveSessions,
    upsertSession,
    deleteSession
};
