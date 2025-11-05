import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Import Language type for state management.
import { type View, type User, type BatchProcessorPreset, type Language, UserStatus } from './types';
import Sidebar from './components/Sidebar';
import AiTextSuiteView from './components/views/AiTextSuiteView';
import AiImageSuiteView from './components/views/AiImageSuiteView';
import AiVideoSuiteView from './components/views/AiVideoSuiteView';
import ECourseView from './components/views/ECourseView';
import SettingsView from './components/views/SettingsView';
import LoginPage from './LoginPage';
import GalleryView from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import LibraryView from './components/views/LibraryView';
import { MenuIcon, LogoIcon, XIcon, SunIcon, MoonIcon, CheckCircleIcon, AlertTriangleIcon, PartyPopperIcon, RefreshCwIcon, UsersIcon, ServerIcon, ShieldCheckIcon } from './components/Icons';
import { signOutUser, logActivity, getVeoAuthTokens, getSharedMasterApiKey, updateUserLastSeen, assignPersonalTokenAndIncrementUsage, saveUserPersonalAuthToken, getServerUsageCounts, updateUserProxyServer, updateTokenStatusToExpired } from './services/userService';
import { createChatSession, streamChatResponse } from './services/geminiService';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';
import { type Chat } from '@google/genai';
import { getSupportPrompt } from './services/promptManager';
import { triggerUserWebhook } from './services/webhookService';
// FIX: Changed to a named import to resolve the "no default export" error.
import { GetStartedView } from './components/views/GetStartedView';
import AiPromptLibrarySuiteView from './components/views/AiPromptLibrarySuiteView';
import SocialPostStudioView from './components/views/SocialPostStudioView';
import eventBus from './services/eventBus';
import { TRIAL_USAGE_LIMIT } from './services/aiConfig';
import ApiKeyStatus from './components/ApiKeyStatus';
import { clearLogs } from './services/aiLogService';
import { clearVideoCache } from './services/videoCacheService';
import localforage from 'localforage';
import { supabase, type Database } from './services/supabaseClient';
import { handleApiError } from './services/errorHandler';
import { runComprehensiveTokenTest } from './services/imagenV3Service';


interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ThemeSwitcher: React.FC<{ theme: string; setTheme: (theme: string) => void }> = ({ theme, setTheme }) => (
    <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Toggle theme"
    >
        {theme === 'light' ? (
            <MoonIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        ) : (
            <SunIcon className="w-5 h-5 text-yellow-500" />
        )}
    </button>
);

const NotificationBanner: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md z-50 p-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg shadow-lg flex items-start gap-3 animate-zoomIn">
            <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="font-bold">Attention</p>
                <p className="text-sm">{message}</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

type AssigningStatus = 'scanning' | 'assigning' | 'success' | 'error';
interface AssigningTokenModalProps {
  status: AssigningStatus;
  error: string | null;
  scanProgress: { current: number; total: number };
  onRetry: () => void;
}

