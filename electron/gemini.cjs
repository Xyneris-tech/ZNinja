const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { getApiKey, getApiKeys, getSystemInstruction } = require('./config.cjs');

// Helper to detect if key is Paid (Placeholder)
async function checkTierInternal() {
    // Current logic returns false (Free tier assumption or logic not fully implemented)
    return false;
}

// List Models
async function listModels() {
    try {
        let models = [];
        const apiKeys = getApiKeys();
        const apiKey = apiKeys.length > 0 ? apiKeys[0] : null;
        if (!apiKey) throw new Error("API Key not found");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            models = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } else {
            console.warn("REST API returned no models:", data);
        }

        return { success: true, models };
    } catch (error) {
        console.error('List Models Error:', error);
        // Fallback
        return {
            success: true, models: [
                "gemini-2.0-flash-thinking-exp",
                "gemini-3-flash",
                "gemini-2.5-flash",
                "gemini-1.5-pro",
                "gemini-1.5-pro-002",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
                "gemini-1.0-pro"
            ]
        };
    }
}

// Ask Gemini
async function askGemini({ prompt, modelName, images, image, audioData, history = [], workingMode }) {
    let smartFallbacks = [];
    const isPro = await checkTierInternal();

    // --- SMART ROUTER LOGIC ---
    if (modelName === 'zninja-auto-smart') {
        const lowerPrompt = prompt ? prompt.toLowerCase() : '';
        const codingKeywords = ['code', 'fix', 'api', 'o(n)', 'implementation', 'logic', 'algorithm'];
        const isComplex = image || audioData || codingKeywords.some(k => lowerPrompt.includes(k)) || (prompt && prompt.length > 300);

        if (isComplex) {
            console.log("ZNinja Router: Complex/Coding detected.");
            smartFallbacks = [
                "gemini-3-flash-preview",
                "gemini-3-pro-preview",
                "gemini-2.5-pro"
            ];
        } else {
            console.log("ZNinja Router: Simple Chat detected.");
            smartFallbacks = [
                "gemini-2.5-flash-lite",
                "gemini-3-flash-preview",
                "gemini-2.5-flash"
            ];
        }
        modelName = smartFallbacks[0];
    }

    const modelFallbacks = [
        ...smartFallbacks,
        modelName,
        "gemini-2.0-flash-thinking-exp",
        "gemini-3-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash"
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // --- SYSTEM INSTRUCTION LOGIC ---
    const MODE_INSTRUCTIONS = {
        'general': `You are ZNinja, a helpful and highly efficient assistant.
**Output Format (STRICT):**
- Direct answer first.
- Minimal explanation only if essential.
- No conversational fillers.`,

        'code': `You are a Senior Software Engineer.
**Goal:** Production-ready, optimal code.
**Preferences:** Default to Java or Python unless context dictates otherwise.
**Output Structure (STRICT):**
1. **Logic**: 1 sentence.
2. **Code**: Full, clean, and ready-to-paste.
3. **Complexity**: Time/Space O(n).`,

        'competitive': `You are ZNinja, an elite LeetCode/CP Solver.
**Goal:** Optimal algorithmic efficiency (O(N) focus).
**Preferences:** Use Java or Python (untill their is context of other langugae) class-based structure for LeetCode-style problems.
**Output Structure (STRICT):**
1. **Logic**: 1 concise sentence.
2. **Code**: Ready-to-paste solution ONLY.
3. **Complexity**: Time/Space Big O.
- NO theory, NO intro, NO outro, less comments.`,

        'quiz': `Expert Tutor.
**Goal:** Speed and Correctness.
**Output Format (STRICT):**
- Correct Option (e.g. 'Option A') followed by 1-sentence justification.
- NO extra text.`
    };

    const defaultSystemInstruction = getSystemInstruction();
    
    let systemInstruction = defaultSystemInstruction;
    if (audioData) {
        systemInstruction = "You are an expert executive secretary. Your goal is to create accurate, professional Minutes of Meeting from audio recordings. Output strictly the minutes, no code analysis or complexity metrics.";
    } else if (workingMode && MODE_INSTRUCTIONS[workingMode]) {
        systemInstruction = MODE_INSTRUCTIONS[workingMode];
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        return { success: false, error: "No API Keys configured. Please go to Setup." };
    }

    // --- EXECUTION LOOP (Models x Keys) ---
    for (const modelId of modelFallbacks) {
        if (!modelId) continue;
        
        for (let kIndex = 0; kIndex < apiKeys.length; kIndex++) {
            const currentKey = apiKeys[kIndex];
            
            try {
                console.log(`Attempting Gemini (${modelId}) with Key #${kIndex + 1}...`);
                const genAI = new GoogleGenerativeAI(currentKey);

                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemInstruction
                });

                let result;
                const allImages = images || (image ? [image] : []);

                if (audioData) {
                    // Audio Mode
                    const base64Data = audioData.split(',')[1];
                    const parts = audioData.split(';');
                    const mimeType = parts[0].split(':')[1] || 'audio/webm';

                    const textPrompt = prompt || `Prepare professional Minutes of Meeting from this audio.`;

                    const contentParts = [
                        { text: textPrompt },
                        { inlineData: { data: base64Data, mimeType: mimeType } }
                    ];

                    const genConfig = { maxOutputTokens: 65536 };
                    if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                        genConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                    }

                    result = await model.generateContent({
                        contents: [{ role: 'user', parts: contentParts }],
                        generationConfig: genConfig,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    });
                } else if (allImages.length > 0) {
                    // Vision Mode
                    let visionInstructions = "Analyze image directly.";
                    if (workingMode === 'competitive') visionInstructions = "Solve the CP problem in the image.";
                    else if (workingMode === 'quiz') visionInstructions = "Solve this quiz question.";

                    const visionPrompt = `[VISION ACTIVE] ${visionInstructions}\n${prompt || ""}`;
                    const visionParts = [{ text: visionPrompt }];
                    allImages.forEach(img => {
                        const mimeTypeMatch = img.match(/^data:(image\/[a-zA-Z]*);base64,/);
                        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
                        visionParts.push({ inlineData: { data: img.split(',')[1], mimeType: mimeType } });
                    });

                    const visionConfig = { maxOutputTokens: 65536 };
                    if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                        visionConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                    }

                    result = await model.generateContent({
                        contents: [{ role: 'user', parts: visionParts }],
                        generationConfig: visionConfig,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    });
                } else {
                    // Chat Mode
                    const genConfig = { maxOutputTokens: 65536 };
                    if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                        genConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                    }

                    const chat = model.startChat({
                        history: history,
                        generationConfig: genConfig,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    });

                    result = await chat.sendMessage(prompt || ".");
                }

                const response = await result.response;
                if (!response.candidates || response.candidates.length === 0) {
                    throw new Error("Response blocked by safety filters.");
                }
                
                const text = response.text();
                return { success: true, text, usedModel: modelId };

            } catch (error) {
                const errorMessage = error.message.toLowerCase();
                const isRetryableError = 
                    errorMessage.includes('429') || 
                    errorMessage.includes('quota') || 
                    errorMessage.includes('limit') ||
                    errorMessage.includes('404') || 
                    errorMessage.includes('not found') ||
                    errorMessage.includes('unavailable') || 
                    errorMessage.includes('overloaded') ||
                    errorMessage.includes('503');

                if (isRetryableError) {
                    console.warn(`Key #${kIndex + 1} failed for ${modelId} (${error.message}). Checking next key...`);
                    continue; // Try next API Key
                }
                
                // If not retryable, or last key failed, move to next model fallback
                console.error(`Fatal error for ${modelId} with Key #${kIndex + 1}:`, error.message);
                break; 
            }
        }
    }
    return { success: false, error: "All API Keys and model fallbacks exhausted. Please check your network or quota." };
}

