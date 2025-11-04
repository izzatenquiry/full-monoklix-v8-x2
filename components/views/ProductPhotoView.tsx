import React, { useState, useCallback, useEffect } from 'react';
import ImageUpload from '../common/ImageUpload';
import { type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { CameraIcon, DownloadIcon, WandIcon, VideoIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getProductPhotoPrompt } from '../../services/promptManager';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';
import { editOrComposeWithImagen } from '../../services/imagenV3Service';
import { handleApiError } from '../../services/errorHandler';


const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface ProductPhotoViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  language: Language;
}

const vibeOptions = ["Random", "Studio Backdrop", "Tabletop / Surface", "Premium Texture", "Light & Shadow", "Color & Palette", "Nature & Organic", "Urban & Industrial", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const styleOptions = ["Random", "Realism", "Photorealistic", "Cinematic", "Anime", "Vintage", "3D Animation", "Watercolor", "Claymation"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon", "Backlight", "Rim Lighting"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay", "Wide Shot", "Medium Shot", "Long Shot", "Dutch Angle", "Low Angle", "High Angle", "Overhead Shot"];
const compositionOptions = ["Random", "Rule of Thirds", "Leading Lines", "Symmetry", "Golden Ratio", "Centered", "Asymmetrical"];
const lensTypeOptions = ["Random", "Wide Angle Lens", "Telephoto Lens", "Fisheye Lens", "Macro Lens", "50mm lens", "85mm lens"];
const filmSimOptions = ["Random", "Fujifilm Velvia", "Kodak Portra 400", "Cinematic Kodachrome", "Vintage Polaroid", "Ilford HP5 (B&W)"];
const effectOptions = ["None", "Random", "Water Splash", "Smoke", "Fire", "Floating in Water", "Rain Drops", "Light Streaks", "Confetti", "Glitter", "Powder Explosion"];

const SESSION_KEY = 'productPhotoState';

type ImageSlot = string | { error: string } | null;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

const SelectControl: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: (string | number)[];
  id: string;
}> = ({ value, onChange, options, id }) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const ProductPhotoView: React.FC<ProductPhotoViewProps> = ({ onReEdit, onCreateVideo, language }) => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [vibe, setVibe] = useState('Random');
  const [style, setStyle] = useState('Random');
  const [lighting, setLighting] = useState('Random');
  const [camera, setCamera] = useState('Random');
  const [composition, setComposition] = useState('Random');
  const [lensType, setLensType] = useState('Random');
  const [filmSim, setFilmSim] = useState('Random');
  const [effect, setEffect] = useState('None');
  const [creativityLevel, setCreativityLevel] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'>('1:1');
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [progress, setProgress] = useState(0);
  
  const T = getTranslations(language).productPhotoView;
  const commonT = getTranslations(language);

  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            // Do not load image data from session storage
            // if (state.productImage) setProductImage(state.productImage);
            // if (state.images) setImages(state.images);
            if (state.vibe) setVibe(state.vibe);
            if (state.style) setStyle(state.style);
            if (state.lighting) setLighting(state.lighting);
            if (state.camera) setCamera(state.camera);
            if (state.composition) setComposition(state.composition);
            if (state.lensType) setLensType(state.lensType);
            if (state.filmSim) setFilmSim(state.filmSim);
            if (state.effect) setEffect(state.effect);
            if (state.creativityLevel) setCreativityLevel(state.creativityLevel);
            if (state.customPrompt) setCustomPrompt(state.customPrompt);
            if (state.numberOfImages) setNumberOfImages(state.numberOfImages);
            if (state.aspectRatio) setAspectRatio(state.aspectRatio);
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);

  useEffect(() => {
    try {
        const stateToSave = {
            vibe, style, lighting, camera, composition, lensType,
            filmSim, effect, creativityLevel, customPrompt, numberOfImages, aspectRatio
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibe, style, lighting, camera, composition, lensType, filmSim, effect, creativityLevel, customPrompt, numberOfImages, aspectRatio]);

  const handleRemoveImage = useCallback(() => {
    setProductImage(null);
  }, []);

  const generateOneImage = useCallback(async (index: number) => {
    if (!productImage) return;

    setImages(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });

    const prompt = getProductPhotoPrompt({ vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect });

    try {
        const result = await editOrComposeWithImagen({
            prompt,
            images: [{ ...productImage, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'product' }],
            config: { aspectRatio }
        });
        const imageBase64 = result.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;
        
        if (!imageBase64) {
            throw new Error("The AI did not return an image. Please try a different prompt.");
        }
        
        await addHistoryItem({
            type: 'Image',
            prompt: `Product Photo: ${prompt.substring(0, 50)}...`,
            result: imageBase64
        });

        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = imageBase64;
            return newImages;
        });
    } catch (e) {
        const errorMessage = handleApiError(e);
        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = { error: errorMessage };
            return newImages;
        });
    }
  }, [productImage, vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect, aspectRatio]);

  const handleGenerate = useCallback(async () => {
    if (!productImage) {
      setError("Please upload a product image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setImages(Array(numberOfImages).fill(null));
    setSelectedImageIndex(0);

    for (let i = 0; i < numberOfImages; i++) {
        setProgress(i + 1);
        await generateOneImage(i);
    }

    setIsLoading(false);
    setProgress(0);
  }, [numberOfImages, productImage, generateOneImage]);
  
  const handleRetry = useCallback(async (index: number) => {
    setImages(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
    await generateOneImage(index);
  }, [generateOneImage]);

  const handleReset = useCallback(() => {
    setProductImage(null);
    setImages([]);
    setError(null);
    setVibe('Random');
    setStyle('Random');
    setLighting('Random');
    setCamera('Random');
    setComposition('Random');
    setLensType('Random');
    setFilmSim('Random');
    setEffect('None');
    setCreativityLevel(5);
    setCustomPrompt('');
    setNumberOfImages(1);
    setAspectRatio('1:1');
    setImageUploadKey(Date.now());
    setProgress(0);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
      </div>

      <Section title={T.uploadProduct}>
        <ImageUpload key={imageUploadKey} id="product-photo-upload" onImageUpload={(base64, mimeType) => setProductImage({ base64, mimeType })} onRemove={handleRemoveImage} title={T.uploadTitle} />
      </Section>

      <Section title={T.customPrompt}>
        <textarea
          id="custom-prompt"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={T.customPromptPlaceholder}
          rows={3}
          className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{T.customPromptHelp}</p>
      </Section>
      
      <Section title={T.creativeDirection}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="vibe-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.backgroundVibe}</label><SelectControl id="vibe-select" value={vibe} onChange={setVibe} options={vibeOptions} /></div>
          <div><label htmlFor="style-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.artisticStyle}</label><SelectControl id="style-select" value={style} onChange={setStyle} options={styleOptions} /></div>
          <div><label htmlFor="lighting-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lighting}</label><SelectControl id="lighting-select" value={lighting} onChange={setLighting} options={lightingOptions} /></div>
          <div><label htmlFor="camera-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.cameraShot}</label><SelectControl id="camera-select" value={camera} onChange={setCamera} options={cameraOptions} /></div>
          <div><label htmlFor="composition-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.composition}</label><SelectControl id="composition-select" value={composition} onChange={setComposition} options={compositionOptions} /></div>
          <div><label htmlFor="lens-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lensType}</label><SelectControl id="lens-select" value={lensType} onChange={setLensType} options={lensTypeOptions} /></div>
          <div><label htmlFor="film-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.filmSim}</label><SelectControl id="film-select" value={filmSim} onChange={setFilmSim} options={filmSimOptions} /></div>
          <div><label htmlFor="effect-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.visualEffect}</label><SelectControl id="effect-select" value={effect} onChange={setEffect} options={effectOptions} /></div>
        </div>
      </Section>
      
      <Section title={T.aiSettings}>
        <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="creativity-slider" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{`${T.creativityLevel} (${creativityLevel})`}</label>
              <input id="creativity-slider" type="range" min="0" max="10" step="1" value={creativityLevel} onChange={(e) => setCreativityLevel(Number(e.target.value))} className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="num-images-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.numberOfImages}</label>
                  <SelectControl id="num-images-select" value={String(numberOfImages)} onChange={(val) => setNumberOfImages(Number(val))} options={[1, 2, 3, 4, 5]} />
                </div>
                <div>
                    <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.aspectRatio}</label>
                    <select id="aspect-ratio-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        <option value="1:1">Square (1:1)</option>
                        <option value="9:16">Portrait (9:16)</option>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="3:4">Portrait (3:4)</option>
                        <option value="4:3">Landscape (4:3)</option>
                    </select>
                </div>
            </div>
        </div>
      </Section>
      
      <div className="pt-4 mt-auto">
          <div className="flex gap-4">
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                {isLoading ? <Spinner /> : T.generateButton}
            </button>
            <button
                onClick={handleReset}
                disabled={isLoading}
                className="flex-shrink-0 mt-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
            >
                {T.resetButton}
            </button>
          </div>
          {error && !isLoading && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>
    </>
  );

  const ActionButtons: React.FC<{ imageBase64: string; mimeType: string }> = ({ imageBase64, mimeType }) => (
    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <button onClick={() => onReEdit({ base64: imageBase64, mimeType })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
      <button onClick={() => onCreateVideo({ prompt: getProductPhotoPrompt({ vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect }), image: { base64: imageBase64, mimeType } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
      <button onClick={() => triggerDownload(imageBase64, 'monoklix-product-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
    </div>
  );

  const rightPanel = (
    <>
        {images.length > 0 ? (
           <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
                {(() => {
                    const selectedImage = images[selectedImageIndex];
                    if (typeof selectedImage === 'string') {
                        return (
                            <>
                                <img src={`data:image/png;base64,${selectedImage}`} alt={`Generated image ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                                <ActionButtons imageBase64={selectedImage} mimeType="image/png" />
                            </>
                        );
                    } else if (selectedImage && typeof selectedImage === 'object') {
                        return (
                            <div className="text-center text-red-500 dark:text-red-400 p-4">
                                <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-semibold">Generation Failed</p>
                                <p className="text-sm mt-2 max-w-md mx-auto">{selectedImage.error}</p>
                                <button
                                    onClick={() => handleRetry(selectedImageIndex)}
                                    className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    <RefreshCwIcon className="w-4 h-4" />
                                    Try Again
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Spinner />
                            {isLoading && numberOfImages > 1 && (
                                <p className="text-sm text-neutral-500">
                                    {`${commonT.generating} (${progress}/${numberOfImages})`}
                                </p>
                            )}
                        </div>
                    );
                })()}
            </div>
            {images.length > 1 && (
              <div className="flex-shrink-0 w-full flex justify-center">
                <div className="flex gap-2 overflow-x-auto p-2">
                  {images.map((img, index) => (
                    <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                       {typeof img === 'string' ? (
                            <img src={`data:image/png;base64,${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                        ) : img && typeof img === 'object' ? (
                            <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                        ) : (
                            <Spinner />
                        )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
                <Spinner />
                <p className="text-sm text-neutral-500">
                    {`${commonT.generating}${numberOfImages > 1 ? ` (1/${numberOfImages})` : ''}`}
                </p>
            </div>
        ) : (
          <div className="text-center text-neutral-500 dark:text-neutral-600">
            <CameraIcon className="w-16 h-16 mx-auto" /><p>{T.outputPlaceholder}</p>
          </div>
        )}
    </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ProductPhotoView;