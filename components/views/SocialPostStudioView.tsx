import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { type Language, type User, type HistoryItem } from '../../types';
import { getTranslations } from '../../services/translations';
import { sendSocialPostToWebhook } from '../../services/webhookService';
import { generateText } from '../../services/geminiService';
import { getSocialPostStudioCaptionPrompt } from '../../services/promptManager';
import { MegaphoneIcon, XIcon, CheckCircleIcon, ImageIcon, VideoIcon, SparklesIcon, UserIcon, UsersIcon } from '../Icons';
import Spinner from '../common/Spinner';
import MediaSelectionModal from '../common/MediaSelectionModal';

interface SocialPostStudioViewProps {
  language: Language;
  currentUser: User;
}

// --- AI Writer Modal ---
interface AiAgent {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
}
const aiAgents: AiAgent[] = [
    { id: 'najwa', icon: UserIcon },
    { id: 'julia', icon: MegaphoneIcon },
    { id: 'musa', icon: UsersIcon },
];
const outputLanguages = ["English", "Bahasa Malaysia", "Chinese"];

interface AiWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: { caption: string; cta: string; hashtags: string }) => void;
  language: Language;
  translations: any;
}

const AiWriterModal: React.FC<AiWriterModalProps> = ({ isOpen, onClose, onConfirm, language, translations }) => {
    const [selectedAgentId, setSelectedAgentId] = useState('najwa');
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const [parsedResult, setParsedResult] = useState<{ caption: string, cta: string, hashtags: string } | null>(null);
    const [outputLanguage, setOutputLanguage] = useState(language === 'ms' ? 'Bahasa Malaysia' : 'English');

    useEffect(() => {
        if (!isOpen) {
            setInput('');
            setGeneratedText('');
            setParsedResult(null);
            setIsGenerating(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (generatedText) {
            try {
                const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (typeof parsed.caption === 'string' && typeof parsed.cta === 'string' && typeof parsed.hashtags === 'string') {
                        setParsedResult(parsed);
                        return;
                    }
                }
                setParsedResult({ caption: generatedText, cta: '', hashtags: '' });
            } catch (e) {
                console.error("Failed to parse AI response:", e);
                setParsedResult({ caption: generatedText, cta: '', hashtags: '' });
            }
        } else {
            setParsedResult(null);
        }
    }, [generatedText]);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setIsGenerating(true);
        setGeneratedText('');
        setParsedResult(null);
        try {
            const prompt = getSocialPostStudioCaptionPrompt({
                agentId: selectedAgentId,
                userInput: input,
                language: outputLanguage
            });
            const result = await generateText(prompt);
            setGeneratedText(result);
        } catch (err) {
            setGeneratedText(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (parsedResult) {
            onConfirm(parsedResult);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-zoomIn p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{translations.aiWriterModalTitle}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"><XIcon className="w-6 h-6"/></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.selectAgent}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {aiAgents.map(agent => {
                                    const agentInfo = translations.agents[agent.id];
                                    const isSelected = agent.id === selectedAgentId;
                                    return (
                                        <button
                                            key={agent.id}
                                            onClick={() => setSelectedAgentId(agent.id)}
                                            className={`p-3 rounded-lg text-center border-2 transition-all duration-200 h-full ${
                                                isSelected
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-500'
                                            }`}
                                        >
                                            <agent.icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`} />
                                            {/* FIX: Cast `agentInfo` to `any` to allow property access, as it was being inferred as `unknown`. */}
                                            <p className={`font-bold text-sm ${isSelected ? 'text-primary-700 dark:text-white' : 'text-neutral-800 dark:text-neutral-200'}`}>{(agentInfo as any)?.name}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div>
                           <label htmlFor="output-language" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.outputLanguage}</label>
                            <select id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                               {outputLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                           </select>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="ai-writer-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.agentDescription}</label>
                        <textarea
                            id="ai-writer-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={translations.agentInputPlaceholder}
                            rows={3}
                            className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>
                     <button onClick={handleGenerate} disabled={isGenerating || !input.trim()} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>}
                        {isGenerating ? translations.generating : translations.generate}
                    </button>
                </div>
                
                {(parsedResult || isGenerating) && (
                    <div className="mt-4 space-y-3">
                        {isGenerating ? <div className="flex justify-center items-center h-full py-10"><Spinner/></div> : parsedResult && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{translations.generatedCaption}</label>
                                    <textarea readOnly value={parsedResult.caption} rows={4} className="w-full text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg p-2 resize-none border-none focus:outline-none custom-scrollbar" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{translations.generatedHashtags}</label>
                                    <input readOnly value={parsedResult.hashtags} className="w-full text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg p-2 border-none focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{translations.generatedCta}</label>
                                    <input readOnly value={parsedResult.cta} className="w-full text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg p-2 border-none focus:outline-none" />
                                </div>
                            </>
                        )}
                    </div>
                )}
                
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-neutral-200 dark:bg-neutral-700 font-semibold py-2 px-6 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                        {translations.close}
                    </button>
                     <button onClick={handleConfirm} disabled={!parsedResult || isGenerating} className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {translations.useText}
                    </button>
                </div>
            </div>
        </div>
    );
};


const SocialPostStudioView: React.FC<SocialPostStudioViewProps> = ({ language, currentUser }) => {
    const T = getTranslations(language).socialPostStudioView;
    const [textContent, setTextContent] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<HistoryItem[]>([]);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [isAiWriterOpen, setIsAiWriterOpen] = useState(false);
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cta, setCta] = useState('');
    const [link, setLink] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    
    const handleSend = async () => {
        setStatus({ type: 'loading', message: T.sending });
        const result = await sendSocialPostToWebhook(textContent, hashtags, cta, link, scheduleDate, selectedMedia);
        if (result.success) {
            setStatus({ type: 'success', message: T.sendSuccess });
            setTextContent('');
            setHashtags('');
            setSelectedMedia([]);
            setCta('');
            setLink('');
            setScheduleDate('');
        } else {
            setStatus({ type: 'error', message: `${T.sendError} ${result.message}` });
        }
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
    };

    const removeMedia = (id: string) => {
        setSelectedMedia(prev => prev.filter(item => item.id !== id));
    };
    
    const handleConfirmSelection = (items: HistoryItem[]) => {
        setSelectedMedia(items);
    }
    
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const videoFile = fileArray.find((f: File) => f.type.startsWith('video/'));

        if (videoFile) {
            const newVideoItem: HistoryItem = {
                id: `manual-${Date.now()}`,
                userId: currentUser.id,
                type: 'Video',
// FIX: `videoFile` was inferred as `unknown`. Casting to `File` to access properties and ensure type compatibility.
                prompt: (videoFile as File).name,
// FIX: `videoFile` was inferred as `unknown`. Casting to `File` to ensure type compatibility with `string | Blob`.
                result: videoFile as File, // The File object is a Blob
                timestamp: Date.now(),
            };
            setSelectedMedia([newVideoItem]);
        } else {
            const imageFiles = fileArray.filter((f: File) => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            const currentImages = selectedMedia.filter(item => item.type !== 'Video');
            const slotsAvailable = 4 - currentImages.length;
            if (slotsAvailable <= 0) return;

            const imagesToAdd = imageFiles.slice(0, slotsAvailable);

            const newImageItems: HistoryItem[] = imagesToAdd.map((file) => ({
                id: `manual-${Date.now()}-${Math.random()}`,
                userId: currentUser.id,
                type: 'Image',
// FIX: `file` was inferred as `unknown`. Casting to `File` to access properties and ensure type compatibility.
                prompt: (file as File).name,
// FIX: `file` was inferred as `unknown`. Casting to `File` to ensure type compatibility with `string | Blob`.
                result: file as File,
                timestamp: Date.now(),
            }));

            setSelectedMedia([...currentImages, ...newImageItems]);
        }

        if (event.target) {
            event.target.value = '';
        }

    }, [currentUser.id, selectedMedia]);

    if (!currentUser.webhookUrl) {
        return (
            <div className="text-center p-8 sm:p-12 max-w-lg mx-auto bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
                    <MegaphoneIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-neutral-800 dark:text-white sm:text-2xl">{T.noWebhookTitle}</h2>
                <p className="mt-2 text-neutral-600 dark:text-neutral-300">{T.noWebhookBody}</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Left Panel: Composer */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="post-content" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">{T.textContentLabel}</label>
                             <button onClick={() => setIsAiWriterOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                                <SparklesIcon className="w-4 h-4" />
                                {T.generateWithAi}
                            </button>
                        </div>
                        <textarea
                            id="post-content"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder={T.textContentPlaceholder}
                            rows={5}
                            className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label htmlFor="post-hashtags" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.hashtagsLabel}</label>
                        <textarea
                            id="post-hashtags"
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                            placeholder="#hashtag1 #hashtag2"
                            rows={2}
                            className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.mediaLabel}</label>
                        <div className="min-h-[100px] bg-neutral-100 dark:bg-neutral-800/50 rounded-lg p-3">
                            {selectedMedia.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-4">{T.noMedia}</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {selectedMedia.map(item => (
                                        <div key={item.id} className="relative group aspect-square">
                                            <img src={item.result instanceof Blob ? URL.createObjectURL(item.result) : `data:image/png;base64,${item.result}`} alt="Selected media" className="w-full h-full object-cover rounded-md"/>
                                            <button onClick={() => removeMedia(item.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XIcon className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                           <button onClick={() => setIsMediaModalOpen(true)} className="w-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold py-2 px-4 rounded-lg hover:bg-primary-200/70 dark:hover:bg-primary-900/80 transition-colors">
                                {T.addMediaButton}
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                                {T.uploadFromDesktop}
                            </button>
                        </div>
                         <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="post-cta" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.ctaLabel}</label>
                        <input id="post-cta" type="text" value={cta} onChange={(e) => setCta(e.target.value)} placeholder={T.ctaPlaceholder} className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    </div>

                    <div>
                        <label htmlFor="post-link" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.linkLabel}</label>
                        <input id="post-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={T.linkPlaceholder} className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    </div>

                    <div>
                        <label htmlFor="post-schedule" className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.scheduleLabel}</label>
                        <input id="post-schedule" type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    </div>

                </div>

                {/* Right Panel: Preview & Action */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{T.previewTitle}</h2>
                    <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-800/50 rounded-md overflow-hidden p-4 space-y-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap flex-shrink-0">
                           {textContent || "Your text will appear here..."}
                        </div>
                        
                        {hashtags && (
                            <div className="text-sm text-primary-500 dark:text-primary-400 whitespace-pre-wrap break-words">
                                {hashtags}
                            </div>
                        )}
                        
                        {(cta || link || scheduleDate) && (
                            <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                {cta && <p><strong>CTA:</strong> {cta}</p>}
                                {link && <p className="truncate"><strong>Link:</strong> <a href={link} className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">{link}</a></p>}
                                {scheduleDate && <p><strong>Scheduled for:</strong> {new Date(scheduleDate).toLocaleString(language === 'ms' ? 'ms-MY' : 'en-US')}</p>}
                            </div>
                        )}

                        {selectedMedia.length > 0 && (
                             <div className="grid grid-cols-2 gap-2 mt-auto">
                                {selectedMedia.map(item => (
                                    <div key={item.id} className="relative aspect-square">
                                        {item.type === 'Video' ? <VideoIcon className="w-full h-full text-neutral-400 p-4"/> : <ImageIcon className="w-full h-full text-neutral-400 p-4"/>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     <div className="mt-6">
                        <button onClick={handleSend} disabled={status.type === 'loading' || (!textContent.trim() && selectedMedia.length === 0)} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {status.type === 'loading' ? <Spinner /> : <MegaphoneIcon className="w-5 h-5"/>}
                            {status.type === 'loading' ? T.sending : T.sendButton}
                        </button>
                        {status.type !== 'idle' && status.type !== 'loading' && (
                            <div className={`flex items-center gap-2 mt-3 text-sm p-3 rounded-md ${status.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                {status.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <XIcon className="w-5 h-5"/>}
                                {status.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <MediaSelectionModal 
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                onConfirm={handleConfirmSelection}
            />
            
            <AiWriterModal
                isOpen={isAiWriterOpen}
                onClose={() => setIsAiWriterOpen(false)}
                onConfirm={(result) => {
                    setTextContent(result.caption);
                    setCta(result.cta);
                    setHashtags(result.hashtags);
                    setIsAiWriterOpen(false);
                }}
                language={language}
                translations={T}
            />
        </>
    );
};

export default SocialPostStudioView;