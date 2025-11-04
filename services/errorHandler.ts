import eventBus from './eventBus';
import { triggerErrorWebhook } from './webhookService';

/**
 * Handles API errors by identifying the error type, triggering auto-repair mechanisms,
 * and returning a user-friendly error string to be displayed by the UI components.
 * @param {unknown} error - The error caught from the API call.
 * @returns {string} A user-friendly error message.
 */
export const handleApiError = (error: unknown): string => {
    console.error("Original API Error:", error);
    
    // Automatically trigger the webhook for admin notification
    triggerErrorWebhook(error);

    let message: string;
    if (error instanceof Error) {
        message = error.message;
    } else {
        message = String(error);
    }
    
    const lowerCaseMessage = message.toLowerCase();
    let errorCode: string | undefined;

    // --- Start Error Code Detection ---
    
    // 1. Prioritize specific keywords that map directly to our desired user messages.
    // This ensures we catch specific issues even if a generic HTTP code (like 500) is also present.
    if (lowerCaseMessage.includes('resource exhausted') || lowerCaseMessage.includes('quota exceeded')) {
        errorCode = '429';
    } else if (lowerCaseMessage.includes('bad request') && (lowerCaseMessage.includes('safety') || lowerCaseMessage.includes('filter'))) {
        errorCode = '400'; // Specifically a safety filter error
    }

    // 2. If a specific code wasn't found via keywords, proceed with generic parsing.
    if (!errorCode) {
        // Try to parse a structured error from JSON in the message
        try {
            const jsonMatch = message.match(/(\{.*\})/s);
            if (jsonMatch && jsonMatch[0]) {
                const errorObj = JSON.parse(jsonMatch[0]);
                if (errorObj?.error?.code) {
                    errorCode = String(errorObj.error.code);
                }
            }
        } catch (e) { /* ignore json parsing errors */ }

        // If no JSON code, try to find a numeric code in the string
        if (!errorCode) {
            const codeMatch = message.match(/\[(\d{3})\]|\b(\d{3})\b/);
            if (codeMatch) {
                errorCode = codeMatch[1] || codeMatch[2];
            }
        }

        // If still no code, infer from other general keywords.
        if (!errorCode) {
            if (lowerCaseMessage.includes('permission denied') || lowerCaseMessage.includes('api key not valid')) {
                errorCode = '403';
            } else if (lowerCaseMessage.includes('bad request')) { // Generic bad request
                errorCode = '400';
            } else if (lowerCaseMessage.includes('server error') || lowerCaseMessage.includes('503')) {
                errorCode = '500';
            } else if (lowerCaseMessage.includes('failed to fetch')) {
                errorCode = 'NET';
            }
        }
    }
    // --- End Error Code Detection ---


    const isVeoError = lowerCaseMessage.includes('veo auth token');
    if ((errorCode === '403' || errorCode === '401') && isVeoError) {
        eventBus.dispatch('initiateAutoVeoKeyClaim');
        return "VEO authorization failed. Please try again or check your API key.";
    }

    const isApiKeyError = (errorCode === '403' || errorCode === '401') || (errorCode === '400' && lowerCaseMessage.includes('api key not valid'));
    if (isApiKeyError) {
        eventBus.dispatch('initiateAutoApiKeyClaim');
        return "API Key is invalid or expired. Please try again or check your API key.";
    }
    
    // Return simple, user-friendly messages based on the code
    switch(errorCode) {
        case '400': return 'Request blocked by safety filters. Please try a different prompt or image.';
        case '429': return 'Server Penuh. Sila tunggu sebentar sebelum mencuba lagi.';
        case '500':
        case '503': return 'Google API is temporarily unavailable. Please try again in a few moments.';
        case 'NET': return 'Network error. Please check your internet connection.';
        default: {
            const firstLine = message.split('\n')[0];

            // Shorten long, technical-looking messages and guide the user
            if (firstLine.length > 150 || firstLine.includes('[GoogleGenerativeAI Error]')) {
                return 'An unexpected error occurred. Please try again. If the problem persists, check the AI API Log for details.';
            }
            
            // If the message is already user-friendly and not too long, return it as is.
            return firstLine;
        }
    }
};
