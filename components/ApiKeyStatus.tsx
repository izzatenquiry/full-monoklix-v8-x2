import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KeyIcon, CheckCircleIcon, XIcon, AlertTriangleIcon, RefreshCwIcon, SparklesIcon } from './Icons';
import Spinner from './common/Spinner';
import { runApiHealthCheck, type HealthCheckResult } from '../services/geminiService';
import { type User } from '../types';
import { saveUserPersonalAuthToken } from '../services/userService';
import { runComprehensiveTokenTest, type TokenTestResult } from '../services/imagenV3Service';

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

interface ApiKeyStatusProps {
    activeApiKey: string | null;
    veoTokenRefreshedAt: string | null;
    currentUser: User;
    assignTokenProcess: () => Promise<{ success: boolean; error: string | null; }>;
    onUserUpdate: (user: User) => void;
}

const ApiKeyStatus: React.FC<ApiKeyStatusProps> = ({ activeApiKey, currentUser, assignTokenProcess, onUserUpdate }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [results, setResults] = useState<HealthCheckResult[] | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [claimStatus, setClaimStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
    const [claimError, setClaimError] = useState<string | null>(null);

    const handleClaimNewToken = useCallback(async () => {
        setClaimStatus('searching');
        setClaimError(null);

        const clearResult = await saveUserPersonalAuthToken(currentUser.id, null);
        if (clearResult.success === false) {
            setClaimError(clearResult.message || 'Failed to clear previous token.');
            setClaimStatus('error');
        } else {
            onUserUpdate(clearResult.user);
            
            const assignResult = await assignTokenProcess();
            if (assignResult.success) {
                setClaimStatus('success');
                setTimeout(() => {
                    setClaimStatus('idle');
                    setIsPopoverOpen(false);
                }, 2000);
            } else {
                setClaimError(assignResult.error || 'Failed to assign token.');
                setClaimStatus('error');
            }
        }
    }, [currentUser.id, onUserUpdate, assignTokenProcess]);

    const handleHealthCheck = async () => {
        setIsChecking(true);
        setResults(null);
        
        const tokenToCheck = currentUser.personalAuthToken;

        if (!tokenToCheck) {
            setResults([
                { service: 'Personal Token', model: 'N/A', status: 'degraded', message: 'No personal token assigned to this account.' }
            ]);
            setIsChecking(false);
            return;
        }

        try {
            const testResults = await runComprehensiveTokenTest(tokenToCheck);
            
            const formattedResults: HealthCheckResult[] = testResults.map(res => ({
                service: `${res.service} Service`,
                model: `Personal Token (...${tokenToCheck.slice(-6)})`,
                status: res.success ? 'operational' : 'error',
                message: res.message
            }));
            
            setResults(formattedResults);
        } catch (error) {
            setResults([{ service: 'Health Check Failed', model: 'N/A', status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }]);
        } finally {
            setIsChecking(false);
        }
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusUi = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return { icon: <CheckCircleIcon className="w-5 h-5 text-green-500"/>, text: 'text-green-700 dark:text-green-300' };
            case 'error': return { icon: <XIcon className="w-5 h-5 text-red-500"/>, text: 'text-red-700 dark:text-red-300' };
            case 'degraded': return { icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-500"/>, text: 'text-yellow-700 dark:text-yellow-300' };
            default: return { icon: null, text: '' };
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            {claimStatus !== 'idle' && (
                <ClaimTokenModal
                    status={claimStatus}
                    error={claimError}
                    onClose={() => setClaimStatus('idle')}
                    onRetry={handleClaimNewToken}
                />
            )}
            <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="API Key Status"
            >
                <KeyIcon className={`w-5 h-5 ${activeApiKey ? 'text-green-500' : 'text-red-500'}`} />
            </button>

            {isPopoverOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl z-20 animate-zoomIn p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">API Status</h3>
                        <button onClick={() => setIsPopoverOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><XIcon className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            <span className="font-semibold text-neutral-600 dark:text-neutral-300">Shared API Key:</span>
                            {activeApiKey ? (
                                <span className="font-mono text-green-600 dark:text-green-400">...{activeApiKey.slice(-4)}</span>
                            ) : (
                                <span className="text-red-500 font-semibold">Not Loaded</span>
                            )}
                        </div>
                         <div className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            <span className="font-semibold text-neutral-600 dark:text-neutral-300">MONOklix Auth Token:</span>
                            {currentUser.personalAuthToken ? (
                                <span className="font-mono text-neutral-700 dark:text-neutral-300">...{currentUser.personalAuthToken.slice(-10)}</span>
                            ) : (
                                <span className="text-yellow-500 font-semibold">Not Assigned</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="grid grid-cols-2 gap-3">
                             <button
                                onClick={handleHealthCheck}
                                disabled={isChecking || !activeApiKey}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {isChecking ? <Spinner /> : <RefreshCwIcon className="w-4 h-4" />}
                                Health Check
                            </button>
                             <button
                                onClick={handleClaimNewToken}
                                disabled={isChecking}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                 <SparklesIcon className="w-4 h-4" />
                                Claim New!
                            </button>
                        </div>
                    </div>

                    {results && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                            {results.map((result, index) => {
                                const { icon, text } = getStatusUi(result.status);
                                return (
                                    <div key={index} className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="font-semibold text-xs">{result.service}</p>
                                                <p className="text-xs text-neutral-500 font-mono truncate">{result.model}</p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 font-semibold text-xs capitalize ${text}`}>
                                                {icon}
                                                {result.status}
                                            </div>
                                        </div>
                                         {(result.message !== 'OK' || result.details) && (
                                            <div className="text-xs mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700/50">
                                                <p className={`${result.status === 'error' ? 'text-red-500' : 'text-neutral-500'}`}>{result.message}</p>
                                                {result.details && <p className="text-neutral-500">{result.details}</p>}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApiKeyStatus;