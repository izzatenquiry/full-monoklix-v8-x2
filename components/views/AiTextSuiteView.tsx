import React, { useState, useEffect } from 'react';
import ContentIdeasView from './ContentIdeasView';
import MarketingCopyView from './MarketingCopyView';
import StaffMonoklixView from './StaffMonoklixView';
import Tabs, { type Tab } from '../common/Tabs';
// FIX: Import Language type.
import { type User, type Language } from '../../types';

type TabId = 'staff-monoklix' | 'content-ideas' | 'marketing-copy';

interface AiTextSuiteViewProps {
    currentUser: User;
    // FIX: Add language to props interface.
    language: Language;
}

const AiTextSuiteView: React.FC<AiTextSuiteViewProps> = ({ currentUser, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('staff-monoklix');

    const tabs: Tab<TabId>[] = [
        { id: 'staff-monoklix', label: "Staff MONOklix" },
        { id: 'content-ideas', label: "Content Ideas" },
        { id: 'marketing-copy', label: "Marketing Copy" },
    ];

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'staff-monoklix':
                // FIX: Pass language prop to StaffMonoklixView.
                return <StaffMonoklixView language={language} />;
            case 'content-ideas':
                return <ContentIdeasView />;
            case 'marketing-copy':
                return <MarketingCopyView />;
            default:
                // FIX: Pass language prop to StaffMonoklixView.
                return <StaffMonoklixView language={language} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin' || currentUser.status === 'lifetime'}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiTextSuiteView;