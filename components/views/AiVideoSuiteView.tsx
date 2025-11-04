import React, { useState, useEffect, useMemo } from 'react';
import VideoGenerationView from './VideoGenerationView';
// FIX: Changed to a named import to resolve the "no default export" error.
import { VideoCombinerView } from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import ProductReviewView from './ProductReviewView';
import Tabs, { type Tab } from '../common/Tabs';
// FIX: Import Language type.
import { type BatchProcessorPreset, type User, type Language } from '../../types';
import BatchProcessorView from './BatchProcessorView';


type TabId = 'generation' | 'storyboard' | 'batch' | 'combiner' | 'voice';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiVideoSuiteViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add language to props interface.
  language: Language;
}

const AiVideoSuiteView: React.FC<AiVideoSuiteViewProps> = ({ preset, clearPreset, onReEdit, onCreateVideo, currentUser, onUserUpdate, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const allTabs: Tab<TabId>[] = [
        { id: 'generation', label: "Video Generation" },
        { id: 'storyboard', label: "Video Storyboard" },
        { id: 'batch', label: "Batch Processor", adminOnly: true },
        { id: 'combiner', label: "Video Combiner", adminOnly: true },
        { id: 'voice', label: "Voice Studio" }
    ];

    const tabs = useMemo(() => {
        // FIX: Changed check from `currentUser.role` to `currentUser.status` to correctly identify trial users.
        if (currentUser.status === 'trial') {
            return allTabs.filter(tab => tab.id === 'storyboard');
        }
        return allTabs;
    }, [currentUser.status, allTabs]);

    useEffect(() => {
        if (preset) {
            setActiveTab('generation');
        }
    }, [preset]);
    
    useEffect(() => {
        // FIX: Changed check from `currentUser.role` to `currentUser.status` to correctly identify trial users.
        if (currentUser.status === 'trial' && activeTab !== 'storyboard') {
            setActiveTab('storyboard');
        } else if (currentUser.role !== 'admin' && (activeTab === 'batch' || activeTab === 'combiner')) {
            setActiveTab('generation');
        }
    }, [currentUser.role, currentUser.status, activeTab]);

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'generation':
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                        />;
            case 'storyboard':
                return <ProductReviewView 
                            onReEdit={onReEdit} 
                            onCreateVideo={onCreateVideo} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                        />;
            case 'batch':
                return <BatchProcessorView preset={null} clearPreset={() => {}} />;
            case 'combiner':
                return <VideoCombinerView />;
            case 'voice':
                // FIX: Passed language prop to VoiceStudioView to provide the required 'language' prop.
                return <VoiceStudioView language={language} />;
            default:
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                        />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin'}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiVideoSuiteView;