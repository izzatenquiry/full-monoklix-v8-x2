import { supabase } from './supabaseClient';
import { type HistoryItem, type User, type ErrorWebhookPayload } from '../types';

// Webhook URL for error notifications.
// PASTE YOUR ERROR WEBHOOK URL HERE. Leave it empty to disable.
const ERROR_WEBHOOK_URL = 'https://n8n.1za7.com/webhook/trigger-error-log';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // result is "data:mime/type;base64,the_base_64_string"
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            } else {
                reject(new Error("Failed to read blob as a base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export type WebhookPayload = {
    type: 'text' | 'image' | 'video' | 'audio';
    prompt: string;
    result: string; // Base64 for media, text for text
    mimeType?: string;
    timestamp: number;
    userId: string;
};

export type SocialPostWebhookPayload = {
    type: 'social_post';
    caption: string;
    hashtags: string;
    cta: string;
    link: string;
    schedule_date: string; // ISO 8601 format
    media: {
        type: 'image' | 'video';
        data: string; // Base64
        mimeType: string;
        fileName: string;
    }[];
    timestamp: number;
    userId: string;
};

const getCurrentUserFromSession = (): User | null => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson) as User;
            if (user && user.id) {
                return user;
            }
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage for webhook.", error);
    }
    return null;
}

export const triggerUserWebhook = async (
    data: Omit<WebhookPayload, 'timestamp' | 'userId' | 'result' | 'mimeType'> & { result: string | Blob, mimeType?: string }
) => {
    const user = getCurrentUserFromSession();
    if (!user) {
        console.error("User not authenticated, cannot trigger webhook.");
        return;
    }

    if (user.status === 'trial') {
        return; // Silently ignore for trial users
    }
    
    const { data: profile, error } = await supabase
        .from('users')
        .select('webhook_url')
        .eq('id', user.id)
        .single();
    
    if (error || !profile || !profile.webhook_url) {
        // No webhook configured, fail silently
        return;
    }

    const webhookUrl = profile.webhook_url;
    let resultData: string;
    let finalMimeType: string | undefined = data.mimeType;

    if (data.result instanceof Blob) {
        resultData = await blobToBase64(data.result);
        finalMimeType = data.result.type;
    } else {
        resultData = data.result;
        if (data.type === 'text' && !finalMimeType) finalMimeType = 'text/plain';
    }

    const payload: WebhookPayload = {
        type: data.type,
        prompt: data.prompt,
        result: resultData,
        mimeType: finalMimeType,
        timestamp: Date.now(),
        userId: user.id,
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'no-cors' 
        });
    } catch (e) {
        console.error('Failed to trigger user webhook:', e);
    }
};

export const sendSocialPostToWebhook = async (
    caption: string,
    hashtags: string,
    cta: string,
    link: string,
    scheduleDate: string,
    mediaItems: HistoryItem[]
): Promise<{ success: boolean; message: string }> => {
    const user = getCurrentUserFromSession();
    if (!user?.id) {
        return { success: false, message: "User not authenticated." };
    }

    if (user.status === 'trial') {
        return { success: false, message: "Webhooks are not available for trial accounts." };
    }

    const { data: profile, error } = await supabase
        .from('users')
        .select('webhook_url')
        .eq('id', user.id)
        .single();

    if (error || !profile || !profile.webhook_url) {
        return { success: false, message: "No webhook URL is configured. Please set it in Settings." };
    }
    const webhookUrl = profile.webhook_url;

    const mediaPayload = await Promise.all(mediaItems.map(async (item) => {
        let data: string;
        let mimeType: string;
        let type: 'image' | 'video' = 'image';
        let fileName: string;

        // Handle data and mimeType first
        if (item.result instanceof Blob) {
            data = await blobToBase64(item.result);
            mimeType = item.result.type;
        } else {
            data = item.result as string;
            mimeType = 'image/png';
        }

        // Determine type and fileName
        if (item.type === 'Video') {
            type = 'video';
            // If it was a manual upload, use the original filename from the prompt
            if (item.id.startsWith('manual-')) {
                fileName = item.prompt;
            } else {
                fileName = `video_${item.id}.mp4`;
            }
        } else { // Image or Canvas
            type = 'image';
            // If it was a manual upload, use the original filename from the prompt
            if (item.id.startsWith('manual-')) {
                fileName = item.prompt;
            } else {
                fileName = `image_${item.id}.png`;
            }
        }
        
        return { type, data, mimeType, fileName };
    }));

    const payload: SocialPostWebhookPayload = {
        type: 'social_post',
        caption: caption,
        hashtags: hashtags,
        cta: cta,
        link: link,
        schedule_date: scheduleDate ? new Date(scheduleDate).toISOString() : '',
        media: mediaPayload,
        timestamp: Date.now(),
        userId: user.id,
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'no-cors' 
        });
        // With 'no-cors', we can't check the response status. We assume success if the request doesn't throw.
        return { success: true, message: "Post data sent to webhook successfully." };
    } catch (e) {
        console.error("Failed to send social post to webhook:", e);
        return { success: false, message: "Could not send request to webhook URL. Check console for details." };
    }
};

