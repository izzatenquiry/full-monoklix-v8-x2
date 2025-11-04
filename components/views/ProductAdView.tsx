import React, { useState, useCallback, useEffect } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StoreIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getProductAdPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';


const vibeOptions = ["Random", "Energetic & Fun", "Cinematic & Epic", "Modern & Clean", "Natural & Organic", "Tech & Futuristic"];
const lightingOptions = ["Random","Studio Light", "Dramatic", "Natural Light", "Neon", "Golden Hour", "Soft Daylight"];
const contentTypeOptions = ["Random", "Hard Selling", "Soft Selling", "Storytelling", "Problem/Solution", "ASMR / Sensory", "Unboxing", "Educational", "Testimonial"];
const languages = ["English", "Bahasa Malaysia", "Chinese"];

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const SESSION_KEY = 'productAdState';

interface ProductAdViewProps {
}

const ProductAdView: React.FC<ProductAdViewProps> = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selections, setSelections] = useState({
    vibe: vibeOptions[0],
    lighting: lightingOptions[0],
    contentType: contentTypeOptions[0],
    language: "English",
  });
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  
  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.productImage) setProductImage(state.productImage);
            if (state.productDesc) setProductDesc(state.productDesc);
            if (state.selections) setSelections(state.selections);
            if (state.storyboard) setStoryboard(state.storyboard);
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);

  useEffect(() => {
    try {
        const stateToSave = { productImage, productDesc, selections, storyboard };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  }, [productImage, productDesc, selections, storyboard]);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleRemoveImage = useCallback(() => {
    setProductImage(null);
  }, []);
  
  const handleSelection = (category: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
  };

  const handleGenerate = async () => {
    if (!productImage || !productDesc) {
      setError("A product image and description are required to generate a storyline.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setStoryboard(null);
    setCopied(false);

    const prompt = getProductAdPrompt({
        productDesc,
        language: selections.language,
        vibe: selections.vibe,
        lighting: selections.lighting,
        contentType: selections.contentType,
    });

    try {
      const result = await generateMultimodalContent(prompt, [productImage]);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Storyboard',
        prompt: `Product Ad: ${productDesc.substring(0, 50)}... (Lang: ${selections.language})`,
        result: result,
      });
    } catch (e) {
      const userFriendlyMessage = handleApiError(e);
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (!storyboard) return;
    navigator.clipboard.writeText(storyboard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleReset = useCallback(() => {
    setProductImage(null);
    setProductDesc('');
    setSelections({
        vibe: vibeOptions[0],
        lighting: lightingOptions[0],
        contentType: contentTypeOptions[0],
        language: "English",
    });
    setStoryboard(null);
    setError(null);
    setImageUploadKey(Date.now());
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
      <>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Product Ad Storyline</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Generate a short, punchy video ad concept.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Upload Product Photo</h2>
          <ImageUpload key={imageUploadKey} id="product-ad-upload" onImageUpload={handleImageUpload} onRemove={handleRemoveImage} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Product Description</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="e.g., Organic coffee beans from Brazil, single-origin, rich aroma..."
            rows={4}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Creative Direction</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectControl
              label="Vibe / Mood"
              value={selections.vibe}
              onChange={(value) => handleSelection('vibe', value)}
              options={vibeOptions}
            />
            <SelectControl
              label="Lighting"
              value={selections.lighting}
              onChange={(value) => handleSelection('lighting', value)}
              options={lightingOptions}
            />
            <SelectControl
              label="Content Type"
              value={selections.contentType}
              onChange={(value) => handleSelection('contentType', value)}
              options={contentTypeOptions}
            />
            <SelectControl
              label="Output Language"
              value={selections.language}
              onChange={(value) => handleSelection('language', value)}
              options={languages}
            />
          </div>
        </div>

        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? <Spinner /> : "Generate Storyline"}
                </button>
                 <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="flex-shrink-0 mt-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
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
        {storyboard && !isLoading && (
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                  {copied ? "Copied!" : "Copy"}
              </button>
              <button 
                onClick={() => downloadText(storyboard, `monoklix-storyboard-${Date.now()}.txt`)} 
                className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                  <DownloadIcon className="w-4 h-4"/> Download
              </button>
            </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner />
            <p className="text-neutral-500 dark:text-neutral-400">Generating your storyline...</p>
          </div>
        )}
        {storyboard && !isLoading && (
          <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap w-full h-full overflow-y-auto pr-2 custom-scrollbar">
            {storyboard}
          </div>
        )}
        {!isLoading && !storyboard && (
          <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
            <div>
              <StoreIcon className="w-16 h-16 mx-auto" />
              <p>Your generated storyboard will appear here.</p>
            </div>
          </div>
        )}
      </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ProductAdView;
