const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { getApiKey, getSystemInstruction } = require('./config');

// Helper to get authorized client
function getGenAI() {
    const key = getApiKey();
    if (!key) throw new Error("API Key not found");
    return new GoogleGenerativeAI(key);
}

// Helper to detect if key is Paid (Placeholder)
async function checkTierInternal() {
    // Current logic returns false (Free tier assumption or logic not fully implemented)
    return false;
}

// List Models
async function listModels() {
    try {
        let models = [];
        const apiKey = getApiKey();
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
async function askGemini({ prompt, modelName, images, image, history = [] }) {
    let smartFallbacks = [];
    const isPro = await checkTierInternal();

    // --- SMART ROUTER LOGIC ---
    if (modelName === 'zninja-auto-smart') {
        const lowerPrompt = prompt.toLowerCase();
        const codingKeywords = ['code', 'fix', 'api', 'o(n)', 'implementation', 'logic', 'algorithm'];
        const isComplex = image || codingKeywords.some(k => lowerPrompt.includes(k)) || prompt.length > 300;

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

    const systemInstruction = getSystemInstruction();

    for (const modelId of modelFallbacks) {
        if (!modelId) continue;
        try {
            console.log(`Attempting Gemini (${modelId})...`);
            const genAI = getGenAI();

            const model = genAI.getGenerativeModel({
                model: modelId,
                systemInstruction: systemInstruction
            });

            let result;
            const allImages = images || (image ? [image] : []);

            if (allImages.length > 0) {
                // Single Turn with Image (+ Vision Chain-of-Thought)
                const textPrompt = `[SYSTEM: VISION MODE ACTIVATED]
1. TRANSCRIPT: First, strictly transcribe the full problem text from the images. Do not summarize.
2. ANALYZE: Apply the "Elite Programmer" protocol to the transcribed text.
3. SOLVE: Provide the solution code.

${prompt || "Solve this problem."}`;

                const contentParts = [{ text: textPrompt }];
                allImages.forEach(img => {
                    const base64Data = img.split(',')[1];
                    contentParts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: "image/png"
                        }
                    });
                });

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
            } else {
                // Multi-turn Text Chat
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

                result = await chat.sendMessage(prompt);
            }

            const response = await result.response;
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                throw new Error(`Example of refusal: ${response.promptFeedback.blockReason}`);
            }
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error("Response blocked or empty (Safety Filter triggered).");
            }
            const text = response.text();
            return { success: true, text, usedModel: modelId };

        } catch (error) {
            const isRetryable =
                error.message.includes('404') ||
                error.message.includes('not found') ||
                error.message.includes('429') ||
                error.message.includes('quota') ||
                error.message.includes('limit') ||
                error.message.includes('503') ||
                error.message.includes('unavailable') ||
                error.message.includes('overloaded');

            if (isRetryable) {
                console.warn(`${modelId} failed (Status: ${error.message}), trying next fallback...`);
                continue;
            }
            console.error(`Error with ${modelId}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: "All available models returned 404. Please check your API key permissions and region." };
}

module.exports = {
    listModels,
    askGemini
};
