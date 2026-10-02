import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Terminal Color Helper
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    fgCyan: "\x1b[36m",
    fgGreen: "\x1b[32m",
    fgYellow: "\x1b[33m",
    fgRed: "\x1b[31m",
    fgMagenta: "\x1b[35m",
    bgBlue: "\x1b[44m",
    bgBlack: "\x1b[40m"
};

async function main() {
    console.log(`${colors.bright}${colors.fgCyan}
===================================================
      Z N I N J A  |  M O D E L  F E T C H E R
===================================================${colors.reset}\n`);

    // Get API Key from arguments or environment (server-side only; never use a VITE_-prefixed
    // variable here, as that convention exposes values to client-side bundles)
    let apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error(`${colors.fgRed}✖ Error: Gemini API Key not found!${colors.reset}`);
        console.log(`\nPlease provide your API key via one of these methods:`);
        console.log(`1. Pass it as a command line argument: ${colors.bright}node list-models.js YOUR_API_KEY${colors.reset}`);
        console.log(`2. Set the ${colors.fgYellow}GEMINI_API_KEY${colors.reset} environment variable\n`);
        process.exit(1);
    }

    // Mask API Key for display
    const maskedKey = apiKey.length > 8 
        ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` 
        : '***';

    console.log(`${colors.dim}Using API Key: ${colors.reset}${colors.bright}${colors.fgGreen}${maskedKey}${colors.reset}`);
    console.log(`${colors.dim}Fetching model list from Gemini API...${colors.reset}\n`);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error (${response.status} ${response.statusText}): ${errText}`);
        }

        const data = await response.json();

        if (!data.models || data.models.length === 0) {
            console.log(`${colors.fgYellow}⚠ No models returned from the API.${colors.reset}`);
            return;
        }

        // Print header
        console.log(`${colors.bright}${'Model ID'.padEnd(35)} ${'Input Limit'.padEnd(12)} ${'Output Limit'.padEnd(12)} ${'Capabilities'}${colors.reset}`);
        console.log(`${colors.dim}-`.repeat(90) + colors.reset);

        // Filter and display models
        data.models.forEach(model => {
            const modelId = model.name.replace('models/', '');
            const inputLimit = model.inputTokenLimit ? model.inputTokenLimit.toLocaleString() : 'N/A';
            const outputLimit = model.outputTokenLimit ? model.outputTokenLimit.toLocaleString() : 'N/A';
            
            // Format capabilities
            const methods = model.supportedGenerationMethods || [];
            const capabilities = [];
            if (methods.includes('generateContent')) capabilities.push('Chat');
            if (methods.includes('embedContent')) capabilities.push('Embed');
            if (methods.includes('countTokens')) capabilities.push('Tokens');
            
            const capabilityStr = capabilities.join(', ') || 'Other';

            // Highlight popular models
            let color = colors.reset;
            if (modelId.includes('gemini-3') || modelId.includes('gemini-2.5') || modelId.includes('thinking')) {
                color = colors.fgCyan + colors.bright;
            } else if (modelId.includes('gemini-1.5')) {
                color = colors.fgGreen;
            }

            console.log(`${color}${modelId.padEnd(35)}${colors.reset} ${inputLimit.padEnd(12)} ${outputLimit.padEnd(12)} ${colors.dim}${capabilityStr}${colors.reset}`);
        });

        console.log(`\n${colors.fgGreen}✔ Successfully fetched ${data.models.length} available models!${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.fgRed}✖ Failed to fetch models:${colors.reset}`);
        console.error(`${colors.fgRed}${error.message}${colors.reset}\n`);
    }
}

main();