export const sendTestUserWebhook = async (): Promise<{ success: boolean; message: string }> => {
    const user = getCurrentUserFromSession();
    if (!user?.id) {
        return { success: false, message: "You are not logged in." };
    }

    if (user.status === 'trial') {
        return { success: false, message: "Webhooks are not available for trial accounts." };
    }

    const { data: profile, error } = await supabase
        .from('users')
        .select('webhook_url')
        .eq('id', user.id)
        .single();
    
    if (error || !profile || !profile.webhook_url) {
        return { success: false, message: "No webhook URL is saved for your account." };
    }

    const webhookUrl = profile.webhook_url;
    const testPayload = {
        type: 'test',
        message: 'This is a test message from MONOKlix.com',
        timestamp: Date.now(),
        userId: user.id,
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload),
            mode: 'no-cors' 
        });
        
        // FIX: With 'no-cors', the response is opaque, so we can't check its status.
        // We assume the request was sent successfully if no error was thrown.
        return { success: true, message: `Test payload sent. Please check your webhook service to confirm receipt. (Note: Due to browser security, we cannot confirm the server's response).` };
        
    } catch (e) {
        console.error("Webhook test failed:", e);
        return { success: false, message: 'Test failed. Could not send request. Check console for details.' };
    }
};

export const sendRegistrationToWebhook = async (
    fullName: string,
    email: string,
    phone: string
): Promise<{ success: boolean; message: string }> => {
    // This function now saves the trial user directly to the database.
    const { error } = await supabase
        .from('trial_user')
        .insert({
            username: fullName,
            email: email.trim().toLowerCase(),
            phone: phone,
            storyboard_usage_count: 0 // Initialize usage count
        });

    if (error) {
        console.error('Failed to register trial user:', error);
        if (error.code === '23505') { // unique constraint violation
            return { success: false, message: "This email is already registered as a trial user." };
        }
        return { success: false, message: `Failed to submit registration: ${error.message}` };
    }
    
    // Optional: Keep an external webhook call for other automations if needed.
    const externalWebhookUrl = "https://n8n.1za7.com/webhook/register-new-users";
    if (externalWebhookUrl) {
        fetch(externalWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, phone, timestamp: new Date().toISOString() })
        }).catch(e => console.error("Optional: Failed to call external registration webhook:", e));
    }

    return { success: true, message: "Registration submitted successfully!" };
};

