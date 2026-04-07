const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { getApiKey, getSystemInstruction } = require('./config.cjs');

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
        'general': `You are ZNinja, a helpful, versatile, and highly efficient AI assistant.
**Goal:** Deliver clear, concise, and accurate answers.
**Output Format (STRICT):**
- Direct answer/solution first.
- Brief explanation or next steps only if necessary.
- NO unnecessary conversational fluff (e.g., 'Sure, I can help with that').`,
        'code': `You are a Senior Software Engineer.
**Goal:** Provide production-ready, well-documented, and efficient code solutions.
**Operational Protocol:**
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

            if (audioData) {
                // Audio Mode (Minutes of Meeting)
                const base64Data = audioData.split(',')[1];
                const parts = audioData.split(';');
                const mimeType = parts[0].split(':')[1] || 'audio/webm';

                console.log(`Processing Audio. Mime: ${mimeType}`);

                const textPrompt = prompt || `[SYSTEM: SECRETARY MODE]
Generate a structured "Minutes of Meeting" from the audio.
Include:
1. 👥 Attendees (if inferred)
2. 📝 Agenda/Topics
3. ✅ Key Decisions
4. 📌 Action Items (Who - What - When)
5. ❓ Open Questions`;

                const contentParts = [
                    { text: textPrompt },
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    }
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
                // Single Turn with Image (+ Vision Chain-of-Thought)
                let visionInstructions = "Analyze the image and follow your system instructions.";
                if (workingMode === 'competitive') {
                    visionInstructions = "Strictly transcribe the problem from the image and solve it using the ZNinja Competitive Programming protocol.";
                } else if (workingMode === 'quiz') {
                    visionInstructions = "Directly solve the question in the image with maximum accuracy and no fluff.";
                }

                const visionPrompt = `[VISION SERVICE ACTIVE] ${visionInstructions}
${prompt || ""}`;

                const visionParts = [{ text: visionPrompt }];
                allImages.forEach(img => {
                    const base64Data = img.split(',')[1];
                    visionParts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: "image/png"
                        }
                    });
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

                result = await chat.sendMessage(prompt || ".");
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
