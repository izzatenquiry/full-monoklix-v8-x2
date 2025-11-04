import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';
import { addLogEntry } from '../../services/aiLogService';
import { triggerUserWebhook } from '../../services/webhookService';
import { handleApiError } from '../../services/errorHandler';
import { type User } from '../../types';
import { incrementVideoUsage } from '../../services/userService';


interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const styleOptions = ["Random", "Realism", "Photorealistic", "Cinematic", "Anime", "Vintage", "3D Animation", "Watercolor", "Claymation"];
const lightingOptions = ["Random", "Studio Light", "Dramatic", "Natural Light", "Neon", "Golden Hour", "Soft Daylight"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay", "Wide Shot", "Medium Shot", "Long Shot", "Dutch Angle", "Low Angle", "High Angle", "Overhead Shot"];
const compositionOptions = ["Random", "Rule of Thirds", "Leading Lines", "Symmetry", "Golden Ratio", "Centered", "Asymmetrical"];
const lensTypeOptions = ["Random", "Wide Angle Lens", "Telephoto Lens", "Fisheye Lens", "Macro Lens", "50mm lens", "85mm lens"];
const filmSimOptions = ["Random", "Fujifilm Velvia", "Kodak Portra 400", "Cinematic Kodachrome", "Vintage Polaroid", "Ilford HP5 (B&W)"];
const effectOptions = ["None", "Random", "Water Splash", "Smoke", "Fire", "Floating in Water", "Rain Drops", "Light Streaks", "Confetti", "Glitter", "Powder Explosion"];
const resolutions = ["720p", "1080p"];
const moodOptions = [
    'Normal', 
    'Ceria - Laju', 
    'Semangat', 
    'Jualan', 
    'Sedih',
    'Berbisik',
    'Marah',
    'Tenang',
    'Rasmi',
    'Teruja',
    'Penceritaan',
    'Berwibawa',
    'Mesra'
];

const SESSION_KEY = 'videoGenerationState';

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset, currentUser, onUserUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [dialogueAudio, setDialogueAudio] = useState('');
  
  // Creative Direction State
  const [style, setStyle] = useState('Random');
  const [lighting, setLighting] = useState('Random');
  const [camera, setCamera] = useState('Random');
  const [composition, setComposition] = useState('Random');
  const [lensType, setLensType] = useState('Random');
  const [filmSim, setFilmSim] = useState('Random');
  const [effect, setEffect] = useState('None');

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [voiceoverLanguage, setVoiceoverLanguage] = useState('English');
  const [voiceoverMood, setVoiceoverMood] = useState('Normal');
  const languages = ["English", "Bahasa Malaysia", "Chinese"];

  const model = MODELS.videoGenerationDefault;
  const isVeo3 = model.startsWith('veo-3');

  const allStates = {
    prompt, negativePrompt, dialogue, dialogueAudio,
    style, lighting, camera, composition, lensType, filmSim, effect,
    referenceImage, previewUrl, resolution, aspectRatio, voiceoverLanguage, voiceoverMood
  };

  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            Object.keys(state).forEach(key => {
                if (key === 'prompt') setPrompt(state[key]);
                if (key === 'negativePrompt') setNegativePrompt(state[key]);
                if (key === 'dialogue') setDialogue(state[key]);
                if (key === 'dialogueAudio') setDialogueAudio(state[key]);
                if (key === 'style') setStyle(state[key]);
                if (key === 'lighting') setLighting(state[key]);
                if (key === 'camera') setCamera(state[key]);
                if (key === 'composition') setComposition(state[key]);
                if (key === 'lensType') setLensType(state[key]);
                if (key === 'filmSim') setFilmSim(state[key]);
                if (key === 'effect') setEffect(state[key]);
                if (key === 'referenceImage') setReferenceImage(state[key]);
                if (key === 'previewUrl') setPreviewUrl(state[key]);
                if (key === 'resolution') setResolution(state[key]);
                if (key === 'aspectRatio') setAspectRatio(state[key]);
                if (key === 'voiceoverLanguage') setVoiceoverLanguage(state[key]);
                if (key === 'voiceoverMood') setVoiceoverMood(state[key]);
            });
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);
  
  useEffect(() => {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(allStates));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prompt, negativePrompt, dialogue, dialogueAudio,
    style, lighting, camera, composition, lensType, filmSim, effect,
    referenceImage, previewUrl, resolution, aspectRatio, voiceoverLanguage, voiceoverMood
  ]);

  const loadingMessages = [
    "Warming up the AI director...",
    "Scouting for digital locations...",
    "Casting virtual actors...",
    "Adjusting camera and lighting...",
    "Action! Rendering scenes...",
    "This can take a few minutes. Please be patient.",
    "The AI is working hard on your masterpiece...",
    "Adding the final cinematic touches...",
    "Almost ready for the premiere...",
  ];

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isLoading) {
        interval = setInterval(() => {
          setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
        }, 3000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
      if (preset) {
          const sceneText = preset.prompt;
          let voiceover = '';
          let caption = '';
          let visualDescription = sceneText;

          const voiceoverRegex = /\*\*(?:Voiceover|Skrip Suara Latar):\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i;
          const voiceoverMatch = sceneText.match(voiceoverRegex);
          if (voiceoverMatch) {
              voiceover = voiceoverMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(voiceoverRegex, '');
          }

          const captionRegex = /\*\*(?:Captions?|Kapsyen):\*\*([\s\S]*?)(?=\n\*\*|$)/i;
          const captionMatch = sceneText.match(captionRegex);
          if (captionMatch) {
              caption = captionMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(captionRegex, '');
          }

          visualDescription = visualDescription.replace(/\*\*(.*?):\*\*/g, '').replace(/[\*\-]/g, '').replace(/\s+/g, ' ').trim();

          setPrompt(visualDescription);
          setDialogueAudio(voiceover);
          setDialogue(caption);
          setReferenceImage(preset.image);
          setPreviewUrl(`data:${preset.image.mimeType};base64,${preset.image.base64}`);
          
          clearPreset();
          window.scrollTo(0, 0);
      }
  }, [preset, clearPreset]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
      const urlToClean = videoUrl;
      return () => {
          if (urlToClean && urlToClean.startsWith('blob:')) {
              URL.revokeObjectURL(urlToClean);
          }
      };
  }, [videoUrl]);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
      setReferenceImage({ base64, mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
      if (!prompt.trim() && !referenceImage) {
          setError("Please provide a prompt or a reference image.");
          return;
      }

      alert("Please note: The voiceover language may be inconsistent. If you're not satisfied, you can regenerate the video by pressing the 'Generate Video' button again.");

      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setVideoFilename(null);
      setThumbnailUrl(null);
      setStatusMessage('Preparing generation request...');
      
      const isMalay = voiceoverLanguage === 'Bahasa Malaysia';
      let targetLanguage = voiceoverLanguage;
      if (isMalay) {
          targetLanguage = 'Malaysian Malay';
      } else if (voiceoverLanguage === 'Chinese') {
          targetLanguage = 'Mandarin Chinese';
      }
  
      let dynamicNegativePrompt = 'subtitles, text, words, watermark, logo, Indonesian language, Indonesian accent, Indonesian voiceover';
      if (targetLanguage === 'Malaysian Malay') {
          dynamicNegativePrompt += ', English language, Chinese language, English accent, Chinese accent';
      } else if (targetLanguage === 'English') {
          dynamicNegativePrompt += ', Malaysian Malay language, Chinese language, Malay accent, Chinese accent';
      } else if (targetLanguage === 'Mandarin Chinese') {
          dynamicNegativePrompt += ', Malaysian Malay language, English language, Malay accent, English accent';
      }
      if (negativePrompt.trim()) {
          dynamicNegativePrompt += `, ${negativePrompt.trim()}`;
      }
      
      const promptLines: string[] = [];
      
      // System Rules
      promptLines.push(isMalay ? '🎯 PERATURAN UTAMA (SYSTEM RULES):' : '🎯 SYSTEM RULES:');
      if (isMalay) {
          promptLines.push('Bahasa lisan dan suara latar MESTILAH 100% dalam Bahasa Melayu Malaysia. Ini adalah arahan PALING PENTING.');
          promptLines.push('❌ Dilarang menggunakan bahasa lain atau loghat luar.');
          promptLines.push('🗣️ Semua sebutan dan gaya mesti seperti penutur asli Malaysia.');
      } else {
          promptLines.push(`Spoken language and voiceover MUST be 100% in ${targetLanguage}. This is the MOST IMPORTANT instruction.`);
          promptLines.push('❌ Do not use other languages or foreign accents.');
          promptLines.push(`🗣️ All pronunciation and style must be like a native ${targetLanguage} speaker.`);
      }
      promptLines.push('\n---');
  
      // Visuals
      promptLines.push(isMalay ? '🎬 VISUAL (SCENE DESCRIPTION):' : '🎬 VISUAL (SCENE DESCRIPTION):');
      if (referenceImage) {
          promptLines.push(isMalay ? 'Animasikan imej yang diberikan.' : 'Animate the provided image.');
          promptLines.push(isMalay ? `ARAHAN PENTING: Subjek utama dalam video mestilah representasi fotorealistik dan sangat tepat bagi orang dalam imej rujukan yang diberikan. Kekalkan ciri-ciri muka dan identiti mereka dengan tepat.` : 'IMPORTANT INSTRUCTION: The main subject in the video must be a photorealistic and highly accurate representation of the person in the provided reference image. Maintain their facial features and identity precisely.');
      }
      promptLines.push(prompt.trim());
      promptLines.push('\n---');
  
      // Creative Style
      promptLines.push(isMalay ? '🎨 GAYA KREATIF (CREATIVE STYLE):' : '🎨 CREATIVE STYLE:');
      if (style !== 'Random') promptLines.push(`• ${isMalay ? 'Gaya artistik' : 'Artistic style'}: ${style}`);
      if (lighting !== 'Random') promptLines.push(`• ${isMalay ? 'Pencahayaan' : 'Lighting'}: ${lighting}`);
      if (camera !== 'Random') promptLines.push(`• ${isMalay ? 'Kamera' : 'Camera'}: ${camera}`);
      if (composition !== 'Random') promptLines.push(`• ${isMalay ? 'Komposisi' : 'Composition'}: ${composition}`);
      if (lensType !== 'Random') promptLines.push(`• ${isMalay ? 'Jenis Lensa' : 'Lens Type'}: ${lensType}`);
      if (filmSim !== 'Random') promptLines.push(`• ${isMalay ? 'Simulasi Filem' : 'Film Simulation'}: ${filmSim}`);
      if (effect !== 'None' && effect !== 'Random') promptLines.push(`• ${isMalay ? 'Efek tambahan' : 'Additional Effect'}: ${effect}`);
      promptLines.push('\n---');
  
      // Audio
      if (dialogueAudio.trim() && isVeo3) {
          promptLines.push(isMalay ? '🔊 AUDIO (DIALOGUE):' : '🔊 AUDIO (DIALOGUE):');
          promptLines.push(isMalay ? `Gunakan hanya dialog berikut dalam Bahasa Melayu Malaysia:` : `Use only the following dialogue in ${targetLanguage}:`);
          promptLines.push(`"${dialogueAudio.trim()}"`);
          promptLines.push(isMalay ? 'ARAHAN PENTING: Sebutkan skrip ini dengan lengkap, perkataan demi perkataan. Jangan ubah atau ringkaskan ayat.' : 'CRITICAL INSTRUCTION: Speak this script completely, word for word. Do not change or shorten the sentences.');
          promptLines.push(isMalay ? `Nada suara: ${voiceoverMood}.` : `Voice tone: ${voiceoverMood}.`);
          promptLines.push('\n---');
      }
  
      // Additional Reminders
      promptLines.push(isMalay ? '🚫 PERINGATAN TAMBAHAN:' : '🚫 ADDITIONAL REMINDERS:');
      if (dialogue.trim()) {
          promptLines.push(isMalay ? `• Paparkan teks pada skrin ini sahaja: "${dialogue.trim()}".` : `• Display this exact on-screen text: "${dialogue.trim()}".`);
      } else {
          promptLines.push(isMalay ? '• Jangan sertakan teks, kapsyen, atau sari kata pada skrin.' : '• Do not include any on-screen text, captions, or subtitles.');
      }
      promptLines.push(isMalay ? '• Jangan ubah bahasa.' : '• Do not change the language.');
      
      const fullPrompt = promptLines.join('\n');

      try {
          const image = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
          
          const { videoUrl: streamUrl, thumbnailUrl: newThumbnailUrl, videoBlobPromise } = await generateVideo(fullPrompt, model, aspectRatio, resolution, dynamicNegativePrompt, image, setStatusMessage);

          if (streamUrl) {
              console.log('✅ Video stream URL received:', streamUrl);
              setVideoUrl(streamUrl);
              setVideoFilename(`monoklix-video-${Date.now()}.mp4`);
              setThumbnailUrl(newThumbnailUrl);
              
              videoBlobPromise.then(async (videoFile) => {
                  await addHistoryItem({
                      type: 'Video',
                      prompt: `Video Generation: ${prompt.trim().substring(0, 100)}...`,
                      result: videoFile,
                  });
                  const updateResult = await incrementVideoUsage(currentUser.id);
                  if (updateResult.success && updateResult.user) {
                      onUserUpdate(updateResult.user);
                  }
              }).catch(err => {
                  console.error("Failed to save video to history:", err);
                  setError("Video generated but failed to save to gallery. Please download it now.");
              });
          }
      } catch (e) {
          const userFriendlyMessage = handleApiError(e);
          setError(userFriendlyMessage);
      } finally {
          setIsLoading(false);
          setStatusMessage('');
      }
  }, [prompt, style, lighting, camera, composition, lensType, filmSim, effect, dialogue, dialogueAudio, isVeo3, referenceImage, model, aspectRatio, resolution, negativePrompt, voiceoverLanguage, voiceoverMood, currentUser.id, onUserUpdate]);

  const handleDownloadVideo = async () => {
    if (!videoUrl || !videoFilename) return;
    setIsDownloading(true);
    try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = videoFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error("Download error:", error);
        setError(error instanceof Error ? error.message : "Failed to download video.");
    } finally {
        setIsDownloading(false);
    }
  };

  const removeReferenceImage = () => {
      setReferenceImage(null);
      setPreviewUrl(null);
      setImageUploadKey(Date.now());
  };

  const handleReset = useCallback(() => {
    setPrompt('');
    setNegativePrompt('');
    setDialogue('');
    setDialogueAudio('');
    
    setStyle('Random');
    setLighting('Random');
    setCamera('Random');
    setComposition('Random');
    setLensType('Random');
    setFilmSim('Random');
    setEffect('None');
    
    setVideoUrl(null);
    setVideoFilename(null);
    setThumbnailUrl(null);
    setError(null);
    setReferenceImage(null);
    setPreviewUrl(null);
    setResolution("720p");
    setAspectRatio("9:16");
    setVoiceoverLanguage('English');
    setVoiceoverMood('Normal');
    setImageUploadKey(Date.now());
    setStatusMessage('');
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
        <div>
            <h1 className="text-2xl font-bold sm:text-3xl">AI Video Generator</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Create high-quality videos from text or images.</p>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">Model & Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {["9:16", "16:9", "1:1", "4:3", "3:4"].map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolution</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {resolutions.map(res => <option key={res} value={res}>{res}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Reference Image (Optional)</h2>
            {previewUrl ? (
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="Reference Preview" className="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-800" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <ImageUpload id="video-ref-upload" key={imageUploadKey} onImageUpload={handleImageUpload} title="Upload Start Image"/>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
                The AI will use this image as the starting point for the video.
            </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Main Prompt</h2>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A futuristic city with flying cars at sunset..." rows={5} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">Creative Direction</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Artistic Style</label><select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{styleOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Lighting</label><select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{lightingOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Camera Shot</label><select value={camera} onChange={e => setCamera(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{cameraOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Composition</label><select value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{compositionOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Lens Type</label><select value={lensType} onChange={e => setLensType(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{lensTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Film Simulation</label><select value={filmSim} onChange={e => setFilmSim(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{filmSimOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Visual Effect</label><select value={effect} onChange={e => setEffect(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{effectOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Negative Prompt (What to avoid)</label><textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="e.g., blurry, shaky, watermark" rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" /></div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Dialogue & Text</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="on-screen-text" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">On-Screen Text (Captions)</label>
                    <textarea id="on-screen-text" value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder="Enter any text you want to appear on the video." rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="spoken-dialogue" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Spoken Dialogue (Voiceover)</label>
                        <div className={`relative ${!isVeo3 ? 'opacity-50' : ''}`}>
                            <textarea
                                id="spoken-dialogue"
                                value={dialogueAudio}
                                onChange={e => setDialogueAudio(e.target.value)}
                                placeholder="Enter the exact dialogue for the AI to speak."
                                rows={2}
                                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:cursor-not-allowed"
                                disabled={!isVeo3}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="voiceover-language" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Voiceover Language</label>
                        <select
                            id="voiceover-language"
                            value={voiceoverLanguage}
                            onChange={(e) => setVoiceoverLanguage(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voiceover-mood" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Voiceover Mood</label>
                        <select
                            id="voiceover-mood"
                            value={voiceoverMood}
                            onChange={(e) => setVoiceoverMood(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {moodOptions.map(mood => <option key={mood} value={mood}>{mood}</option>)}
                        </select>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md" dangerouslySetInnerHTML={{ __html: 'Voiceover is only supported by <strong>Veo 3 models</strong> and works best with English.' }}/>
            </div>
        </div>
        
        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? <Spinner /> : 'Generate Video'}
                </button>
                <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    Reset
                </button>
            </div>
             {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
    </>
  );

  const rightPanel = (
      <>
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Spinner />
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">{statusMessage || 'Generating...'}</p>
                  <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{loadingMessages[loadingMessageIndex]}</p>
              </div>
          ) : error && !videoUrl ? ( // Only show error if there's no video to display
               <div className="text-center text-red-500 dark:text-red-400 p-4">
                   <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-semibold">Generation Failed</p>
                   <p className="text-sm mt-2 max-w-md mx-auto">{error}</p>
                   <button
                       onClick={handleGenerate}
                       className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 mx-auto"
                   >
                       <RefreshCwIcon className="w-4 h-4" />
                       Try Again
                   </button>
              </div>
          ) : videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <video 
                      key={videoUrl}
                      src={videoUrl}
                      poster={thumbnailUrl || undefined}
                      controls 
                      autoPlay 
                      playsInline
                      muted
                      className="max-h-full max-w-full rounded-md"
                  >
                      Your browser does not support the video tag.
                  </video>
                  
                  {error && <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>}

                  <button
                    onClick={handleDownloadVideo}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                    {isDownloading ? 'Downloading...' : 'Download Video'}
                  </button>
              </div>
          ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <StarIcon className="w-16 h-16 mx-auto" />
                  <p>Your generated video will appear here.</p>
              </div>
          )}
      </>
  );

  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default VideoGenerationView;