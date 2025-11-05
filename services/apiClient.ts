import { addLogEntry } from './aiLogService';
// FIX: The 'User' type is not exported from 'userService'. It is defined and exported from '../types'.
// This change corrects the import path to resolve the module declaration error.
import { getVeoAuthTokens } from './userService';
import { type User } from '../types';
import eventBus from './eventBus';
import { supabase } from './supabaseClient';

export const getVeoProxyUrl = (): string => {
  const userSelectedProxy = sessionStorage.getItem('selectedProxyServer');
  if (userSelectedProxy) {
      console.log('[API Client] Using user-selected VEO proxy:', userSelectedProxy);
      return userSelectedProxy;
  }
  const fallbackUrl = process.env.NODE_ENV === 'production' ? 'https://veox.monoklix.com' : '';
  console.log('[API Client] No user-selected VEO proxy found, using fallback:', fallbackUrl);
  return fallbackUrl;
};

export const getImagenProxyUrl = (): string => {
  const userSelectedProxy = sessionStorage.getItem('selectedProxyServer');
  if (userSelectedProxy) {
      console.log('[API Client] Using user-selected Imagen proxy:', userSelectedProxy);
      return userSelectedProxy;
  }
  const fallbackUrl = process.env.NODE_ENV === 'production' ? 'https://gemx.monoklix.com' : '';
  console.log('[API Client] No user-selected Imagen proxy found, using fallback:', fallbackUrl);
  return fallbackUrl;
};

const getPersonalToken = (): { token: string; createdAt: string; } | null => {
    try {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.personalAuthToken) {
                return { token: user.personalAuthToken, createdAt: 'personal' };
            }
        }
    } catch (e) {
        console.error("Could not parse user from localStorage to get personal token", e);
    }
    return null;
};

const getCurrentUserInternal = (): User | null => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson) as User;
            if (user && user.id) {
                return user;
            }
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage for activity log.", error);
    }
    return null;
};


export const executeProxiedRequest = async (
  endpoint: string,
  requestBody: any,
  logContext: string,
  specificToken?: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ data: any; successfulToken: string }> => {
  console.log(`[API Client] Starting process for: ${logContext}`);
  const currentUser = getCurrentUserInternal();

  // --- Per-Server Queueing Logic ---
  const isGenerationRequest = logContext.includes('GENERATE') || logContext.includes('RECIPE');
  if (isGenerationRequest) {
    if (onStatusUpdate) onStatusUpdate('Semua slot sedang digunakan. Anda berada dalam barisan menunggu...');
    
    const imagenProxyUrl = getImagenProxyUrl();
    const veoProxyUrl = getVeoProxyUrl();
    const serverUrl = endpoint.startsWith(imagenProxyUrl) ? imagenProxyUrl : veoProxyUrl;

    let slotAcquired = false;
    while (!slotAcquired) {
        const { data: acquired, error } = await supabase.rpc('request_generation_slot', { 
            cooldown_seconds: 10,
            server_url: serverUrl
        });

        if (error) {
            console.error('Error requesting generation slot:', error);
            if (onStatusUpdate) onStatusUpdate('');
            throw new Error(`Database error while requesting a generation slot: ${error.message}`);
        }
        if (acquired) {
            slotAcquired = true;
        } else {
            if (onStatusUpdate) onStatusUpdate('Mencuba semula untuk mendapatkan slot dalam 2 saat...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s and poll again
        }
    }
    if (onStatusUpdate) onStatusUpdate('Slot berjaya diperoleh. Memulakan penjanaan...');
  }
  // --- End Queueing Logic ---

  let tokenToUse: { token: string; createdAt: string; } | null = null;
  let tokenIdentifier: string;

  if (specificToken) {
    console.log(`[API Client] Using specific token provided for ${logContext}`);
    tokenIdentifier = 'Provided Token';
    tokenToUse = { token: specificToken, createdAt: 'specific' };
  } else {
    tokenToUse = getPersonalToken();
    tokenIdentifier = 'Personal Token';
    if (!tokenToUse) {
        console.error(`[API Client] Aborting ${logContext}: No personal auth token found for the current user.`);
        throw new Error(`Personal Auth Token is required for ${logContext}, but none was found. Please re-login or check your account.`);
    }
    console.log(`[API Client] Using user's personal token for ${logContext}`);
  }

  if (onStatusUpdate) onStatusUpdate(`Attempting generation with ${tokenIdentifier}...`);
  console.log(`[API Client] Attempting ${logContext} with ${tokenIdentifier} (...${tokenToUse.token.slice(-6)})`);
  addLogEntry({ model: logContext, prompt: `Attempt with ${tokenIdentifier}`, output: `...${tokenToUse.token.slice(-6)}`, tokenCount: 0, status: "Success" });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse.token}`,
        'x-user-username': currentUser?.username || 'unknown',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log(`[API Client] Response for ${logContext} with ${tokenIdentifier}. Status: ${response.status}`);

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || `API call failed (${response.status})`;
      throw new Error(errorMessage);
    }
    
    console.log(`✅ [API Client] Success for ${logContext} with ${tokenIdentifier}`);
    return { data, successfulToken: tokenToUse.token };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [API Client] ${tokenIdentifier} failed for ${logContext}:`, errorMessage);
    addLogEntry({ model: logContext, prompt: `${tokenIdentifier} failed`, output: errorMessage, tokenCount: 0, status: 'Error', error: errorMessage });

    if (tokenIdentifier === 'Personal Token') {
      eventBus.dispatch('personalTokenFailed');
    }
    
    throw error;
  }
};