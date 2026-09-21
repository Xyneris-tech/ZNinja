const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { getApiKey, getApiKeys, getSystemInstruction } = require('./config.cjs');

// Helper to detect if key is Paid (Placeholder)
async function checkTierInternal() {
    // Current logic returns false (Free tier assumption or logic not fully implemented)
    return false;
}

let activeAbortController = null;

function abortActiveStream() {
    if (activeAbortController) {
        console.log("ZNinja Gemini: Aborting active stream...");
        activeAbortController.abort();
        activeAbortController = null;
    }
}

// List Models
async function listModels(explicitKey = null) {
    let apiErrorType = null;
    let keysToCheck = [];

    if (explicitKey) {
        keysToCheck = [explicitKey];
    } else {
        keysToCheck = getApiKeys();
    }

    if (keysToCheck.length === 0) {
        apiErrorType = 'invalid_key';
        return { success: false, apiErrorType, invalidIndices: [] };
    }

    let models = [];
    let invalidIndices = [];
    let anySuccess = false;

    const results = await Promise.allSettled(keysToCheck.map(async (apiKey) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.models || data.models.length === 0) {
            throw new Error("No models returned from API");
        }
        return data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
    }));

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            anySuccess = true;
            models = [...models, ...result.value];
        } else {
            const errorMsg = result.reason.message.toLowerCase();
            console.warn(`List Models Fetch failed for key #${i + 1}:`, result.reason.message);
            if (errorMsg.includes('429') || errorMsg.includes('quota')) {
                apiErrorType = 'quota'; // We keep the key, just out of quota
            } else if (errorMsg.includes('400') || errorMsg.includes('401') || errorMsg.includes('403')) {
                invalidIndices.push(i);
                apiErrorType = 'invalid_key';
            } else {
                invalidIndices.push(i);
                apiErrorType = 'invalid_key';
            }
        }
    });

    if (anySuccess) {
        // Deduplicate and clean
        models = [...new Set(models)];
        // If there was any success, we clear the apiErrorType so the banner doesn't show up wrongly,
        // UNLESS we want to show it? We just return invalidIndices for the SetupScreen.
        return { success: true, models, invalidIndices };
    }
    
    // Robust Fallback (Stable & Experimental)
    return {
        success: true, 
        apiErrorType,
        invalidIndices,
        models: [
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash-thinking-exp",
            "gemini-3-flash",
            "gemini-2.5-flash",
            "gemini-1.5-pro",
            "gemini-1.5-pro-002",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-flash-002",
            "gemini-1.0-pro"
        ]
    };
}

