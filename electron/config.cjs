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
                let foundInconsistency = false;
                keys = keys.map(k => {
                    try {
                        const decrypted = safeStorage.decryptString(Buffer.from(k, 'base64'));
                        return decrypted;
                    } catch (e) {
                        // If decryption fails, it's likely a plain text key.
                        // We mark this so we can auto-repair the config file flag later.
                        foundInconsistency = true;
                        return k; 
                    }
                });

                // Auto-Repair: If we had to fall back to plain text for any key,
                // update the config flag so we don't keep trying to decrypt in the future.
                if (foundInconsistency) {
                    data.isEncrypted = false;
                    try {
                        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
                    } catch (err) {
                        // Ignore write errors during auto-repair
                    }
                }
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
            }
            if (current.apiKeys) {
                delete current.apiKeys;
            }
            if (current.availableModels) {
                delete current.availableModels;
            }
            if (current.apiErrorType) {
                delete current.apiErrorType;
            }
            fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
        }
        return true;
    } catch (e) {
        console.error("Error clearing config:", e);
        return false;
    }
}

function getAvailableModels() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return {
                models: data.availableModels || null,
                apiErrorType: data.apiErrorType || null
            };
        }
    } catch (e) {
        console.error("Error reading available models:", e);
    }
    return null;
}

function saveAvailableModels(models, apiErrorType = null) {
    try {
        let current = {};
        if (fs.existsSync(configPath)) {
            current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        current.availableModels = models;
        current.apiErrorType = apiErrorType;
        fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
        return true;
    } catch (e) {
        console.error("Error saving available models:", e);
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
    return `You are ZNinja, an elite, ultra-efficient AI system prompt engineer and senior software engineer.

**General Guidelines:**
1. **Directness & Precision:** Answer the query immediately and directly. Never use conversational filler, introductory greetings, or concluding pleasantries (e.g., "Sure, I can help with that", "Here is the code:", "Hope this helps!").
2. **Zero Deliberation Narration:** Do not narrate your thoughts, internal process, or step-by-step reasoning unless explicitly requested. Provide only the final, complete, production-grade output.
3. **No Placeholders:** Always output complete, fully-functional, ready-to-run solutions. Never use placeholders, truncated blocks, or comments like "// TODO" or "// ... rest of implementation".

**Coding & Algorithm Guidelines:**
1. **Self-Documenting Code:** Write exceptionally clean, idiomatic, and highly readable code. Do NOT add unnecessary, obvious, or redundant comments. Default to writing zero comments. If a complex algorithm trick is used, use at most one concise, single-line comment.
2. **First-Ask Completeness:** Deliver fully realized code including imports, thorough edge-case handling, and boundary guarding.
3. **Efficiency:** Always optimize for the best possible Time and Space complexity.`;
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
    getAvailableModels,
    saveAvailableModels,
    getSystemInstruction,
    getSessions,
    saveSessions,
    upsertSession,
    deleteSession
};
