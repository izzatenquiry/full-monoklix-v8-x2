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

const getSharedTokens = (): { token: string; createdAt: string }[] => {
    const tokensJSON = sessionStorage.getItem('veoAuthTokens');
    if (tokensJSON) {
        try {
            const parsed = JSON.parse(tokensJSON);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error("Could not parse VEO/Imagen tokens from session storage", e);
        }
    }
    return [];
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


export const fetchWithTokenRotation = async (
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


  let tokensToTry: { token: string; createdAt: string }[] = [];

  if (specificToken) {
    tokensToTry = [{ token: specificToken, createdAt: 'N/A' }];
  } else {
    const personalToken = getPersonalToken();
    let sharedTokens = getSharedTokens();

    // Shuffle the shared tokens to distribute the load
    for (let i = sharedTokens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sharedTokens[i], sharedTokens[j]] = [sharedTokens[j], sharedTokens[i]];
    }

    if (sharedTokens.length === 0) {
        console.log(`[API Client] No shared tokens in session for ${logContext}. Attempting re-fetch.`);
        try {
            const newTokens = await getVeoAuthTokens();
            if (newTokens && newTokens.length > 0) {
                sessionStorage.setItem('veoAuthTokens', JSON.stringify(newTokens));
                sharedTokens = newTokens;
                console.log(`[API Client] Successfully re-fetched ${newTokens.length} shared tokens.`);
            }
        } catch (e) {
            console.error('[API Client] Failed to re-fetch auth tokens:', e);
        }
    }
    
    tokensToTry = [
      ...(personalToken ? [personalToken] : []),
      ...sharedTokens
    ];
  }

  if (tokensToTry.length === 0) {
    console.error(`[API Client] Aborting ${logContext}: No auth tokens available after all checks.`);
    throw new Error(`Auth Token is required for ${logContext}. Please set one in Settings.`);
  }

  let lastError: any = null;

  for (let i = 0; i < tokensToTry.length; i++) {
    const currentToken = tokensToTry[i];
    const isPersonal = currentToken.createdAt === 'personal';
    const tokenIdentifier = isPersonal ? 'Personal Token' : `Shared Token #${i - (getPersonalToken() ? 1 : 0) + 1}`;
    
    if (onStatusUpdate) onStatusUpdate(`Attempting generation with ${tokenIdentifier}...`);
    console.log(`[API Client] Attempting ${logContext} with ${tokenIdentifier} (...${currentToken.token.slice(-6)})`);
    addLogEntry({ model: logContext, prompt: `Attempt with ${tokenIdentifier}`, output: `...${currentToken.token.slice(-6)}`, tokenCount: 0, status: "Success" });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken.token}`,
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
      return { data, successfulToken: currentToken.token };

    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [API Client] ${tokenIdentifier} failed for ${logContext}:`, errorMessage);
      addLogEntry({ model: logContext, prompt: `${tokenIdentifier} failed`, output: errorMessage, tokenCount: 0, status: 'Error', error: errorMessage });

      if (isPersonal) {
        eventBus.dispatch('personalTokenFailed');
      }

      if (i < tokensToTry.length - 1) {
        console.log(`[API Client] Retrying with next token...`);
      }
    }
  }

  console.error(`[API Client] All ${tokensToTry.length} tokens failed for ${logContext}. Final error:`, lastError);
  addLogEntry({ model: logContext, prompt: 'All available auth tokens failed.', output: `Final error: ${lastError.message}`, tokenCount: 0, status: 'Error', error: lastError.message });
  throw lastError;
};