// Stream Gemini
async function streamGemini({ prompt, modelName, images, image, history = [], workingMode }, callbacks) {
    let smartFallbacks = [];
    const isPro = await checkTierInternal();

    // --- SMART ROUTER LOGIC ---
    if (modelName === 'zninja-auto-smart') {
        const lowerPrompt = prompt ? prompt.toLowerCase() : '';
        const codingKeywords = ['code', 'fix', 'api', 'o(n)', 'implementation', 'logic', 'algorithm'];
        const isComplex = image || codingKeywords.some(k => lowerPrompt.includes(k)) || (prompt && prompt.length > 300);

        if (isComplex) {
            console.log("ZNinja Router: Complex/Coding detected.");
            smartFallbacks = [
                "gemini-3-flash-preview",
                "gemini-3-pro-preview",
                "gemini-2.5-pro"
            ];
        } else {
            console.log("ZNinja Router: Simple Chat detected.");
            smartFallbacks = [
                "gemini-2.5-flash-lite",
                "gemini-3-flash-preview",
                "gemini-2.5-flash"
            ];
        }
        modelName = smartFallbacks[0];
    }

    const modelFallbacks = [
        ...smartFallbacks,
        modelName,
        "gemini-2.0-flash-thinking-exp",
        "gemini-3-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash"
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // --- SYSTEM INSTRUCTION LOGIC ---
    const MODE_INSTRUCTIONS = {
        'general': `You are ZNinja, a helpful and highly efficient assistant.
**Output Format (STRICT):**
- Direct answer first.
- Minimal explanation only if essential.
- No conversational fillers.`,

        'code': `You are a Senior Software Engineer.
**Goal:** Production-ready, optimal code.
**Preferences:** Default to Java or Python unless context dictates otherwise.
**Output Structure (STRICT):**
1. **Logic**: 1 sentence.
2. **Code**: Full, clean, and ready-to-paste.
3. **Complexity**: Time/Space O(n).`,

        'competitive': `You are ZNinja, an elite LeetCode/CP Solver.
**Goal:** Optimal algorithmic efficiency (O(N) focus).
**Preferences:** Use Java or Python (untill their is context of other langugae) class-based structure for LeetCode-style problems.
**Output Structure (STRICT):**
1. **Logic**: 1 concise sentence.
2. **Code**: Ready-to-paste solution ONLY.
3. **Complexity**: Time/Space Big O.
- NO theory, NO intro, NO outro, less comments.`,

        'quiz': `Expert Tutor.
**Goal:** Speed and Correctness.
**Output Format (STRICT):**
- Correct Option (e.g. 'Option A') followed by 1-sentence justification.
- NO extra text.`
    };

    const defaultSystemInstruction = getSystemInstruction();
    
    let systemInstruction = defaultSystemInstruction;
    if (workingMode && MODE_INSTRUCTIONS[workingMode]) {
        systemInstruction = MODE_INSTRUCTIONS[workingMode];
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        if (callbacks.onError) callbacks.onError("No API Keys configured. Please go to Setup.");
        return;
    }

    // --- EXECUTION LOOP (Models x Keys) ---
    for (const modelId of modelFallbacks) {
        if (!modelId) continue;
        
        for (let kIndex = 0; kIndex < apiKeys.length; kIndex++) {
            const currentKey = apiKeys[kIndex];
            
            try {
                console.log(`Attempting Gemini Streaming (${modelId}) with Key #${kIndex + 1}...`);
                const genAI = new GoogleGenerativeAI(currentKey);

                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemInstruction
                });

                const allImages = images || (image ? [image] : []);
                let resultStream;

                if (allImages.length > 0) {
                    // Vision Mode
                    let visionInstructions = "Analyze image directly.";
                    if (workingMode === 'competitive') visionInstructions = "Solve the CP problem in the image.";
                    else if (workingMode === 'quiz') visionInstructions = "Solve this quiz question.";

                    const visionPrompt = `[VISION ACTIVE] ${visionInstructions}\n${prompt || ""}`;
                    const visionParts = [{ text: visionPrompt }];
                    allImages.forEach(img => {
                        const mimeTypeMatch = img.match(/^data:(image\/[a-zA-Z]*);base64,/);
                        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
                        visionParts.push({ inlineData: { data: img.split(',')[1], mimeType: mimeType } });
                    });

                    const visionConfig = { maxOutputTokens: 65536 };
                    if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                        visionConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                    }

                    resultStream = await model.generateContentStream({
                        contents: [{ role: 'user', parts: visionParts }],
                        generationConfig: visionConfig,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    });
                } else {
                    // Chat Mode
                    const genConfig = { maxOutputTokens: 65536 };
                    if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                        genConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                    }

                    const chat = model.startChat({
                        history: history,
                        generationConfig: genConfig,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    });

                    resultStream = await chat.sendMessageStream(prompt || ".");
                }

                // Consume stream
                for await (const chunk of resultStream.stream) {
                    const chunkText = chunk.text();
                    if (callbacks.onChunk) callbacks.onChunk(chunkText);
                }

                if (callbacks.onDone) callbacks.onDone(modelId);
                return; // Success!

            } catch (error) {
                const errorMessage = error.message.toLowerCase();
                const isRetryableError = 
                    errorMessage.includes('429') || 
                    errorMessage.includes('quota') || 
                    errorMessage.includes('limit') ||
                    errorMessage.includes('404') || 
                    errorMessage.includes('not found') ||
                    errorMessage.includes('unavailable') || 
                    errorMessage.includes('overloaded') ||
                    errorMessage.includes('503');

                if (isRetryableError) {
                    console.warn(`Key #${kIndex + 1} failed for ${modelId} (${error.message}). Checking next key...`);
                    continue; // Try next API Key
                }
                
                // If not retryable, or last key failed, move to next model fallback
                console.error(`Fatal error for ${modelId} with Key #${kIndex + 1}:`, error.message);
                break; 
            }
        }
    }
    
    if (callbacks.onError) callbacks.onError("All API Keys and model fallbacks exhausted. Please check your network or quota.");
}

module.exports = {
    listModels,
    askGemini,
    streamGemini
};
