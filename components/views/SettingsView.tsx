import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type User, type AiLogItem, type Language } from '../../types';
import { updateUserProfile, updateUserWebhookUrl, saveUserPersonalAuthToken } from '../../services/userService';
import {
    CreditCardIcon, CheckCircleIcon, XIcon, WebhookIcon, EyeIcon, EyeOffIcon, ChatIcon,
    AlertTriangleIcon, DatabaseIcon, TrashIcon, RefreshCwIcon, WhatsAppIcon, InformationCircleIcon, SparklesIcon
} from '../Icons';
import Spinner from '../common/Spinner';
import { sendTestUserWebhook } from '../../services/webhookService';
import AdminDashboardView from './AdminDashboardView';
import ETutorialAdminView from './ETutorialAdminView';
import Tabs, { type Tab } from '../common/Tabs';
import { runApiHealthCheck, type HealthCheckResult } from '../../services/geminiService';
import { getTranslations } from '../../services/translations';
import { getFormattedCacheStats, clearVideoCache } from '../../services/videoCacheService';
import { runComprehensiveTokenTest, type TokenTestResult } from '../../services/imagenV3Service';

// Define the types for the tabs in the settings view
type SettingsTabId = 'profile' | 'api' | 'content-admin' | 'user-db';

const TABS: Tab<SettingsTabId>[] = [
    { id: 'profile', label: 'User Profile' },
    { id: 'api', label: 'Integrations' },
    { id: 'content-admin', label: 'Admin Content', adminOnly: true },
    { id: 'user-db', label: 'User Database', adminOnly: true },
];

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface SettingsViewProps {
  currentUser: User;
  tempApiKey: string | null;
  onUserUpdate: (user: User) => void;
  language: Language;
  veoTokenRefreshedAt: string | null;
  assignTokenProcess: () => Promise<{ success: boolean; error: string | null; }>;
}

// --- PANELS ---