export const triggerErrorWebhook = async (error: unknown) => {
    if (!ERROR_WEBHOOK_URL) {
        return; // Webhook is disabled if URL is not set.
    }

    const user = getCurrentUserFromSession();

    // 1. Determine Error Code and Message
    let message: string;
    let errorCode: string | undefined;

    if (error instanceof Error) {
        message = error.message;
    } else {
        message = String(error);
    }
    
    try {
        const jsonMatch = message.match(/(\{.*\})/s);
        if (jsonMatch && jsonMatch[0]) {
            const errorObj = JSON.parse(jsonMatch[0]);
            if (errorObj?.error?.code) {
                errorCode = String(errorObj.error.code);
            }
        }
    } catch (e) { /* ignore json parsing errors */ }
    
    if (!errorCode) {
        const codeMatch = message.match(/\[(\d{3})\]|\b(\d{3})\b/);
        if (codeMatch) errorCode = codeMatch[1] || codeMatch[2];
    }

    const lowerCaseMessage = message.toLowerCase();
    
    if (!errorCode) {
        if (lowerCaseMessage.includes('permission denied') || lowerCaseMessage.includes('api key not valid') || lowerCaseMessage.includes('api key not found')) {
            errorCode = '403';
        } else if (lowerCaseMessage.includes('resource exhausted')) {
            errorCode = '429';
        } else if (lowerCaseMessage.includes('bad request')) {
            errorCode = '400';
        } else if (lowerCaseMessage.includes('server error') || lowerCaseMessage.includes('503')) {
            errorCode = '500';
        } else if (lowerCaseMessage.includes('failed to fetch')) {
            errorCode = 'NET';
        }
    }

    // 2. Determine Cause and Solution (in Malay)
    let punca = "Tidak diketahui.";
    let penyelesaian = "Sila semak log teknikal untuk maklumat lanjut.";

    if (lowerCaseMessage.includes('veo auth token is required')) {
        punca = "Token pengesahan Veo 3.0 telah tamat tempoh, hilang, atau tidak sah.";
        penyelesaian = "Admin perlu mendapatkan token `__SESSION` yang baru dari labs.google.com dan mengemas kini pangkalan data.";
    } else {
        switch(errorCode) {
            case '401':
            case '403':
                 if (lowerCaseMessage.includes('api key not found')) {
                     punca = "Tiada Kunci API aktif yang ditemui dalam sesi pengguna. Ini berlaku sebelum panggilan API dibuat.";
                     penyelesaian = "Pengguna perlu memasukkan Kunci API peribadi mereka di halaman Tetapan, atau menuntut kunci sementara melalui ikon Kunci di bahagian atas kanan.";
                } else {
                     punca = "Kunci API tidak sah, tamat tempoh, atau tiada kebenaran yang betul. Ralat ini datang dari pelayan Google.";
                     penyelesaian = "Pengguna perlu menyemak Kunci API mereka di Tetapan atau menuntut kunci sementara yang baru. Jika masalah berterusan, Kunci API mungkin perlu dijana semula di Google AI Studio.";
                }
                break;
            case '400':
                punca = "Permintaan tidak sah, kemungkinan besar disebabkan oleh penapis keselamatan (safety filters) Google yang menyekat kandungan dalam prompt atau imej.";
                penyelesaian = "Nasihatkan pengguna untuk mengubah suai prompt mereka (guna perkataan lebih neutral) atau menggunakan imej rujukan yang berbeza.";
                break;
            case '429':
                punca = "Pengguna telah melebihi had penggunaan (rate limit) yang dibenarkan oleh API, selalunya had percuma.";
                penyelesaian = "Pengguna perlu menunggu 1-2 minit sebelum mencuba semula. Jika masalah ini kerap berlaku, mereka mungkin perlu mengaktifkan pengebilan pada projek Google Cloud mereka.";
                break;
            case '500':
            case '503':
                punca = "Masalah sementara di pihak pelayan Google (Internal Server Error).";
                penyelesaian = "Ini bukan isu di pihak pengguna. Nasihatkan pengguna untuk mencuba semula dalam beberapa minit.";
                break;
            case 'NET':
                punca = "Masalah sambungan internet di pihak pengguna, atau sesuatu seperti firewall/ad-blocker menyekat permintaan.";
                penyelesaian = "Pengguna perlu menyemak sambungan internet mereka, memuat semula halaman, atau melumpuhkan sementara perisian VPN/firewall.";
                break;
        }
    }
    
    // 3. Construct Payload
    const mainErrorMessage = message.split('\n')[0];

    const errorDetails = {
        code: errorCode || 'N/A',
        punca: punca,
        penyelesaian: penyelesaian,
        raw_message: message, // Keep the full raw message for debugging
    };

    const payload: ErrorWebhookPayload = {
        errorMessage: mainErrorMessage,
        errorObject: JSON.stringify(errorDetails, null, 2),
        timestamp: Date.now(),
        userId: user?.id || 'unknown',
        username: user?.username || 'unknown',
        email: user?.email || 'unknown',
    };

    // 4. Send Webhook
    try {
        await fetch(ERROR_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'no-cors'
        });
        console.log('Error webhook triggered.');
    } catch (e) {
        console.error('Failed to trigger error webhook:', e);
    }
};