// Run Deep Research via Interactions API
async function runDeepResearch({ prompt, modelId, apiKey, systemInstruction, onProgress, signal }) {
    console.log(`ZNinja REST: Starting Deep Research interaction for ${modelId}...`);
    
    if (signal && signal.aborted) {
        throw new Error("STREAM_ABORTED");
    }

    const combinedInput = `${systemInstruction}\n\nUser Query: ${prompt}`;
    const agentName = modelId.startsWith('models/') ? modelId.replace('models/', '') : modelId;
    
    // 1. Create Interaction
    const createUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Revision': '2026-05-20'
        },
        body: JSON.stringify({
            agent: agentName,
            input: combinedInput,
            background: true
        }),
        signal: signal
    });
    
    if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to initiate research interaction: ${createRes.status} ${createRes.statusText} - ${errText}`);
    }
    
    const initialData = await createRes.json();
    const interactionId = initialData.id;
    if (!interactionId) {
        throw new Error(`Did not receive interaction ID from API: ${JSON.stringify(initialData)}`);
    }
    
    console.log(`ZNinja REST: Deep Research interaction created: ${interactionId}`);
    
    // 2. Poll Interaction
    const resourcePath = interactionId.startsWith('interactions/') ? interactionId : `interactions/${interactionId}`;
    const getUrl = `https://generativelanguage.googleapis.com/v1beta/${resourcePath}?key=${apiKey}`;
    
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes (polling every 5 seconds)
    
    while (attempts < maxAttempts) {
        attempts++;
        if (onProgress) {
            onProgress(attempts);
        }
        
        // Interruptible Sleep loop
        for (let i = 0; i < 50; i++) {
            if (signal && signal.aborted) {
                throw new Error("STREAM_ABORTED");
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const pollRes = await fetch(getUrl, {
            headers: {
                'Api-Revision': '2026-05-20'
            },
            signal: signal
        });
        
        if (!pollRes.ok) {
            console.warn(`ZNinja REST: Polling failed on attempt ${attempts}: ${pollRes.statusText}`);
            continue;
        }
        
        const interaction = await pollRes.json();
        const status = (interaction.status || '').toLowerCase();
        
        console.log(`ZNinja REST: Interaction ${interactionId} status: ${status} (attempt ${attempts})`);
        
        if (status === 'completed' || status === 'completed_with_refinement') {
            let text = "";
            if (interaction.steps && Array.isArray(interaction.steps)) {
                for (let i = interaction.steps.length - 1; i >= 0; i--) {
                    const step = interaction.steps[i];
                    if (step.content && Array.isArray(step.content)) {
                        const textPart = step.content.find(part => part.text);
                        if (textPart) {
                            text = textPart.text;
                            break;
                        }
                    }
                }
            }
            
            if (!text) {
                // Fallback: search all steps for any text part
                text = JSON.stringify(interaction);
            }
            
            return text;
        } else if (status === 'failed' || status === 'cancelled') {
            throw new Error(`Research interaction failed or was cancelled by the server. Status: ${status}`);
        }
    }
    
    throw new Error("Deep Research task timed out. Please check again later or try a shorter query.");
}

// Ask Gemini
async function askGemini({ prompt, modelName, images, image, audioData, history = [], workingMode }) {
    let smartFallbacks = [];
    const isPro = await checkTierInternal();

    // --- SMART ROUTER LOGIC ---
    if (workingMode === 'research') {
        console.log("ZNinja Router: Deep Research active. Prioritizing native deep research models.");
        smartFallbacks = [
            "deep-research-preview-04-2026",
            "deep-research-max-preview-04-2026",
            "deep-research-pro-preview-12-2025"
        ];
        if (modelName === 'zninja-auto-smart' || !modelName.includes('deep-research')) {
            modelName = smartFallbacks[0];
        }
    } else {
        if (modelName && modelName.includes('deep-research')) {
            modelName = 'zninja-auto-smart';
        }
        if (modelName === 'zninja-auto-smart') {
            const lowerPrompt = prompt ? prompt.toLowerCase() : '';
            const codingKeywords = ['code', 'fix', 'api', 'o(n)', 'implementation', 'logic', 'algorithm'];
            const isComplex = image || audioData || codingKeywords.some(k => lowerPrompt.includes(k)) || (prompt && prompt.length > 300);

            if (isComplex) {
                console.log("ZNinja Router: Complex/Coding detected.");
                smartFallbacks = [
                    "gemini-3.1-pro-preview",
                    "gemini-2.5-pro",
                    "gemini-3-pro-preview"
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
    }

    const baseFallbacks = workingMode === 'research' ? [
        "deep-research-preview-04-2026",
        "deep-research-max-preview-04-2026",
        "deep-research-pro-preview-12-2025"
    ] : [];

    const modelFallbacks = [
        ...smartFallbacks,
        modelName,
        ...baseFallbacks,
        "gemini-2.0-flash-thinking-exp",
        "gemini-3-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash"
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // --- SYSTEM INSTRUCTION LOGIC ---
    const MODE_INSTRUCTIONS = {
        'general': `You are ZNinja, an ultra-direct and highly efficient assistant.
- Give the final correct answer or solution immediately as the very first sentence.
- Eliminate all conversational filler, introductory pleasantries, and redundant explanations.
- Keep reasoning high-density, concise, and purely factual.`,

        'code': `You are ZNinja, an Elite Senior Software Engineer.
- Deliver 100% complete, fully functional, production-ready code.
- Absolutely NO placeholders, no truncated snippets, and no comments like "// TODO" or "// ... rest of code".
- Default to writing NO comments in the code. Code must be highly readable and self-documenting. A maximum of one single-line comment is permitted only for non-obvious algorithmic tricks.
- Structure your output:
  1. A one-sentence explanation of the approach/design.
  2. The complete, clean code block.
  3. Time & Space complexity in Big O notation.
- Eliminate any introductory or concluding conversational fluff.`,

        'competitive': `You are ZNinja, an Elite Algorithmic Solver.
- Deliver the optimal, complete algorithmic solution immediately.
- Use clean, idiomatic code with optimal time and space complexity.
- Absolutely NO comments in the code, NO intro, NO outro, NO explanations, and NO conversational noise.
- Output ONLY the ready-to-paste code block containing the complete solution that gives correct output on the provided testcases (if provided).`,

        'research': `You are ZNinja, an Elite Research Analyst.
- Conduct a deep, rigorous, and highly comprehensive research process.
- Leverage web search results to fact-check, analyze, and synthesize in-depth findings.
- Structure your output professionally:
  1. Executive Summary: High-level overview of findings.
  2. In-Depth Analysis: Detailed, structured sections with clear headings.
  3. Key Takeaways: Bulleted list of critical insights.
  4. Verified Sources: List active web URLs and citations.
- Maintain an authoritative, objective, and analytical tone.
- Eliminate all conversational fluff, intro, and outro.`,

        'quiz': `You are ZNinja, an Expert Academic Tutor.
- Output the correct option immediately (e.g., "Option A: [Option Content]").
- Provide exactly one concise sentence justifying the correctness.
- Absolutely NO extra text, introductory greeting, or closing conversation.`
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

                const isThinkingModel = modelId.includes('thinking');
                const isLegacyModel = modelId.includes('1.5') || modelId.includes('1.0');
                const isDeepResearchModel = (workingMode === 'research') && modelId.includes('deep-research');
                 
                if (isDeepResearchModel) {
                    const resultText = await runDeepResearch({
                        prompt: prompt,
                        modelId: modelId,
                        apiKey: currentKey,
                        systemInstruction: systemInstruction,
                        onProgress: (attempt) => {
                            console.log(`ZNinja REST: Researching... attempt ${attempt}`);
                        }
                    });
                    return { success: true, text: resultText, usedModel: modelId };
                }

                const modelOptions = {
                    model: modelId,
                    systemInstruction: systemInstruction
                };

                // Enable Search Grounding by default for 2.x/3.x non-thinking, non-research models
                if (!isThinkingModel && !isLegacyModel && !isDeepResearchModel) {
                    modelOptions.tools = [{ googleSearch: {} }];
                }

                let model = genAI.getGenerativeModel(modelOptions);
                let result;
                const allImages = images || (image ? [image] : []);

                const executeCall = async (activeModel) => {
                    if (audioData) {
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

                        return activeModel.generateContent({
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
                        let visionInstructions = "Analyze attachment directly.";
                        if (allImages.every(img => img.startsWith("data:image/"))) {
                            visionInstructions = "Analyze image directly.";
                        } else if (allImages.every(img => img.startsWith("data:audio/"))) {
                            visionInstructions = "Analyze audio directly.";
                        }
                        if (workingMode === 'competitive') visionInstructions = "Solve the CP problem in the image.";
                        else if (workingMode === 'quiz') visionInstructions = "Solve this quiz question.";

                        const visionPrompt = `[VISION ACTIVE] ${visionInstructions}\n${prompt || ""}`;
                        const visionParts = [{ text: visionPrompt }];
                        allImages.forEach(img => {
                            const mimeTypeMatch = img.match(/^data:([^;]+);base64,/);
                            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
                            visionParts.push({ inlineData: { data: img.split(',')[1], mimeType: mimeType } });
                        });

                        const visionConfig = { maxOutputTokens: 65536 };
                        if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                            visionConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                        }

                        return activeModel.generateContent({
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
                        const genConfig = { maxOutputTokens: 65536 };
                        if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                            genConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                        }

                        const chat = activeModel.startChat({
                            history: history,
                            generationConfig: genConfig,
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            ]
                        });

                        return chat.sendMessage(prompt || ".");
                    }
                };

                try {
                    result = await executeCall(model);
                } catch (callError) {
                    const errorMsg = (callError.message || '').toLowerCase();
                    const isToolError = errorMsg.includes('tool') || 
                                       errorMsg.includes('grounding') || 
                                       errorMsg.includes('invalid_argument') || 
                                       errorMsg.includes('unsupported');
                    
                    if (isToolError && modelOptions.tools) {
                        console.warn(`Search grounding unsupported on ${modelId} (${callError.message}). Retrying without tools...`);
                        delete modelOptions.tools;
                        const fallbackModel = genAI.getGenerativeModel(modelOptions);
                        result = await executeCall(fallbackModel);
                    } else {
                        throw callError;
                    }
                }

                const response = await result.response;
                if (!response.candidates || response.candidates.length === 0) {
                    throw new Error("Response blocked by safety filters.");
                }
                
                let text = response.text();

                // Critique-and-refining pass for code/competitive modes if laziness is detected
                if (text && (workingMode === 'code' || workingMode === 'competitive')) {
                    const lazyPatterns = [
                        /\/\/\s*\.\.\./i,            // // ...
                        /\/\*\s*\.\.\.\s*\*\//i,    // /* ... */
                        /#\s*\.\.\./i,               // # ...
                        /\/\/\s*TODO/i,              // // TODO
                        /\/\*\s*TODO/i,              // /* TODO
                        /#\s*TODO/i,                 // # TODO
                        /\/\/\s*rest of/i,           // // rest of
                        /\/\/\s*implement/i,          // // implement
                        /\/\/\s*write your/i,        // // write your
                        /#\s*rest of/i,              // # rest of
                        /#\s*implement/i,            // # implement
                        /#\s*write your/i            // # write your
                    ];

                    const hasLaziness = lazyPatterns.some(pattern => pattern.test(text));
                    if (hasLaziness) {
                        console.log("ZNinja Refiner: Lazy placeholder detected in first draft. Initiating refinement pass...");
                        try {
                            const refinerPrompt = `The user asked for:
"${prompt}"

Here is an incomplete draft that contains placeholders, lazy comments (like "// ...", "// TODO"), or missing implementations:
\`\`\`
${text}
\`\`\`

You must rewrite this and output a 100% complete, fully implemented, ready-to-run solution.
Strictly adhere to the following rules:
1. Do NOT use any placeholders, inline TODOs, or truncated snippets under any circumstances. Implement EVERY single method, variable, and class completely.
2. Maintain clean, highly readable code with absolutely minimal or zero comments. Do not write obvious comments.
3. Match the direct, high-density system instruction style (no conversational fillers, no explanations before/after code unless requested).`;

                            const refinerModel = genAI.getGenerativeModel(modelOptions);
                            let refinerResult;
                            
                            const refConfig = { maxOutputTokens: 65536 };
                            if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                                refConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                            }

                            refinerResult = await refinerModel.generateContent({
                                contents: [{ role: 'user', parts: [{ text: refinerPrompt }] }],
                                generationConfig: refConfig,
                                safetySettings: [
                                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                ]
                            });

                            const refinerResponse = await refinerResult.response;
                            if (refinerResponse.candidates && refinerResponse.candidates.length > 0) {
                                const refinedText = refinerResponse.text();
                                if (refinedText && refinedText.trim().length > 0) {
                                    console.log("ZNinja Refiner: Refinement successful. Returning complete code.");
                                    text = refinedText;
                                }
                            }
                        } catch (refError) {
                            console.error("ZNinja Refiner failed, falling back to original draft:", refError.message);
                        }
                    }
                }

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
                    errorMessage.includes('503') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('forbidden') ||
                    errorMessage.includes('invalid') ||
                    errorMessage.includes('permission') ||
                    errorMessage.includes('401') ||
                    errorMessage.includes('unauthorized');

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
    // Cancel any current stream before starting a new one
    abortActiveStream();

    const controller = new AbortController();
    activeAbortController = controller;
    const signal = controller.signal;

    let smartFallbacks = [];
    const isPro = await checkTierInternal();

    // --- SMART ROUTER LOGIC ---
    if (workingMode === 'research') {
        console.log("ZNinja Router: Deep Research active. Prioritizing native deep research models.");
        smartFallbacks = [
            "deep-research-preview-04-2026",
            "deep-research-max-preview-04-2026",
            "deep-research-pro-preview-12-2025"
        ];
        if (modelName === 'zninja-auto-smart' || !modelName.includes('deep-research')) {
            modelName = smartFallbacks[0];
        }
    } else {
        if (modelName && modelName.includes('deep-research')) {
            modelName = 'zninja-auto-smart';
        }
        if (modelName === 'zninja-auto-smart') {
            const lowerPrompt = prompt ? prompt.toLowerCase() : '';
            const codingKeywords = ['code', 'fix', 'api', 'o(n)', 'implementation', 'logic', 'algorithm'];
            const isComplex = image || codingKeywords.some(k => lowerPrompt.includes(k)) || (prompt && prompt.length > 300);

            if (isComplex) {
                console.log("ZNinja Router: Complex/Coding detected.");
                smartFallbacks = [
                    "gemini-3.1-pro-preview",
                    "gemini-2.5-pro",
                    "gemini-3-pro-preview"
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
    }

    const baseFallbacks = workingMode === 'research' ? [
        "deep-research-preview-04-2026",
        "deep-research-max-preview-04-2026",
        "deep-research-pro-preview-12-2025"
    ] : [];

    const modelFallbacks = [
        ...smartFallbacks,
        modelName,
        ...baseFallbacks,
        "gemini-2.0-flash-thinking-exp",
        "gemini-3-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash"
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    // --- SYSTEM INSTRUCTION LOGIC ---
    const MODE_INSTRUCTIONS = {
        'general': `You are ZNinja, an ultra-direct and highly efficient assistant.
- Give the final correct answer or solution immediately as the very first sentence.
- Eliminate all conversational filler, introductory pleasantries, and redundant explanations.
- Keep reasoning high-density, concise, and purely factual.`,

        'code': `You are ZNinja, an Elite Senior Software Engineer.
- Deliver 100% complete, fully functional, production-ready code.
- Absolutely NO placeholders, no truncated snippets, and no comments like "// TODO" or "// ... rest of code".
- Default to writing NO comments in the code. Code must be highly readable and self-documenting. A maximum of one single-line comment is permitted only for non-obvious algorithmic tricks.
- Structure your output:
  1. A one-sentence explanation of the approach/design.
  2. The complete, clean code block.
  3. Time & Space complexity in Big O notation.
- Eliminate any introductory or concluding conversational fluff.`,

        'competitive': `You are ZNinja, an Elite Algorithmic Solver.
- Deliver the optimal, complete algorithmic solution immediately.
- Use clean, idiomatic code with optimal time and space complexity.
- Absolutely NO comments in the code, NO intro, NO outro, NO explanations, and NO conversational noise.
- Output ONLY the ready-to-paste code block containing the complete solution.`,

        'research': `You are ZNinja, an Elite Research Analyst.
- Conduct a deep, rigorous, and highly comprehensive research process.
- Leverage web search results to fact-check, analyze, and synthesize in-depth findings.
- Structure your output professionally:
  1. Executive Summary: High-level overview of findings.
  2. In-Depth Analysis: Detailed, structured sections with clear headings.
  3. Key Takeaways: Bulleted list of critical insights.
  4. Verified Sources: List active web URLs and citations.
- Maintain an authoritative, objective, and analytical tone.
- Eliminate all conversational fluff, intro, and outro.`,

        'quiz': `You are ZNinja, an Expert Academic Tutor.
- Output the correct option immediately (e.g., "Option A: [Option Content]").
- Provide exactly one concise sentence justifying the correctness.
- Absolutely NO extra text, introductory greeting, or closing conversation.`
    };

    const defaultSystemInstruction = getSystemInstruction();
    
    let systemInstruction = defaultSystemInstruction;
    if (workingMode && MODE_INSTRUCTIONS[workingMode]) {
        systemInstruction = MODE_INSTRUCTIONS[workingMode];
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        if (callbacks.onError) callbacks.onError("No API Keys configured. Please go to Setup.");
        if (activeAbortController === controller) activeAbortController = null;
        return;
    }

    // --- EXECUTION LOOP (Models x Keys) ---
    for (const modelId of modelFallbacks) {
        if (!modelId) continue;
        if (signal.aborted) {
            if (callbacks.onDone) callbacks.onDone(modelId);
            if (activeAbortController === controller) activeAbortController = null;
            return;
        }
        
        for (let kIndex = 0; kIndex < apiKeys.length; kIndex++) {
            if (signal.aborted) {
                if (callbacks.onDone) callbacks.onDone(modelId);
                if (activeAbortController === controller) activeAbortController = null;
                return;
            }
            const currentKey = apiKeys[kIndex];
            
            try {
                console.log(`Attempting Gemini Streaming (${modelId}) with Key #${kIndex + 1}...`);
                const genAI = new GoogleGenerativeAI(currentKey);

                const isThinkingModel = modelId.includes('thinking');
                const isLegacyModel = modelId.includes('1.5') || modelId.includes('1.0');
                const isDeepResearchModel = (workingMode === 'research') && modelId.includes('deep-research');

                if (isDeepResearchModel) {
                    if (callbacks.onChunk) {
                        callbacks.onChunk(`*   *[Step 1] Initializing deep research interaction with ${modelId}...*\n`);
                    }
                    const resultText = await runDeepResearch({
                        prompt: prompt,
                        modelId: modelId,
                        apiKey: currentKey,
                        systemInstruction: systemInstruction,
                        onProgress: (attempt) => {
                            if (callbacks.onChunk) {
                                // Accumulate logs cleanly during progress
                                let logs = "";
                                for (let i = 1; i <= attempt + 1; i++) {
                                    if (i === 1) {
                                        logs += `*   *[Step 1] Initializing deep research interaction with ${modelId}...*\n`;
                                    } else {
                                        logs += `*   *[Step ${i}] Research agent is scanning sources and analyzing data... (running for ${(i - 1) * 5}s)*\n`;
                                    }
                                }
                                callbacks.onChunk(logs, true);
                            }
                        },
                        signal: signal
                    });
                    if (callbacks.onChunk) {
                        // Replace everything with the clean final report once ready
                        callbacks.onChunk(resultText, true);
                    }
                    if (callbacks.onDone) {
                        callbacks.onDone(modelId, resultText);
                    }
                    if (activeAbortController === controller) {
                        activeAbortController = null;
                    }
                    return; // Success!
                }

                const modelOptions = {
                    model: modelId,
                    systemInstruction: systemInstruction
                };

                // Enable Search Grounding by default for 2.x/3.x non-thinking, non-research models
                if (!isThinkingModel && !isLegacyModel && !isDeepResearchModel) {
                    modelOptions.tools = [{ googleSearch: {} }];
                }

                let model = genAI.getGenerativeModel(modelOptions);
                const allImages = images || (image ? [image] : []);
                let resultStream;

                const executeStreamCall = async (activeModel) => {
                    if (allImages.length > 0) {
                        let visionInstructions = "Analyze attachment directly.";
                        if (allImages.every(img => img.startsWith("data:image/"))) {
                            visionInstructions = "Analyze image directly.";
                        } else if (allImages.every(img => img.startsWith("data:audio/"))) {
                            visionInstructions = "Analyze audio directly.";
                        }
                        if (workingMode === 'competitive') visionInstructions = "Solve the CP problem in the image.";
                        else if (workingMode === 'quiz') visionInstructions = "Solve this quiz question.";

                        const visionPrompt = `[VISION ACTIVE] ${visionInstructions}\n${prompt || ""}`;
                        const visionParts = [{ text: visionPrompt }];
                        allImages.forEach(img => {
                            const mimeTypeMatch = img.match(/^data:([^;]+);base64,/);
                            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
                            visionParts.push({ inlineData: { data: img.split(',')[1], mimeType: mimeType } });
                        });

                        const visionConfig = { maxOutputTokens: 65536 };
                        if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                            visionConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                        }

                        return activeModel.generateContentStream({
                            contents: [{ role: 'user', parts: visionParts }],
                            generationConfig: visionConfig,
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            ]
                        }, { signal });
                    } else {
                        const genConfig = { maxOutputTokens: 65536 };
                        if (modelId.includes('thinking') || modelId.includes('gemini-3')) {
                            genConfig.thinkingConfig = { includeThoughts: true, thinkingLevel: "HIGH" };
                        }

                        const chat = activeModel.startChat({
                            history: history,
                            generationConfig: genConfig,
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            ]
                        });

                        return chat.sendMessageStream(prompt || ".", { signal });
                    }
                };

                try {
                    resultStream = await executeStreamCall(model);
                } catch (callError) {
                    if (signal.aborted) throw callError;

                    const errorMsg = (callError.message || '').toLowerCase();
                    const isToolError = errorMsg.includes('tool') || 
                                       errorMsg.includes('grounding') || 
                                       errorMsg.includes('invalid_argument') || 
                                       errorMsg.includes('unsupported');
                    
                    if (isToolError && modelOptions.tools) {
                        console.warn(`Search grounding unsupported for streaming on ${modelId} (${callError.message}). Retrying standard stream call...`);
                        delete modelOptions.tools;
                        const fallbackModel = genAI.getGenerativeModel(modelOptions);
                        resultStream = await executeStreamCall(fallbackModel);
                    } else {
                        throw callError;
                    }
                }

                // Consume stream
                for await (const chunk of resultStream.stream) {
                    if (signal.aborted) break;
                    
                    const candidate = chunk.candidates?.[0];
                    if (candidate && candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.thought) {
                                if (callbacks.onChunk) callbacks.onChunk({ thought: part.text });
                            } else if (part.text) {
                                if (callbacks.onChunk) callbacks.onChunk({ text: part.text });
                            }
                        }
                    } else {
                        try {
                            const chunkText = chunk.text();
                            if (callbacks.onChunk) callbacks.onChunk({ text: chunkText });
                        } catch (textErr) {
                            console.warn("ZNinja Gemini: Chunk text fetch failed:", textErr.message);
                        }
                    }
                }

                if (callbacks.onDone) callbacks.onDone(modelId);
                if (activeAbortController === controller) {
                    activeAbortController = null;
                }
                return; // Success!

            } catch (error) {
                if (signal.aborted) {
                    console.log("ZNinja Gemini: Stream aborted by user.");
                    if (callbacks.onDone) callbacks.onDone(modelId);
                    if (activeAbortController === controller) {
                        activeAbortController = null;
                    }
                    return;
                }

                const errorMessage = error.message.toLowerCase();
                const isRetryableError = 
                    errorMessage.includes('429') || 
                    errorMessage.includes('quota') || 
                    errorMessage.includes('limit') ||
                    errorMessage.includes('404') || 
                    errorMessage.includes('not found') ||
                    errorMessage.includes('unavailable') || 
                    errorMessage.includes('overloaded') ||
                    errorMessage.includes('503') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('forbidden') ||
                    errorMessage.includes('invalid') ||
                    errorMessage.includes('permission') ||
                    errorMessage.includes('401') ||
                    errorMessage.includes('unauthorized');

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
    
    if (activeAbortController === controller) {
        activeAbortController = null;
    }
    if (callbacks.onError) callbacks.onError("All API Keys and model fallbacks exhausted. Please check your network or quota.");
}

module.exports = {
    listModels,
    askGemini,
    streamGemini,
    abortActiveStream
};