const ProfilePanel: React.FC<Pick<SettingsViewProps, 'currentUser' | 'onUserUpdate'>> = ({ currentUser, onUserUpdate }) => {
    const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
    const [email, setEmail] = useState(currentUser.email);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

     useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        };
    }, []);

    const getAccountStatus = (user: User): { text: string; colorClass: string } => {
        switch (user.status) {
            case 'admin': return { text: 'Admin (Lifetime)', colorClass: 'text-green-500' };
            case 'lifetime': return { text: 'Active (Lifetime)', colorClass: 'text-green-500' };
            case 'subscription': return { text: 'Active (Subscription)', colorClass: 'text-green-500' };
            case 'trial': return { text: 'Trial', colorClass: 'text-yellow-500' };
            case 'inactive': return { text: 'Inactive', colorClass: 'text-red-500' };
            case 'pending_payment': return { text: 'Pending Payment', colorClass: 'text-yellow-500' };
            default: return { text: 'Unknown', colorClass: 'text-neutral-500' };
        }
    };

    const handleSave = async () => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        setStatus({ type: 'loading', message: 'Saving profile...' });
        const result = await updateUserProfile(currentUser.id, { fullName, email });
        if (result.success === false) {
            setStatus({ type: 'error', message: `Failed: ${result.message}` });
        } else {
            onUserUpdate(result.user);
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
        }
        statusTimeoutRef.current = window.setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
    };

    const accountStatus = getAccountStatus(currentUser);
    let expiryInfo = null;
    if (currentUser.status === 'subscription' && currentUser.subscriptionExpiry) {
        const expiryDate = new Date(currentUser.subscriptionExpiry);
        const isExpired = Date.now() > expiryDate.getTime();
        expiryInfo = (
            <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                Expires on: {expiryDate.toLocaleDateString()} {isExpired && '(Expired)'}
            </span>
        );
    }


    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6">User Profile</h2>
            <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Account Status: <span className={`font-bold ${accountStatus.colorClass}`}>{accountStatus.text}</span></p>
                {expiryInfo && <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">{expiryInfo}</p>}
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={status.type === 'loading'} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email Address</label>
                    <input type="email" value={email} readOnly disabled className="w-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 cursor-not-allowed" />
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} disabled={status.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors w-48 flex justify-center disabled:opacity-50">
                        {status.type === 'loading' ? <Spinner /> : 'Save Changes'}
                    </button>
                    {status.type !== 'idle' && (
                        <div className={`flex items-center gap-3 text-sm ${status.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                            {status.type === 'success' && <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />}
                            {status.type === 'error' && <XIcon className="w-5 h-5 flex-shrink-0" />}
                            <span>{status.message}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CacheManagerPanel: React.FC = () => {
  const [stats, setStats] = useState<{
    size: string;
    count: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const formattedStats = await getFormattedCacheStats();
      setStats(formattedStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the entire video cache? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearVideoCache();
      await loadStats();
      alert('Video cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <DatabaseIcon className="w-8 h-8 text-primary-500" />
          <div>
            <h2 className="text-xl font-semibold">Video Cache Manager</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage your locally cached videos
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Storage Used</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.size}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Videos Cached</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.count}</p>
              </div>
            </div>
            
            {/* Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How Video Caching Works
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Videos are stored locally and persistently in your browser (using IndexedDB).</li>
                <li>• There is no automatic limit on size or number of videos.</li>
                <li>• Storage is limited only by your browser's total available space.</li>
                <li>• Videos persist even after closing the browser.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={loadStats} disabled={isLoading} className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                <RefreshCwIcon className="w-4 h-4" /> Refresh Stats
              </button>
              <button onClick={handleClearCache} disabled={isClearing || stats.count === 0} className="flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isClearing ? (<><Spinner /> Clearing...</>) : (<><TrashIcon className="w-4 h-4" /> Clear All Cache</>)}
              </button>
            </div>

            {/* Tips */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <h3 className="font-semibold mb-2">💡 Tips</h3>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>• Clear cache if videos are not loading properly</li>
                <li>• Old videos are automatically removed to save space</li>
                <li>• Cache is shared across all tabs of this website</li>
                <li>• Incognito mode does not persist cache</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">Failed to load cache statistics</div>
        )}
      </div>
  );
};

const ClaimTokenModal: React.FC<{
  status: 'searching' | 'success' | 'error';
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}> = ({ status, error, onRetry, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4 animate-zoomIn" aria-modal="true" role="dialog">
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center max-w-sm w-full">
      {status === 'searching' && (
        <>
          <Spinner />
          <h2 className="text-xl font-bold mt-4">Searching for New Token</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-sm">
            Please wait while we find an available connection slot...
          </p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold mt-4">Token Claimed!</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-sm">
            A new secure token has been assigned to your account.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold mt-4">Assignment Failed</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-sm">
            {error || 'An unknown error occurred.'}
          </p>
          <div className="mt-6 flex gap-4">
            <button onClick={onClose} className="w-full bg-neutral-200 dark:bg-neutral-700 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
              Close
            </button>
            <button onClick={onRetry} className="w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
              Try Again
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);

interface ApiIntegrationsPanelProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
  language: Language;
  veoTokenRefreshedAt: string | null;
  assignTokenProcess: () => Promise<{ success: boolean; error: string | null; }>;
}

const ApiIntegrationsPanel: React.FC<ApiIntegrationsPanelProps> = ({ currentUser, onUserUpdate, language, veoTokenRefreshedAt, assignTokenProcess }) => {
    const [webhookUrl, setWebhookUrl] = useState(currentUser.webhookUrl || '');
    const [webhookStatus, setWebhookStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [healthCheckResults, setHealthCheckResults] = useState<HealthCheckResult[] | null>(null);
    const [veoTokens, setVeoTokens] = useState<{ token: string; createdAt: string }[]>([]);

    const [personalAuthToken, setPersonalAuthToken] = useState(currentUser.personalAuthToken || '');
    const [showPersonalToken, setShowPersonalToken] = useState(false);
    const [personalTokenSaveStatus, setPersonalTokenSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    
    const [testStatus, setTestStatus] = useState<'idle' | 'testing'>('idle');
    const [testResults, setTestResults] = useState<TokenTestResult[] | null>(null);

    const [claimStatus, setClaimStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
    const [claimError, setClaimError] = useState<string | null>(null);

    const handleClaimNewToken = useCallback(async () => {
        setClaimStatus('searching');
        setClaimError(null);

        const clearResult = await saveUserPersonalAuthToken(currentUser.id, null);
        // FIX: Inverted conditional to check for the failure case first. This helps ensure TypeScript
        // correctly narrows the discriminated union type for both the success and failure blocks.
        if (clearResult.success === false) {
            setClaimError(clearResult.message || 'Failed to clear previous token.');
            setClaimStatus('error');
        } else {
            onUserUpdate(clearResult.user);
            
            const assignResult = await assignTokenProcess();
            if (assignResult.success) {
                setClaimStatus('success');
                setTimeout(() => setClaimStatus('idle'), 2000);
            } else {
                setClaimError(assignResult.error || 'Failed to assign token.');
                setClaimStatus('error');
            }
        }
    }, [currentUser.id, onUserUpdate, assignTokenProcess]);

    const handleTestToken = useCallback(async () => {
        setTestStatus('testing');
        setTestResults(null);
        const results = await runComprehensiveTokenTest(personalAuthToken);
        setTestResults(results);
        setTestStatus('idle');
    }, [personalAuthToken]);

    useEffect(() => {
        const tokensJSON = sessionStorage.getItem('veoAuthTokens');
        if (tokensJSON) {
            try {
                const parsedTokens = JSON.parse(tokensJSON);
                if (Array.isArray(parsedTokens)) {
                    setVeoTokens(parsedTokens);
                }
            } catch (e) {
                console.error("Failed to parse VEO auth from session storage", e);
                setVeoTokens([]);
            }
        } else {
            setVeoTokens([]);
        }
    }, [veoTokenRefreshedAt]);
    
    useEffect(() => {
        const tokenFromProp = currentUser.personalAuthToken || '';
        setPersonalAuthToken(tokenFromProp);
        setTestResults(null);
    }, [currentUser.personalAuthToken]);
    
    const handleSaveWebhook = async () => {
        setWebhookStatus({ type: 'loading', message: 'Saving...' });
        try {
            const urlToSave = webhookUrl.trim();
            if (urlToSave) new URL(urlToSave);
            const result = await updateUserWebhookUrl(currentUser.id, urlToSave || null);
            if (result.success === false) {
                setWebhookStatus({ type: 'error', message: result.message });
            } else {
                onUserUpdate(result.user);
                setWebhookStatus({ type: 'success', message: 'Webhook URL saved!' });
            }
        } catch (_) {
            setWebhookStatus({ type: 'error', message: 'Invalid URL format.' });
        }
        setTimeout(() => setWebhookStatus({ type: 'idle', message: '' }), 3000);
    };
    
    const handleTestWebhook = async () => {
        if (!currentUser.webhookUrl) return;
        setWebhookStatus({ type: 'loading', message: 'Sending test...' });
        const result = await sendTestUserWebhook();
        setWebhookStatus({ type: result.success ? 'success' : 'error', message: result.message });
        setTimeout(() => setWebhookStatus({ type: 'idle', message: '' }), 5000);
    };

    const handleHealthCheck = async () => {
        setIsCheckingHealth(true);
        setHealthCheckResults(null);
        try {
            const activeApiKey = sessionStorage.getItem('monoklix_session_api_key');
            const results = await runApiHealthCheck({
                textKey: activeApiKey || undefined,
            });
            setHealthCheckResults(results);
        } catch (error: any) {
            setHealthCheckResults([{ service: 'Health Check Runner', model: 'N/A', status: 'error', message: error.message }]);
        } finally {
            setIsCheckingHealth(false);
        }
    };

    const getStatusClasses = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return { border: 'border-green-500', icon: <CheckCircleIcon className="w-5 h-5 text-green-500"/>, text: 'text-green-700 dark:text-green-300' };
            case 'error': return { border: 'border-red-500', icon: <XIcon className="w-5 h-5 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
            case 'degraded': return { border: 'border-yellow-500', icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-500"/>, text: 'text-yellow-700 dark:text-yellow-300' };
            default: return { border: 'border-neutral-500', icon: null, text: '' };
        }
    };
    
    const locale = language === 'ms' ? 'ms-MY' : 'en-US';
    const activeApiKey = sessionStorage.getItem('monoklix_session_api_key');

    const handleSavePersonalToken = async () => {
        setPersonalTokenSaveStatus('saving');
        const result = await saveUserPersonalAuthToken(currentUser.id, personalAuthToken.trim() || null);

        if (result.success === false) {
            setPersonalTokenSaveStatus('error');
            if (result.message === 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' && currentUser.role === 'admin') {
                alert("Database schema is outdated.\n\nPlease go to your Supabase dashboard and run the following SQL command to add the required column:\n\nALTER TABLE public.users ADD COLUMN personal_auth_token TEXT;");
            }
        } else {
            onUserUpdate(result.user);
            setPersonalTokenSaveStatus('saved');
        }
        setTimeout(() => setPersonalTokenSaveStatus('idle'), 3000);
    };

    return (
        <>
            {claimStatus !== 'idle' && (
                <ClaimTokenModal
                    status={claimStatus}
                    error={claimError}
                    onClose={() => setClaimStatus('idle')}
                    onRetry={handleClaimNewToken}
                />
            )}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-2">MONOklix API Key</h2>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 flex items-start gap-3">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            This platform uses a centralized, shared API key for all AI services. You do not need to provide your own key. The status of the shared key is shown below.
                        </p>
                    </div>
                    <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">Shared API Key Status:</span>
                        {activeApiKey ? (
                            <span className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="w-5 h-5" />
                                Connected
                            </span>
                        ) : (
                             <span className="flex items-center gap-2 font-semibold text-red-500">
                                <XIcon className="w-5 h-5" />
                                Not Loaded
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
                    <h2 className="text-xl font-semibold mb-2">MONOklix Auth Token</h2>
                    <div className="relative">
                        <input
                            type={showPersonalToken ? 'text' : 'password'}
                            value={personalAuthToken}
                            onChange={(e) => {
                                setPersonalAuthToken(e.target.value);
                                setTestResults(null); // Reset test status on change
                            }}
                            placeholder="Paste your personal __SESSION token here"
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 pr-10 focus:ring-2 focus:ring-primary-500"
                        />
                        <button onClick={() => setShowPersonalToken(!showPersonalToken)} className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500">
                            {showPersonalToken ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                    
                    {/* Token Status Feedback */}
                    <div className="mt-2 min-h-[24px]">
                        {testStatus === 'testing' && <div className="flex items-center gap-2 text-sm text-neutral-500"><Spinner /> Testing token...</div>}
                        {testResults && (
                            <div className="space-y-2 mt-2">
                                {testResults.map(result => (
                                    <div key={result.service} className={`flex items-start gap-2 text-sm p-2 rounded-md ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        {result.success ? <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/> : <XIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/>}
                                        <div>
                                            <span className={`font-semibold ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-700 dark:text-red-300'}`}>{result.service} Service</span>
                                            <p className={`text-xs ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>{result.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <button onClick={handleSavePersonalToken} disabled={personalTokenSaveStatus === 'saving'} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 w-24 flex justify-center">
                            {personalTokenSaveStatus === 'saving' ? <Spinner/> : 'Save'}
                        </button>
                        <button onClick={handleTestToken} disabled={!personalAuthToken || testStatus === 'testing'} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-50">
                             {testStatus === 'testing' ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                            Run Test
                        </button>
                        <button onClick={handleClaimNewToken} disabled={personalTokenSaveStatus === 'saving' || claimStatus !== 'idle'} className="bg-neutral-200 dark:bg-neutral-700 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                            Claim New!
                        </button>
                         {personalTokenSaveStatus === 'saved' && (
                            <span className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircleIcon className="w-5 h-5" />
                                Updated!
                            </span>
                        )}
                         {personalTokenSaveStatus === 'error' && (
                            <span className="flex items-center gap-2 text-sm text-red-600">
                                <XIcon className="w-5 h-5" />
                                Save failed.
                            </span>
                        )}
                    </div>
                </div>

                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
                     <div className="border-2 border-indigo-400 dark:border-indigo-600 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/30">
                        <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                            Veo 3.0 Authorization
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
                            This special token is required <strong>only for Veo 3.0 models</strong>. The app will automatically try the next token if the current one fails.
                        </p>
                        
                        {veoTokens.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {veoTokens.map((tokenData, index) => (
                                    <div key={index} className={`p-3 rounded-md flex items-center gap-3 border ${index === 0 ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'}`}>
                                        <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${index === 0 ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'}`} />
                                        <div className="text-sm">
                                            <p className={`font-semibold ${index === 0 ? 'text-green-800 dark:text-green-200' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                                {index === 0 ? 'Primary MONOklix Auth' : `Fallback Auth #${index}`}
                                                <span className="font-mono text-xs ml-2">...{tokenData.token.slice(-6)}</span>
                                            </p>
                                            <p className={`text-xs ${index === 0 ? 'text-green-700 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                Created: {new Date(tokenData.createdAt).toLocaleString(locale)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md flex items-center gap-2 border border-yellow-200 dark:border-yellow-800">
                                <AlertTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                    Authorization Token not found. Veo 3.0 models will fail.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6"/> API Health Check
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 my-4">
                        Run a comprehensive check on all integrated AI services to ensure they are configured correctly and operational. This will make small API calls to each service.
                    </p>
                    <button 
                        onClick={handleHealthCheck} 
                        disabled={isCheckingHealth}
                        className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 w-64 flex justify-center disabled:opacity-50"
                    >
                        {isCheckingHealth ? <Spinner /> : 'Run Full System Check'}
                    </button>

                    {isCheckingHealth && <p className="text-sm mt-4 text-neutral-500">Running checks... this may take up to a minute.</p>}

                    {healthCheckResults && (
                        <div className="mt-6 space-y-3">
                            {healthCheckResults.map((result, index) => {
                                const { border, icon, text } = getStatusClasses(result.status);
                                const statusText = result.status === 'error' 
                                    ? 'Not Available' 
                                    : result.status.charAt(0).toUpperCase() + result.status.slice(1);

                                return (
                                    <div key={index} className={`p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border-l-4 ${border} animate-zoomIn`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="font-semibold text-neutral-800 dark:text-white">{result.service}</p>
                                                <p className="text-xs font-mono text-neutral-500 break-all">{result.model}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {icon}
                                                <span className={`font-semibold text-sm ${text}`}>{statusText}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 whitespace-pre-wrap">{result.message}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><WebhookIcon className="w-6 h-6"/> Personal Webhook</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 my-4">Automatically send generated content to an external URL (e.g., n8n).</p>
                    <input id="user-webhook-url" type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n-url.com/webhook/..." className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500" />
                    <div className="flex items-center gap-2 mt-4">
                        <button onClick={handleSaveWebhook} disabled={webhookStatus.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 w-24 flex justify-center">
                            {webhookStatus.type === 'loading' && webhookStatus.message.includes('Saving') ? <Spinner /> : 'Save'}
                        </button>
                        <button onClick={handleTestWebhook} disabled={!currentUser.webhookUrl || webhookStatus.type === 'loading'} className="bg-neutral-200 dark:bg-neutral-700 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 disabled:opacity-50 w-40 flex justify-center">
                            {webhookStatus.type === 'loading' && webhookStatus.message.includes('Sending') ? <Spinner /> : 'Test Webhook'}
                        </button>
                    </div>
                    {webhookStatus.message && <p className={`text-sm mt-2 ${webhookStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{webhookStatus.message}</p>}
                </div>
            </div>
        </>
    );
};

// --- MAIN VIEW ---

const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');
    const { currentUser, language } = props;

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'profile': 
                return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <ProfilePanel {...props} />
                        <CacheManagerPanel />
                    </div>
                );
            case 'api': 
                return <ApiIntegrationsPanel 
                            currentUser={currentUser} 
                            onUserUpdate={props.onUserUpdate} 
                            language={language}
                            veoTokenRefreshedAt={props.veoTokenRefreshedAt}
                            assignTokenProcess={props.assignTokenProcess}
                        />;
            case 'content-admin': return <ETutorialAdminView />;
            case 'user-db': return <AdminDashboardView />;
            default: return <ProfilePanel {...props} />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
            <div className="flex justify-center">
                <Tabs 
                    tabs={TABS}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin'}
                />
            </div>
            <div className="mt-6">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default SettingsView;
