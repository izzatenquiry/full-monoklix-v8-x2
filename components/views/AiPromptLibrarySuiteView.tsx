import React, { useState } from 'react';
import LibraryView from './LibraryView';
import PromptViralMyView from './PromptViralMyView';
import Tabs, { type Tab } from '../common/Tabs';

type TabId = 'nano-banana' | 'viral-my';

interface AiPromptLibrarySuiteViewProps {
    onUsePrompt: (prompt: string) => void;
}

const AiPromptLibrarySuiteView: React.FC<AiPromptLibrarySuiteViewProps> = ({ onUsePrompt }) => {
    const [activeTab, setActiveTab] = useState<TabId>('nano-banana');

    const tabs: Tab<TabId>[] = [
        { id: 'nano-banana', label: "Nano Banana Prompts" },
        { id: 'viral-my', label: "Viral Prompts (MY)" },
    ];

    const renderActiveTabContent = () => {
        const commonProps = { onUsePrompt };
        switch (activeTab) {
            case 'nano-banana':
                return <LibraryView {...commonProps} />;
            case 'viral-my':
                return <PromptViralMyView {...commonProps} />;
            default:
                return <LibraryView {...commonProps} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiPromptLibrarySuiteView;