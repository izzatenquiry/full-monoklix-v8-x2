import { type User, type LoginResult, UserRole, UserStatus } from '../types';
import { supabase, type Database } from './supabaseClient';
import { loadData } from './indexedDBService';
import { MODELS } from './aiConfig';
import { APP_VERSION } from './appConfig';

type UserProfileData = Database['public']['Tables']['users']['Row'];
type TrialUserProfileData = Database['public']['Tables']['trial_user']['Row'];

/**
 * Helper to extract a readable error message from various error types.
 * @param error The error object.
 * @returns A readable string message.
 */
const getErrorMessage = (error: unknown): string => {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        message = (error as any).message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        try {
            message = JSON.stringify(error);
        } catch {
            // Fallback if stringify fails (e.g., circular reference)
            message = 'Unserializable error object.';
        }
    }
    return message;
};

/**
 * Maps a user profile from the database to the application's User type.
 */
const mapProfileToUser = (
  profile: UserProfileData
): User => {
  return {
    id: profile.id,
    email: profile.email,
    createdAt: profile.created_at,
    username: (profile.email || '').split('@')[0], // Fallback username
    fullName: profile.full_name || undefined,
    phone: profile.phone,
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    apiKey: profile.api_key,
    avatarUrl: profile.avatar_url || undefined,
    subscriptionExpiry: profile.subscription_expiry ? new Date(profile.subscription_expiry).getTime() : undefined,
    webhookUrl: profile.webhook_url || undefined,
    totalImage: profile.total_image ?? undefined,
    totalVideo: profile.total_video ?? undefined,
    lastSeenAt: profile.last_seen_at || undefined,
    forceLogoutAt: profile.force_logout_at || undefined,
    appVersion: profile.app_version || undefined,
    personalAuthToken: profile.personal_auth_token || undefined,
    proxyServer: profile.proxy_server || undefined,
  };
};

/**
 * Maps a trial user profile from the database to the application's User type.
 */
const mapTrialProfileToUser = (profile: TrialUserProfileData): User => {
  return {
    id: `trial-${profile.id}`, // Create a unique ID format for trial users
    email: profile.email,
    createdAt: profile.created_at,
    username: profile.username || profile.email.split('@')[0],
    fullName: profile.username,
    phone: profile.phone,
    role: 'user', // Trial users have 'user' role
    status: 'trial', // Their status is 'trial'
    apiKey: null, // Trial users don't have personal API keys
    storyboardUsageCount: profile.storyboard_usage_count,
  };
};

// Log in a user by checking their email directly against the database.
export const loginUser = async (email: string): Promise<LoginResult> => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
        return { success: false, message: 'Please enter your email address.' };
    }
    
    // 1. Check for a full user (lifetime, admin, etc.) first
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanedEmail)
        .single();
    
    // If a user is found in the main 'users' table, they are a full user.
    if (userData && !userError) {
        const typedData = userData as UserProfileData;
        const user = mapProfileToUser(typedData);
        return { success: true, user };
    }

    // 2. If not a full user, check for a trial user
    const { data: trialUserData, error: trialUserError } = await supabase
        .from('trial_user')
        .select('*')
        .eq('email', cleanedEmail)
        .single();

    if (trialUserData && !trialUserError) {
        const typedData = trialUserData as TrialUserProfileData;
        const user = mapTrialProfileToUser(typedData);
        return { success: true, user };
    }
    
    // 3. If not found in either table
    return { success: false, message: 'This email is not registered. Please check your email or register for an account.' };
};

// Sign out the current user (clears Supabase session)
export const signOutUser = async (): Promise<void> => {
    // Session is managed in App.tsx via localStorage. No Supabase call needed.
    // This function is kept for structural consistency if called from somewhere.
    return Promise.resolve();
};

// Get all users (for admin dashboard)
export const getAllUsers = async (): Promise<User[] | null> => {
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error fetching all users:', getErrorMessage(error));
        return null;
    }

    return (data as UserProfileData[]).map(profile => mapProfileToUser(profile));
};

// Update a user's status
export const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
    const updatePayload: { status: UserStatus; subscription_expiry?: string | null } = { status: status };

    // If status is NOT subscription, clear the expiry date.
    if (status !== 'subscription') {
        updatePayload.subscription_expiry = null;
    }

    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId);

    if (error) {
        console.error("Failed to update status:", getErrorMessage(error));
        return false;
    }
    return true;
};

/**
 * Sets a user to the 'subscription' status and calculates their expiry date.
 */
export const updateUserSubscription = async (userId: string, expiryMonths: 6 | 12): Promise<boolean> => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

    const { error } = await supabase
        .from('users')
        .update({ status: 'subscription', subscription_expiry: expiryDate.toISOString() })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update subscription:", getErrorMessage(error));
        return false;
    }
    return true;
};


/**
 * Triggers a remote logout for a user by setting the `force_logout_at` timestamp.
 * This does not change their account status.
 */
export const forceUserLogout = async (userId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('users')
        .update({ force_logout_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) {
        console.error("Failed to force logout:", getErrorMessage(error));
        return false;
    }
    return true;
};

// Update user profile details (non-sensitive)
export const updateUserProfile = async (
  userId: string,
  updates: { fullName?: string; email?: string; avatarUrl?: string }
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    
    const profileUpdates: { full_name?: string; avatar_url?: string } = {};
    if (updates.fullName) profileUpdates.full_name = updates.fullName;
    if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;

    const { data: updatedData, error } = await supabase
        .from('users')
        // FIX: This operation is now correctly typed after fixing supabaseClient.ts types.
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};


/**
 * Replaces the entire user database with an imported list.
 */
export const replaceUsers = async (importedUsers: User[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(importedUsers)) {
            return { success: false, message: 'Import file must be an array of users.' };
        }
        
        const profilesToInsert: Database['public']['Tables']['users']['Insert'][] = importedUsers.map(user => ({
            id: user.id,
            created_at: user.createdAt,
            full_name: user.fullName || null,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            api_key: user.apiKey || null,
            avatar_url: user.avatarUrl || null,
            subscription_expiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString() : null,
            webhook_url: user.webhookUrl || null,
            total_image: user.totalImage || 0,
            total_video: user.totalVideo || 0,
        }));
        
        // FIX: Replaced `.neq()` with `.not('role', 'eq', ...)` for better type compatibility with Supabase client.
        const { error: deleteError } = await supabase.from('users').delete().not('role', 'eq', 'admin');
        if (deleteError) throw deleteError;

        // FIX: This operation is now correctly typed after fixing supabaseClient.ts types.
        const { error: insertError } = await supabase.from('users').insert(profilesToInsert);
        if (insertError) throw insertError;

        return { success: true, message: 'User database successfully imported.' };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to import users:", message);
        return { success: false, message: `An error occurred during import: ${message}` };
    }
};

export const exportAllUserData = async (): Promise<UserProfileData[] | null> => {
     const { data, error } = await supabase.from('users').select('*');
     if (error) {
        console.error('Error exporting user data:', getErrorMessage(error));
        return null;
     }
     return data as UserProfileData[];
};

/**
 * Initializes/repairs the admin account.
 */
export const initializeAdminAccount = async () => {
    console.log("Checking/repairing admin account profile...");

    const adminEmail = 'izzat.enquiry@gmail.com';
    
    const { data: adminUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .eq('role', 'admin')
        .single();
        
    if (findError || !adminUser) {
        console.warn('Admin user profile not found in public.users. Manual creation might be needed if this is the first run.');
        return;
    }
    
    // FIX: The type of `adminUser` is now correctly inferred, so `adminUser.id` is accessible.
    const adminUserId = adminUser.id;

    const profileData: Database['public']['Tables']['users']['Insert'] = {
        id: adminUserId,
        full_name: 'MONOklix Admin',
        email: adminEmail,
        phone: '+601111303527', // Default phone
        role: 'admin',
        status: 'admin',
    };
    
    // FIX: This operation is now correctly typed after fixing supabaseClient.ts types.
    const { error: upsertError } = await supabase.from('users').upsert(profileData, { onConflict: 'id' });

    if (upsertError) {
        console.error('Failed to upsert admin profile:', getErrorMessage(upsertError));
    } else {
        console.log('Admin profile successfully configured in database.');
    }
};

// Update user webhook URL
export const updateUserWebhookUrl = async (
  userId: string,
  webhookUrl: string | null
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    const { data: updatedData, error } = await supabase
        .from('users')
        // FIX: This operation is now correctly typed after fixing supabaseClient.ts types.
        .update({ webhook_url: webhookUrl })
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};

// Update user's personal auth token
export const saveUserPersonalAuthToken = async (
  userId: string,
  token: string | null
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    const { data: updatedData, error } = await supabase
        .from('users')
        .update({ personal_auth_token: token })
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        const message = getErrorMessage(error);
        // Check for the specific schema error
        if (message.includes("column") && message.includes("does not exist")) {
             if (message.includes('personal_auth_token')) {
                 return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
             }
        }
        return { success: false, message: message };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};

/**
 * Assigns a personal auth token to a user and increments the usage count for that token.
 * This version uses a database function (RPC) to perform an atomic check-and-increment,
 * which is the robust solution to prevent race conditions.
 * @param userId The ID of the user.
 * @param token The token string to assign.
 * @returns The updated user object on success.
 */
export const assignPersonalTokenAndIncrementUsage = async (userId: string, token: string): Promise<{ success: true, user: User } | { success: false, message: string }> => {
    try {
        // Step 1: Atomically increment the token count using a database function (RPC).
        const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
            'increment_token_if_available', 
            { token_to_check: token }
        );

        if (rpcError) {
            throw new Error(`Database function error: ${rpcError.message}. Ensure 'increment_token_if_available' function exists in Supabase.`);
        }
        
        if (rpcSuccess !== true) {
            // This is not an error, but a normal race condition outcome. The slot was taken.
            const message = `Token usage limit reached by the time of assignment. Trying next token.`;
            console.log(`Token slot for ...${token.slice(-6)} was taken by another user. Trying next token.`);
            return { success: false, message: message };
        }

        // Step 2: If the increment was successful, assign the token to the user.
        const { data: updatedUserData, error: userUpdateError } = await supabase
            .from('users')
            .update({ personal_auth_token: token })
            .eq('id', userId)
            .select()
            .single();
        
        if (userUpdateError) {
             console.error("CRITICAL: Failed to assign token to user AFTER incrementing count. Manual DB correction may be needed for token:", token);
             
             const message = getErrorMessage(userUpdateError);
             if (message.includes("column") && message.includes("does not exist")) {
                 if (message.includes('personal_auth_token')) {
                     return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
                 }
             }
             throw userUpdateError;
        }

        if (!updatedUserData) {
            throw new Error(`User with ID ${userId} not found after update. The assignment might have failed due to database permissions (RLS).`);
        }

        const user = mapProfileToUser(updatedUserData as UserProfileData);
        return { success: true, user };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to assign token and increment usage:", message);
        
        if (message.includes('DB_SCHEMA_MISSING_COLUMN_personal_auth_token')) {
            return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
        }
        
        return { success: false, message };
    }
};


/**
 * Type definition for the structured details of an AI generation log.
 * Keys use snake_case to match the database schema directly.
 */
type AiGenerationLogData = {
    model: string;
    prompt: string;
    output: string;
    token_count: number;
    status: 'Success' | 'Error';
    error_message?: string | null;
};

/**
 * Logs a user activity to the Supabase database.
 * This is a fire-and-forget operation; errors are logged to the console but not thrown.
 * @param activity_type Describes the activity ('login' or 'ai_generation').
 * @param details An optional structured object for AI generation activities.
 */
export const logActivity = async (
    activity_type: 'login' | 'ai_generation',
    details?: AiGenerationLogData
): Promise<void> => {
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

    const user = getCurrentUserInternal();

    if (!user) {
        // Fail silently if no user. We don't want to block user actions for logging.
        console.warn('Cannot log activity: user not found.');
        return;
    }

    // For the demo site, trial users are not logged to the main activity_log
    // because their IDs are not UUIDs and would cause a foreign key constraint violation.
    if (user.status === 'trial') {
        console.log("Skipping Supabase activity log for trial user.");
        return;
    }

    try {
        const baseLog = {
            user_id: user.id,
            username: user.username,
            email: user.email,
            activity_type,
        };

        // Conditionally add details for AI generation logs
        const logData = activity_type === 'ai_generation' && details
            ? { ...baseLog, ...details }
            : baseLog;

        const { error } = await supabase
            .from('activity_log')
            .insert(logData);
        
        if (error) {
            console.error('Failed to log activity to Supabase:', error.message);
        }
    } catch (e) {
        console.error('Exception while logging activity:', e);
    }
};

/**
 * Fetches the most recent VEO 3.0 auth tokens from the Supabase auth_token table.
 * @returns {Promise<{ token: string; createdAt: string }[] | null>} An array of token objects or null if not found/error.
 */
export const getVeoAuthTokens = async (): Promise<{ token: string; createdAt: string }[] | null> => {
    const { data, error } = await supabase
        .from('token_new_active')
        .select('token, created_at')
        .lt('total_user', 10) // Only fetch tokens with less than 10 users.
        .or('status.is.null,status.neq.expired') // Fetch if status is NULL or not 'expired'
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error fetching VEO auth tokens:', getErrorMessage(error));
        return null;
    }

    if (data && data.length > 0) {
        // Reverse the array so the oldest of the 30 latest tokens is first.
        return data.reverse().map(item => ({ token: item.token, createdAt: item.created_at }));
    }
    
    return null;
};


/**
 * Fetches the latest shared master API key from the database.
 * This key is used for trial users or users with low usage.
 * @returns {Promise<string | null>} The API key string or null if not found/error.
 */
export const getSharedMasterApiKey = async (): Promise<string | null> => {
    const { data, error } = await supabase
        .from('master_api_key')
        .select('api_key')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching shared master API key:', getErrorMessage(error));
        return null;
    }

    return data?.api_key || null;
};

// FIX: Add missing functions and types for ApiGeneratorView.
/**
 * Type definition for an API key available for claiming.
 */
export interface AvailableApiKey {
  id: number;
  apiKey: string;
  createdAt: string;
}

/**
 * Fetches all unclaimed API keys from the database.
 * @returns {Promise<AvailableApiKey[]>} A promise that resolves to an array of available keys.
 */
export const getAvailableApiKeys = async (): Promise<AvailableApiKey[]> => {
    const { data, error } = await supabase
        .from('generated_api_keys')
        .select('id, api_key, created_at')
        .is('claimed_by_user_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching available API keys:", getErrorMessage(error));
        throw error;
    }

    // FIX: Corrected property access from snake_case (api_key, created_at) to camelCase (apiKey, createdAt) to match the AvailableApiKey interface.
    return data.map(key => ({
        id: key.id,
        apiKey: key.api_key,
        createdAt: key.created_at
    }));
};

/**
 * Claims an available API key for a specific user.
 * @param {number} keyId - The ID of the key to claim.
 * @param {string} userId - The ID of the user claiming the key.
 * @param {string} username - The username of the user claiming the key.
 * @returns {Promise<{ success: boolean; message?: string }>} A promise indicating success or failure.
 */
export const claimApiKey = async (keyId: number, userId: string, username: string): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase
        .from('generated_api_keys')
        .update({
            claimed_by_user_id: userId,
            claimed_by_username: username,
            claimed_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .is('claimed_by_user_id', null); // Prevent race conditions

    if (error) {
        console.error('Failed to claim API key:', getErrorMessage(error));
        return { success: false, message: getErrorMessage(error) };
    }
    
    return { success: true };
};

/**
 * Saves a new API key to a user's profile.
 * @param {string} userId - The ID of the user.
 * @param {string} apiKey - The new API key to save.
 * @returns {Promise<{ success: true; user: User } | { success: false; message: string }>} The result of the update.
 */
export const saveUserApiKey = async (userId: string, apiKey: string): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    const { data: updatedData, error } = await supabase
        .from('users')
        .update({ api_key: apiKey })
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};

export const incrementStoryboardUsage = async (userId: string): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    try {
        // Check if it's a trial user by the ID format
        if (userId.startsWith('trial-')) {
            const trialUserId = parseInt(userId.replace('trial-', ''), 10);
            if (isNaN(trialUserId)) throw new Error("Invalid trial user ID format.");

            const { data: currentData, error: fetchError } = await supabase
                .from('trial_user')
                .select('storyboard_usage_count')
                .eq('id', trialUserId)
                .single();
            
            if (fetchError) throw fetchError;
            
            const currentCount = currentData?.storyboard_usage_count || 0;

            const { data: updatedData, error: updateError } = await supabase
                .from('trial_user')
                .update({ storyboard_usage_count: currentCount + 1 })
                .eq('id', trialUserId)
                .select()
                .single();

            if (updateError) throw updateError;
            
            const typedData = updatedData as TrialUserProfileData;
            const user = mapTrialProfileToUser(typedData);
            
            return { success: true, user };

        } else {
            // This is a regular user. Storyboard usage is not tracked for them.
            // We just fetch their latest profile and return it to satisfy the function signature.
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            
            const typedData = userData as UserProfileData;
            const user = mapProfileToUser(typedData);
            
            return { success: true, user: user };
        }

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to increment storyboard usage:", message);
        return { success: false, message };
    }
};

export const incrementImageUsage = async (userId: string): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    if (userId.startsWith('trial-')) {
        const trialUserId = parseInt(userId.replace('trial-', ''), 10);
        if (isNaN(trialUserId)) return { success: false, message: "Invalid trial user ID." };
        
        const { data, error } = await supabase.from('trial_user').select('*').eq('id', trialUserId).single();
        if (error || !data) return { success: false, message: "Trial user not found." };
        // FIX: Called the correct mapping function 'mapTrialProfileToUser' for trial user data.
        return { success: true, user: mapTrialProfileToUser(data as TrialUserProfileData) };
    }
    try {
        const { data: currentData, error: fetchError } = await supabase
            .from('users')
            .select('total_image')
            .eq('id', userId)
            .single();
        if (fetchError) throw fetchError;
        const currentCount = Number(currentData?.total_image || 0);
        const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update({ total_image: currentCount + 1 })
            .eq('id', userId)
            .select()
            .single();
        if (updateError) throw updateError;
        return { success: true, user: mapProfileToUser(updatedData as UserProfileData) };
    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to increment image usage:", message);
        return { success: false, message };
    }
};

export const incrementVideoUsage = async (userId: string): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    if (userId.startsWith('trial-')) {
        const trialUserId = parseInt(userId.replace('trial-', ''), 10);
        if (isNaN(trialUserId)) return { success: false, message: "Invalid trial user ID." };
        
        const { data, error } = await supabase.from('trial_user').select('*').eq('id', trialUserId).single();
        if (error || !data) return { success: false, message: "Trial user not found." };
        return { success: true, user: mapTrialProfileToUser(data as TrialUserProfileData) };
    }
    try {
        const { data: currentData, error: fetchError } = await supabase
            .from('users')
            .select('total_video')
            .eq('id', userId)
            .single();
        if (fetchError) throw fetchError;
        const currentCount = Number(currentData?.total_video || 0);
        const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update({ total_video: currentCount + 1 })
            .eq('id', userId)
            .select()
            .single();
        if (updateError) throw updateError;
        return { success: true, user: mapProfileToUser(updatedData as UserProfileData) };
    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to increment video usage:", message);
        return { success: false, message };
    }
};

/**
 * Updates the last seen timestamp for a given user. This is a fire-and-forget
 * operation used for tracking user activity.
 * @param {string} userId - The ID of the user to update.
 */
export const updateUserLastSeen = async (userId: string): Promise<void> => {
    // Trial users are not in the 'users' table, so we skip this for them.
    if (userId.startsWith('trial-')) {
        return;
    }
    try {
        const { error } = await supabase
            .from('users')
            .update({ 
                last_seen_at: new Date().toISOString(),
                app_version: APP_VERSION 
            })
            .eq('id', userId);
        
        if (error) {
            // This is a background task, so we just log the error without throwing
            console.warn('Failed to update last_seen_at:', getErrorMessage(error));
        }
    } catch (error) {
        console.error('Exception while updating last_seen_at:', getErrorMessage(error));
    }
};

export const getServerUsageCounts = async (): Promise<Record<string, number>> => {
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('users')
      .select('proxy_server')
      .not('proxy_server', 'is', null)
      .gte('last_seen_at', fortyFiveMinutesAgo);

    if (error) {
      console.error('Error fetching server usage counts:', getErrorMessage(error));
      return {};
    }

    const counts = data.reduce((acc, { proxy_server }) => {
      if (proxy_server) {
        acc[proxy_server] = (acc[proxy_server] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return counts;
};

export const updateUserProxyServer = async (userId: string, serverUrl: string | null): Promise<boolean> => {
    const { error } = await supabase
        .from('users')
        .update({ proxy_server: serverUrl })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update user's proxy server:", getErrorMessage(error));
        return false;
    }
    return true;
};

/**
 * Marks a token as expired in the database. This is a fire-and-forget operation.
 * @param token The token string to mark as expired.
 */
export const updateTokenStatusToExpired = async (token: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('token_new_active')
            .update({ status: 'expired' })
            .eq('token', token);

        if (error) {
            console.error(`Failed to mark token ...${token.slice(-6)} as expired:`, getErrorMessage(error));
        } else {
            console.log(`Successfully marked token ...${token.slice(-6)} as expired.`);
        }
    } catch (error) {
        console.error(`Exception while marking token as expired:`, getErrorMessage(error));
    }
};