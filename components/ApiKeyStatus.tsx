import React, { useState, useEffect, useRef } from 'react';
import { KeyIcon, CheckCircleIcon, XIcon, AlertTriangleIcon, RefreshCwIcon } from './Icons';
import Spinner from './common/Spinner';
import { runApiHealthCheck, type HealthCheckResult } from '../services/geminiService';
import { type User } from '../types';

interface ApiKeyStatusProps {
    activeApiKey: string | null;
    veoTokenRefreshedAt: string | null;
    currentUser: User;
}

const ApiKeyStatus: React.FC<ApiKeyStatusProps> = ({ activeApiKey, veoTokenRefreshedAt, currentUser }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [results, setResults] = useState<HealthCheckResult[] | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [veoTokenCreatedAt, setVeoTokenCreatedAt] = useState<string | null>(null);

    useEffect(() => {
        // Read from sessionStorage whenever the refresh trigger changes
        const createdAt = sessionStorage.getItem('veoAuthTokenCreatedAt');
        setVeoTokenCreatedAt(createdAt);
    }, [veoTokenRefreshedAt]);

    const handleHealthCheck = async () => {
        setIsChecking(true);
        setResults(null);
        try {
            const checkResults = await runApiHealthCheck({
                textKey: activeApiKey || undefined,
            });
            setResults(checkResults);
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
                            <span className="font-semibold text-neutral-600 dark:text-neutral-300">MONOklix API Key:</span>
                            {activeApiKey ? (
                                <span className="font-mono text-green-600 dark:text-green-400">...{activeApiKey.slice(-4)}</span>
                            ) : (
                                <span className="text-red-500 font-semibold">Not Loaded</span>
                            )}
                        </div>
                         <div className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            <span className="font-semibold text-neutral-600 dark:text-neutral-300">Veo 3 Auth Date:</span>
                            {veoTokenCreatedAt ? (
                                <span className="text-neutral-700 dark:text-neutral-300">{new Date(veoTokenCreatedAt).toLocaleDateString()}</span>
                            ) : (
                                <span className="text-yellow-500 font-semibold">Not Loaded</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <button
                          onClick={handleHealthCheck}
                          disabled={isChecking || !activeApiKey}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                          {isChecking ? <Spinner /> : <RefreshCwIcon className="w-4 h-4" />}
                          Run Full Health Check
                      </button>
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