const AssigningTokenModal: React.FC<AssigningTokenModalProps> = ({ status, error, scanProgress, onRetry }) => {
    const statusInfo = {
        scanning: {
            icon: <Spinner />,
            title: "Preparing Your Account",
            message: scanProgress.total > 0
                ? `Scanning for a secure connection... (Slot ${scanProgress.current}/${scanProgress.total})`
                : 'Fetching available connection slots...',
        },
        assigning: {
            icon: <Spinner />,
            title: "Connection Found!",
            message: "Finalizing assignment to your account. This won't take long.",
        },
        success: {
            icon: <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto" />,
            title: "Assignment Complete!",
            message: "Your secure connection is ready. Welcome to MONOklix Studio!",
        },
        error: {
            icon: <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />,
            title: "Assignment Failed",
            message: error || "An unexpected error occurred. Please try again.",
        },
    };

    const currentStatusInfo = statusInfo[status];

    return (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4 animate-zoomIn" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center max-w-sm w-full">
                {currentStatusInfo.icon}
                <h2 className="text-xl font-bold mt-4 text-neutral-800 dark:text-neutral-100">{currentStatusInfo.title}</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-sm">
                    {currentStatusInfo.message}
                </p>
                {status === 'error' && (
                    <button onClick={onRetry} className="mt-6 w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

const SERVERS = [
    'https://s1.monoklix.com',
    'https://s2.monoklix.com',
    'https://s3.monoklix.com',
    'https://s4.monoklix.com',
    'https://s5.monoklix.com'
];

const ServerSelectionModal: React.FC<{ onSelect: (serverUrl: string) => void, currentUser: User }> = ({ onSelect, currentUser }) => {
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [serverCounts, setServerCounts] = useState<Record<string, number | 'loading'>>({});

    useEffect(() => {
        const fetchCounts = async () => {
            setServerCounts(SERVERS.reduce((acc, server) => ({...acc, [server]: 'loading'}), {}));
            const counts = await getServerUsageCounts();
            setServerCounts(counts);
        };
        fetchCounts();
    }, []);

    const handleSelect = () => {
        if (selectedServer) {
            onSelect(selectedServer);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-zoomIn" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-left max-w-lg w-full">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-full">
                        <ServerIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Pilih Pelayan Sambungan Anda</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
                            Pilih pelayan proksi untuk sesi anda. Pelayan dengan pengguna yang lebih sedikit mungkin lebih pantas.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    {SERVERS.map((server, index) => {
                        const count = serverCounts[server];
                        const serverName = `Server ${index + 1}`;
                        const userCount = typeof count === 'number' ? count : 0;
                        
                        let colorClasses = 'bg-green-500';
                        let textColor = 'text-green-700 dark:text-green-300';
                        if (userCount > 10) {
                            colorClasses = 'bg-yellow-500';
                            textColor = 'text-yellow-700 dark:text-yellow-300';
                        }
                        if (userCount > 15) {
                            colorClasses = 'bg-red-500';
                            textColor = 'text-red-700 dark:text-red-300';
                        }
                        
                        return (
                             <label key={server} className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedServer === server ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-primary-400'}`}>
                                <input
                                    type="radio"
                                    name="server-selection"
                                    value={server}
                                    checked={selectedServer === server}
                                    onChange={() => setSelectedServer(server)}
                                    className="sr-only"
                                />
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        {count !== 'loading' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses} opacity-75`}></span>}
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${colorClasses}`}></span>
                                    </span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{serverName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    <UsersIcon className="w-4 h-4" />
                                    {count === 'loading' ? <Spinner /> : (
                                        <span className={`font-bold text-base ${textColor}`}>
                                            {count || 0} <span className="text-xs text-neutral-400">/ 10</span>
                                        </span>
                                    )}
                                </div>
                            </label>
                        )
                    })}
                </div>

                <button 
                    onClick={handleSelect} 
                    disabled={!selectedServer}
                    className="mt-6 w-full bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Sahkan & Teruskan
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('home');
  const [theme, setTheme] = useState('light'); // Default to light, load async
  // FIX: Add state for language to pass down to child components for translations.
  const [language, setLanguage] = useState<Language>('en');
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [imageToReEdit, setImageToReEdit] = useState<ImageEditPreset | null>(null);
  const [imageGenPresetPrompt, setImageGenPresetPrompt] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [veoTokenRefreshedAt, setVeoTokenRefreshedAt] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showServerSelectionModal, setShowServerSelectionModal] = useState(false);
  const isAssigningTokenRef = useRef(false);
  const [assigningStatus, setAssigningStatus] = useState<AssigningStatus>('scanning');
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  }, []);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      // Clear the proxy server selection from the database on manual logout.
      // This is a fire-and-forget call; we don't need to wait for it.
      updateUserProxyServer(currentUser.id, null);
    }
    await signOutUser();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('monoklix_session_api_key'); // Clean up session key
    sessionStorage.removeItem('session_started_at'); // Clean up session start time
    sessionStorage.removeItem('selectedProxyServer'); // Clean up proxy selection
    setCurrentUser(null);
    setActiveApiKey(null);
    setActiveView('home');
  }, [currentUser]);

  const handleClearCacheAndRefresh = () => {
    if (window.confirm("This will refresh your session, log you out, and clear temporary application settings. Your saved gallery and history will NOT be deleted. Continue?")) {
        try {
            console.log("Clearing session and refreshing application...");

            // 1. Clear session-level storage to force re-authentication of keys.
            sessionStorage.clear();

            // 2. Clear local storage to log the user out and reset app state.
            localStorage.clear();
            
            // 3. Reload the page. This forces a fresh start.
            window.location.reload();

        } catch (error) {
            console.error("Failed to refresh session:", error);
            alert("An error occurred while refreshing the session. Please try again.");
        }
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
        const savedTheme = await loadData<string>('theme');
        if (savedTheme) setTheme(savedTheme);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveData('theme', theme);
  }, [theme]);
  
  // Effect to listen for events that require user updates
  useEffect(() => {
    const handleUserUsageUpdate = (updatedUser: User) => {
      console.log('App: User usage stats updated via event bus. Refreshing state.');
      handleUserUpdate(updatedUser);
    };

    eventBus.on('userUsageUpdated', handleUserUsageUpdate);

    return () => {
      eventBus.remove('userUsageUpdated', handleUserUsageUpdate);
    };
  }, [handleUserUpdate]);
  
  // Effect to check for an active session in localStorage on initial load.
  useEffect(() => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson);
            setCurrentUser(user);
            sessionStorage.setItem('session_started_at', new Date().toISOString());
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('currentUser');
    }
    setSessionChecked(true);
  }, []);

  // Effect to handle personal token failure
  useEffect(() => {
    const handlePersonalTokenFailure = async () => {
      if (currentUser && currentUser.personalAuthToken) {
        setNotification('Sambungan akaun anda telah dikemas kini secara automatik.');
        
        // Clear the bad token from the user's profile
        const result = await saveUserPersonalAuthToken(currentUser.id, null);
        if (result.success) {
          handleUserUpdate(result.user);
        }
        
        // Hide notification after a delay
        setTimeout(() => setNotification(null), 8000);
      }
    };

    eventBus.on('personalTokenFailed', handlePersonalTokenFailure);

    return () => {
      eventBus.remove('personalTokenFailed', handlePersonalTokenFailure);
    };
  }, [currentUser, handleUserUpdate]);

  // Effect to fetch session data (API keys, tokens) once a user is logged in.
  useEffect(() => {
    const initializeSessionData = async () => {
      if (!currentUser?.id) {
        // Clear all session-specific data on logout
        setActiveApiKey(null);
        sessionStorage.removeItem('monoklix_session_api_key');
        sessionStorage.removeItem('veoAuthTokens');
        sessionStorage.removeItem('veoAuthToken');
        sessionStorage.removeItem('veoAuthTokenCreatedAt');
        setIsApiKeyLoading(false);
        return;
      }

      setIsApiKeyLoading(true);
      try {
        // Fetch master key and VEO tokens in parallel for efficiency
        const [masterKey, tokensData] = await Promise.all([
          getSharedMasterApiKey(),
          getVeoAuthTokens(),
        ]);

        // Handle Master API Key
        if (masterKey) {
          sessionStorage.setItem('monoklix_session_api_key', masterKey);
          setActiveApiKey(masterKey);
          console.log(`Shared master API key (...${masterKey.slice(-4)}) loaded and set in session storage.`);
        } else {
          console.error("CRITICAL: Could not fetch master API key from Supabase.");
          setActiveApiKey(null);
        }

        // Handle VEO Auth Tokens
        if (tokensData && tokensData.length > 0) {
          sessionStorage.setItem('veoAuthTokens', JSON.stringify(tokensData));
          sessionStorage.setItem('veoAuthToken', tokensData[0].token);
          sessionStorage.setItem('veoAuthTokenCreatedAt', tokensData[0].createdAt);
          setVeoTokenRefreshedAt(new Date().toISOString());
          console.log(`${tokensData.length} VEO Auth Tokens loaded from Supabase and set in session storage.`);
        } else {
          sessionStorage.removeItem('veoAuthTokens');
          sessionStorage.removeItem('veoAuthToken');
          sessionStorage.removeItem('veoAuthTokenCreatedAt');
          console.warn("Could not fetch any VEO Auth Tokens from Supabase.");
        }

      } catch (error) {
        console.error("Error initializing session data (API key & VEO tokens):", error);
        setActiveApiKey(null); // Ensure we're in a clean error state
      } finally {
        setIsApiKeyLoading(false);
      }
    };

    initializeSessionData();
  }, [currentUser?.id]);


  useEffect(() => {
    if (justLoggedIn) {
        setIsShowingWelcome(true);
        setJustLoggedIn(false); // Reset the flag
    }
  }, [justLoggedIn]);
  
   // Effect for user heartbeat (active status)
    useEffect(() => {
        if (currentUser?.id) {
            // Initial update on login
            updateUserLastSeen(currentUser.id);

            const heartbeatInterval = setInterval(() => {
                updateUserLastSeen(currentUser!.id);
            }, 30000); // Send a heartbeat every 30 seconds

            return () => clearInterval(heartbeatInterval);
        }
    }, [currentUser?.id]);

    // Effect for real-time remote logout listener
    useEffect(() => {
        if (!currentUser?.id || currentUser.status === 'trial') return;

        const channel = supabase
            .channel(`user-session-channel-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${currentUser.id}`,
                },
                (payload) => {
                    const newUserData = payload.new as Database['public']['Tables']['users']['Row'];
                    const forceLogoutAt = newUserData.force_logout_at;
                    
                    if (forceLogoutAt) {
                        const sessionStartedAt = sessionStorage.getItem('session_started_at');
                        if (sessionStartedAt && new Date(forceLogoutAt) > new Date(sessionStartedAt)) {
                            alert('Your session has been terminated by an administrator.');
                            handleLogout();
                        }
                    }
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, currentUser?.status, handleLogout]);

    const assignTokenProcess = useCallback(async (): Promise<{ success: boolean; error: string | null; }> => {
        if (!currentUser || isAssigningTokenRef.current) {
            return { success: false, error: "Process is already running or user not available." };
        }
        
        if (currentUser.status === 'trial') {
            return { success: true, error: null }; // No token needed for trial users
        }
        
        isAssigningTokenRef.current = true;
        setAssigningStatus('scanning');
        
        console.log('Starting auto-assignment process...');

        const tokensJSON = sessionStorage.getItem('veoAuthTokens');
        if (!tokensJSON) {
            const errorMsg = "Sistem tidak dapat mencari sebarang token sambungan yang tersedia. Sila hubungi admin.";
            isAssigningTokenRef.current = false;
            setAssigningStatus('error');
            return { success: false, error: errorMsg };
        }
        
        let tokenAssigned = false;
        let finalError: string | null = "Semua slot sambungan sedang penuh. Sila cuba lagi sebentar lagi atau hubungi admin.";

        try {
            const sharedTokens: { token: string; createdAt: string }[] = JSON.parse(tokensJSON);
            setScanProgress({ current: 0, total: sharedTokens.length });
            
            // Randomize for load distribution
            for (let i = sharedTokens.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sharedTokens[i], sharedTokens[j]] = [sharedTokens[j], sharedTokens[i]];
            }

            for (const [index, tokenData] of sharedTokens.entries()) {
                setScanProgress({ current: index + 1, total: sharedTokens.length });
                console.log(`[Auto-Assign] Testing shared token... ${tokenData.token.slice(-6)}`);
                const results = await runComprehensiveTokenTest(tokenData.token);
                const isImagenOk = results.find(r => r.service === 'Imagen')?.success;
                const isVeoOk = results.find(r => r.service === 'Veo')?.success;

                if (isImagenOk && isVeoOk) {
                    console.log(`[Auto-Assign] Found a valid token: ...${tokenData.token.slice(-6)}. Assigning to user.`);
                    setAssigningStatus('assigning');
                    const assignResult = await assignPersonalTokenAndIncrementUsage(currentUser.id, tokenData.token);

                    if (assignResult.success === false) {
                        console.warn(`[Auto-Assign] Could not assign token ...${tokenData.token.slice(-6)}: ${assignResult.message}. Trying next.`);
                        setAssigningStatus('scanning'); // Go back to scanning
                        if (assignResult.message === 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' && currentUser.role === 'admin') {
                            finalError = "Database schema is outdated.";
                            alert("Database schema is outdated.\n\nPlease go to your Supabase dashboard and run the following SQL command to add the required column:\n\nALTER TABLE public.users ADD COLUMN personal_auth_token TEXT;");
                            break;
                        }
                    } else {
                        handleUserUpdate(assignResult.user);
                        console.log('[Auto-Assign] Successfully assigned personal token.');
                        tokenAssigned = true;
                        finalError = null;
                        setAssigningStatus('success');
                        break;
                    }
                } else {
                    console.warn(`[Auto-Assign] Token ...${tokenData.token.slice(-6)} failed health check. Marking as expired.`);
                    // Fire-and-forget call to mark the token as expired
                    updateTokenStatusToExpired(tokenData.token);
                }
            }

            if (!tokenAssigned) {
                console.log('[Auto-Assign] No valid shared tokens found after testing all available tokens.');
            }

        } catch (error) {
            console.error('[Auto-Assign] An error occurred during the token assignment process:', error);
            finalError = "An unexpected error occurred during assignment. Please try again.";
        } finally {
            isAssigningTokenRef.current = false;
        }
        
        if (!tokenAssigned) {
            setAssigningStatus('error');
        }

        return { success: tokenAssigned, error: finalError };
    }, [currentUser, handleUserUpdate]);
    
    const retryAssignment = useCallback(async () => {
        setAssigningStatus('scanning');
        setAutoAssignError(null);
        setScanProgress({ current: 0, total: 0 });
        const result = await assignTokenProcess();
        if (result.success) {
            setTimeout(() => {
                setShowAssignModal(false);
                setJustLoggedIn(true);
            }, 1500); // Show success message for a bit
        } else if (result.error) {
            setAutoAssignError(result.error);
        }
    }, [assignTokenProcess]);

  const handleLoginSuccess = async (user: User) => {
    handleUserUpdate(user);
    setShowServerSelectionModal(true);
    logActivity('login');
    sessionStorage.setItem('session_started_at', new Date().toISOString());
  };

  const handleCreateVideoFromImage = (preset: VideoGenPreset) => {
    setVideoGenPreset(preset);
    setActiveView('ai-video-suite');
  };

  const handleReEditImage = (preset: ImageEditPreset) => {
    setImageToReEdit(preset);
    setActiveView('ai-image-suite');
  };

  const handleUsePromptInGenerator = (prompt: string) => {
    setImageGenPresetPrompt(prompt);
    setActiveView('ai-image-suite');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <ECourseView currentUser={currentUser!} />;
      case 'get-started':
        return <GetStartedView />;
      case 'ai-text-suite':
        // FIX: Pass language prop to AiTextSuiteView.
        return <AiTextSuiteView currentUser={currentUser!} language={language} />;
      case 'ai-image-suite':
        return <AiImageSuiteView 
                  onCreateVideo={handleCreateVideoFromImage} 
                  onReEdit={handleReEditImage}
                  imageToReEdit={imageToReEdit}
                  clearReEdit={() => setImageToReEdit(null)}
                  presetPrompt={imageGenPresetPrompt}
                  clearPresetPrompt={() => setImageGenPresetPrompt(null)}
                  currentUser={currentUser!}
                  onUserUpdate={handleUserUpdate}
                  language={language}
                />;
      case 'ai-video-suite':
        return <AiVideoSuiteView 
                  currentUser={currentUser!}
                  preset={videoGenPreset} 
                  clearPreset={() => setVideoGenPreset(null)}
                  onCreateVideo={handleCreateVideoFromImage}
                  onReEdit={handleReEditImage}
                  onUserUpdate={handleUserUpdate}
                  // FIX: Pass language prop to AiVideoSuiteView.
                  language={language}
                />;
      case 'ai-prompt-library-suite':
          return <AiPromptLibrarySuiteView onUsePrompt={handleUsePromptInGenerator} />;
      case 'social-post-studio':
          // FIX: Pass language prop to SocialPostStudioView.
          return <SocialPostStudioView currentUser={currentUser!} language={language} />;
      case 'gallery':
        return <GalleryView onCreateVideo={handleCreateVideoFromImage} onReEdit={handleReEditImage} />;
      case 'settings':
          return <SettingsView 
                    currentUser={currentUser!} 
                    // This prop is now obsolete, but kept for compatibility.
                    tempApiKey={null}
                    onUserUpdate={handleUserUpdate} 
                    // FIX: Pass language prop to SettingsView.
                    language={language}
                    veoTokenRefreshedAt={veoTokenRefreshedAt}
                    assignTokenProcess={assignTokenProcess}
                 />;
      default:
        return <ECourseView currentUser={currentUser!} />;
    }
  };
  
  if (!sessionChecked || (currentUser && isApiKeyLoading)) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
              <Spinner />
          </div>
      );
  }

  if (isShowingWelcome) {
    return <WelcomeAnimation onAnimationEnd={() => {
        setIsShowingWelcome(false);
        // Redirect trial users directly to their main feature
        if (currentUser?.status === 'trial') {
            setActiveView('ai-video-suite');
        } else {
            setActiveView('home');
        }
    }} />;
  }
  
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // --- Access Control Logic for Full Version ---
  let isBlocked = false;
  let blockMessage = { title: "Access Denied", body: "" };

  const isSubscriptionActive = currentUser.status === 'subscription' && currentUser.subscriptionExpiry && Date.now() < currentUser.subscriptionExpiry;

  const adminOnlyViews: View[] = ['social-post-studio'];

  if (adminOnlyViews.includes(activeView) && currentUser.role !== 'admin') {
      isBlocked = true;
      blockMessage = { title: "Access Denied", body: "This feature is only available for administrators." };
  } else if (currentUser.status === 'admin' || currentUser.status === 'lifetime' || isSubscriptionActive) {
    isBlocked = false;
  } 
  else if (currentUser.status === 'subscription' && !isSubscriptionActive) {
      isBlocked = true;
      blockMessage = { title: "Subscription Expired", body: "Your plan has expired. To continue using all features, please renew your subscription. [BUTTON]Renew Now[URL]https://monoklix.com/step/monoklix-checkout/" };
  }
  // Apply restrictions for trial users
  else if (currentUser.status === 'trial') {
    const usageCount = currentUser.storyboardUsageCount || 0;
    const allowedViews: View[] = ['home', 'get-started', 'gallery'];
    if (usageCount < TRIAL_USAGE_LIMIT) {
        allowedViews.push('ai-video-suite');
    }

    if (!allowedViews.includes(activeView)) {
        isBlocked = true;
        blockMessage = { 
            title: "⚠️ Trial Mode Ended", 
            body: usageCount >= TRIAL_USAGE_LIMIT 
                ? `You have used up your trial credits for this feature.
To continue enjoying full access to all MONOklix Studio features, please upgrade your account to the full version. 🚀
[BUTTON]Register for a Full Account[URL]https://monoklix.com/step/monoklix-checkout/
After upgrading, you will get unlimited access to all features including:

Unlimited storyboard video creation 🎬
Full AI & VEO integration ⚡
Unrestricted project saving and exporting 📂

Thank you for trying MONOklix Studio!`
                : `This feature is not available in trial mode.
To unlock this and all other advanced features, please upgrade to the full version.
[BUTTON]Register for a Full Account[URL]https://monoklix.com/step/monoklix-checkout/`
        };
    }
  } 
  // Block any other status (e.g., inactive, pending_payment)
  else {
      isBlocked = true;
      blockMessage = { title: "Access Denied", body: `Your account status is "${currentUser.status}". Please contact support for assistance.` };
  }


  const renderBlockMessageBody = (body: string) => {
        if (!body.includes('[BUTTON]')) {
            return <p className="mt-2 text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{body}</p>;
        }

        const buttonRegex = /\[BUTTON\](.*?)\[URL\](.*)/;
        const buttonMatch = body.match(buttonRegex);

        if (!buttonMatch || typeof buttonMatch.index === 'undefined') {
            return <p className="mt-2 text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{body}</p>;
        }
        
        const beforeText = body.substring(0, buttonMatch.index);
        const buttonText = buttonMatch[1];
        const buttonUrl = buttonMatch[2];
        const afterText = body.substring(buttonMatch.index + buttonMatch[0].length);

        return (
            <div className="mt-4 text-neutral-600 dark:text-neutral-300 space-y-4">
                <p className="whitespace-pre-line text-sm">{beforeText.trim()}</p>
                <a
                    href={buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors shadow-md text-base"
                >
                    {buttonText}
                </a>
                <p className="whitespace-pre-line text-sm">{afterText.trim()}</p>
            </div>
        );
    };

  const PageContent = isBlocked ? (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center p-8 sm:p-12 max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
          <XIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-neutral-800 dark:text-white sm:text-2xl">{blockMessage.title}</h2>
        {renderBlockMessageBody(blockMessage.body)}
      </div>
    </div>
  ) : renderView();

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 font-sans">
      {showServerSelectionModal && (
        <ServerSelectionModal
          currentUser={currentUser!}
          onSelect={async (serverUrl) => {
            console.log(`[Server Selection] User selected proxy server: ${serverUrl}`);
            sessionStorage.setItem('selectedProxyServer', serverUrl);
            updateUserProxyServer(currentUser!.id, serverUrl); // Fire-and-forget update
            setShowServerSelectionModal(false);
            
            if (currentUser && !currentUser.personalAuthToken) {
                // No token: show modal, run process, then trigger welcome animation.
                setShowAssignModal(true);
                setAssigningStatus('scanning');
                setAutoAssignError(null);
                setScanProgress({ current: 0, total: 0 });
                const result = await assignTokenProcess();
                if (result.success) {
                    setTimeout(() => {
                      setShowAssignModal(false);
                      setJustLoggedIn(true); 
                    }, 1500); // Show success message
                } else {
                    setAutoAssignError(result.error);
                }
            } else {
                // Has token: just trigger welcome animation.
                setJustLoggedIn(true);
            }
          }}
        />
      )}
      {showAssignModal && <AssigningTokenModal status={assigningStatus} error={autoAssignError} onRetry={retryAssignment} scanProgress={scanProgress} />}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={handleLogout} 
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden" aria-label="Open menu">
              <MenuIcon className="w-6 h-6" />
            </button>
             <LogoIcon className="w-28 text-neutral-800 dark:text-neutral-200" />
          </div>
          <div className="flex items-center gap-2 pr-2">
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
              <button
                  onClick={handleClearCacheAndRefresh}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Refresh Session"
                  title="Refresh Session (clears session data & logs you out)"
              >
                  <RefreshCwIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
              <ApiKeyStatus 
                activeApiKey={activeApiKey} 
                veoTokenRefreshedAt={veoTokenRefreshedAt} 
                currentUser={currentUser}
                assignTokenProcess={assignTokenProcess}
                onUserUpdate={handleUserUpdate}
              />
          </div>
        </header>
        {notification && <NotificationBanner message={notification} onDismiss={() => setNotification(null)} />}
        <div className="flex-1 p-4 md:p-8">
          {PageContent}
        </div>
      </main>
    </div>
  );
};

export default App;
