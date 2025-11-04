import React, { useState, useEffect, useRef } from 'react';
import { getHistory } from '../../services/historyService';
import { type HistoryItem } from '../../types';
import Spinner from '../common/Spinner';
import { FilmIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';

declare global {
    interface Window {
        FFmpeg: any;
        FFmpegUtil: any;
    }
}

type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

const VideoCombinerView: React.FC = () => {
    const [allVideos, setAllVideos] = useState<HistoryItem[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
    const [isCombining, setIsCombining] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ffmpegRef = useRef<any>(null);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
    const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
    const loadingAttemptRef = useRef(false);

    // ✅ SIMPLE: Just wait for FFmpeg from HTML script tags
    useEffect(() => {
        const initFFmpeg = async () => {
            if (loadingAttemptRef.current || ffmpegRef.current || engineStatus !== 'idle') {
                return;
            }

            loadingAttemptRef.current = true;
            setEngineStatus('loading');
            setError(null);
            setProgressMessage('Waiting for video engine to load...');

            try {
                // Wait for FFmpeg libraries (loaded from HTML script tags)
                let attempts = 0;
                const maxAttempts = 60; // 15 seconds
                
                while ((!window.FFmpeg || !window.FFmpegUtil) && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    attempts++;
                    
                    if (attempts % 4 === 0) {
                        setProgressMessage(`Loading libraries... (${Math.round(attempts / 4)}s)`);
                    }
                }

                if (!window.FFmpeg || !window.FFmpegUtil) {
                    throw new Error(
                        "Video processing libraries failed to load. " +
                        "Please check your internet connection and refresh the page. " +
                        "Make sure the script tags in index.html are correct."
                    );
                }

                console.log('✅ FFmpeg libraries detected');
                setProgressMessage('Initializing FFmpeg...');

                // Create FFmpeg instance
                const { createFFmpeg } = window.FFmpeg;
                const ffmpeg = createFFmpeg({
                    log: true,
                    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
                });

                // Enhanced logger
                ffmpeg.setLogger(({ type, message }: { type: string; message: string }) => {
                    console.log(`[FFmpeg ${type}]`, message);
                    if (isCombining && message.includes('time=')) {
                        const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2})/);
                        if (timeMatch) {
                            setProgressMessage(`Processing: ${timeMatch[1]}`);
                        }
                    }
                });

                setProgressMessage('Loading FFmpeg core...');
                await ffmpeg.load();

                ffmpegRef.current = ffmpeg;
                setEngineStatus('ready');
                setProgressMessage('');
                console.log('✅ FFmpeg ready');

            } catch (err) {
                console.error('❌ FFmpeg init error:', err);
                const errorMsg = err instanceof Error ? err.message : 'Failed to initialize video engine';
                setError(errorMsg);
                setEngineStatus('error');
                setProgressMessage('');
            } finally {
                loadingAttemptRef.current = false;
            }
        };

        initFFmpeg();
    }, [engineStatus, isCombining]);

    // Fetch videos
    useEffect(() => {
        const fetchVideos = async () => {
            const history = await getHistory();
            const videoItems = history.filter(item => item.type === 'Video');
            setAllVideos(videoItems);

            const newUrls = new Map<string, string>();
            videoItems.forEach(item => {
                if (item.result instanceof Blob) {
                    newUrls.set(item.id, URL.createObjectURL(item.result));
                }
            });
            setBlobUrls(newUrls);
        };
        fetchVideos();

        return () => {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Cleanup output
    useEffect(() => {
        return () => {
            if (outputUrl) URL.revokeObjectURL(outputUrl);
        };
    }, [outputUrl]);

    const toggleVideoSelection = (id: string) => {
        setSelectedVideos(prev => 
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const handleCombine = async () => {
        if (selectedVideos.length < 2) {
            setError("Please select at least 2 videos to combine.");
            return;
        }

        if (engineStatus !== 'ready' || !ffmpegRef.current) {
            setError("Video engine is not ready. Please wait or refresh.");
            return;
        }

        setIsCombining(true);
        setError(null);
        setProgressMessage('Preparing videos...');
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);

        const tempFiles: string[] = [];

        try {
            const ffmpeg = ffmpegRef.current;
            const selectedItems = allVideos.filter(v => selectedVideos.includes(v.id));
            
            let fileList = '';

            // Write videos to virtual filesystem
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                if (!(item.result instanceof Blob)) {
                    throw new Error(`Video ${i + 1} is invalid`);
                }

                const fileName = `input${i}.mp4`;
                tempFiles.push(fileName);
                
                setProgressMessage(`Loading video ${i + 1}/${selectedItems.length}...`);
                
                const videoData = await window.FFmpegUtil.fetchFile(item.result);
                ffmpeg.FS('writeFile', fileName, videoData);
                fileList += `file '${fileName}'\n`;
            }

            tempFiles.push('filelist.txt', 'output.mp4');
            ffmpeg.FS('writeFile', 'filelist.txt', fileList);

            setProgressMessage('Combining videos... This may take a while.');
            console.log('🎬 Starting video combination...');

            // Combine with re-encoding for better compatibility
            await ffmpeg.run(
                '-f', 'concat',
                '-safe', '0',
                '-i', 'filelist.txt',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                'output.mp4'
            );

            setProgressMessage('Finalizing...');
            const data = ffmpeg.FS('readFile', 'output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            
            if (blob.size === 0) {
                throw new Error('Output video is empty');
            }

            const url = URL.createObjectURL(blob);
            setOutputUrl(url);
            setProgressMessage('');
            console.log(`✅ Combined video: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        } catch (err) {
            console.error('❌ Combination error:', err);
            const errorMsg = err instanceof Error ? err.message : 'Video combination failed';
            setError(errorMsg);
            setProgressMessage('');
        } finally {
            // Cleanup temp files
            if (ffmpegRef.current) {
                tempFiles.forEach(file => {
                    try {
                        ffmpegRef.current.FS('unlink', file);
                    } catch (e) {
                        // Ignore
                    }
                });
            }
            setIsCombining(false);
        }
    };

    const handleRetryInit = () => {
        window.location.reload();
    };

    const isDisabled = isCombining || selectedVideos.length < 2 || engineStatus !== 'ready';
    
    let buttonText = `Combine ${selectedVideos.length} Videos`;
    if (engineStatus === 'loading') buttonText = 'Initializing...';
    if (engineStatus === 'error') buttonText = 'Engine Error';
    if (isCombining) buttonText = 'Combining...';

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Video Combiner</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Select and combine multiple video clips into a single video.
                </p>
            </div>

            {engineStatus === 'loading' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
                    <Spinner />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Initializing Engine
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">{progressMessage}</p>
                    </div>
                </div>
            )}

            {engineStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                Engine Failed to Load
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRetryInit}
                        className="mt-3 w-full bg-red-600 text-white text-sm font-semibold py-2 px-3 rounded-md hover:bg-red-700"
                    >
                        Reload Page
                    </button>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-lg font-semibold">
                    Select Videos ({selectedVideos.length} selected)
                </h2>
                {allVideos.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                        No videos found. Generate some videos first!
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {allVideos.map(video => (
                            <button
                                key={video.id}
                                onClick={() => toggleVideoSelection(video.id)}
                                disabled={isCombining}
                                className={`relative aspect-video rounded-md overflow-hidden transition-all ${
                                    selectedVideos.includes(video.id)
                                        ? 'ring-4 ring-primary-500'
                                        : 'ring-2 ring-transparent hover:ring-primary-300'
                                } disabled:opacity-50`}
                            >
                                <video
                                    src={blobUrls.get(video.id)}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                />
                                {selectedVideos.includes(video.id) && (
                                    <div className="absolute inset-0 bg-primary-500/50 flex items-center justify-center">
                                        <CheckCircleIcon className="w-8 h-8 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="pt-4 mt-auto">
                <button
                    onClick={handleCombine}
                    disabled={isDisabled}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCombining ? <Spinner /> : <FilmIcon className="w-5 h-5" />}
                    {buttonText}
                </button>
            </div>
        </>
    );

    const rightPanel = (
        <>
            {isCombining ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Spinner />
                    <p className="text-neutral-500 dark:text-neutral-400">Combining...</p>
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">{progressMessage}</p>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 p-4">
                   <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4"/>
                   <p className="font-semibold">Combination Failed</p>
                   <p className="text-sm mt-2 max-w-md mx-auto">{error}</p>
                </div>
            ) : outputUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <video key={outputUrl} src={outputUrl} controls autoPlay className="max-h-full max-w-full rounded-md" />
                    <a
                        href={outputUrl}
                        download={`monoklix-combined-video-${Date.now()}.mp4`}
                        className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download Video
                    </a>
                </div>
            ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-600">
                    <FilmIcon className="w-16 h-16 mx-auto" />
                    <p>Your combined video will appear here.</p>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

// FIX: Changed to a named export to resolve the "no default export" error.
export { VideoCombinerView };
