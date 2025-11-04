import React from 'react';
import { type View, type NavItem, type User, UserStatus } from '../types';
import {
  ImageIcon, VideoIcon, SettingsIcon, BookOpenIcon, LogoutIcon, GalleryIcon, LogoIcon, XIcon, LibraryIcon, FileTextIcon, GraduationCapIcon, TrendingUpIcon, RobotIcon, MegaphoneIcon, DatabaseIcon, WhatsAppIcon
} from './Icons';
import { TRIAL_USAGE_LIMIT } from '../services/aiConfig';
import { APP_VERSION } from '../services/appConfig';


const getNavItems = (): NavItem[] => [
  { id: 'home', label: "Home", description: "Learn Content Strategy", section: 'main', icon: BookOpenIcon, isSpecial: true },
  { id: 'get-started', label: "Get Started Guide", section: 'main', icon: GraduationCapIcon },
  { id: 'ai-text-suite', label: "AI Content Idea", section: 'free', icon: FileTextIcon, hideForStatus: ['trial'] },
  { id: 'ai-image-suite', label: "AI Image Suite", section: 'free', icon: ImageIcon, hideForStatus: ['trial'] },
  { id: 'ai-video-suite', label: "AI Video & Voice", section: 'free', icon: VideoIcon },
  { id: 'social-post-studio', label: "Social Post Studio", section: 'free', icon: MegaphoneIcon, isNew: true, roles: ['admin'] },
  { id: 'gallery', label: "Gallery & History", section: 'free', icon: GalleryIcon },
  { id: 'ai-prompt-library-suite', label: "Prompt Library", section: 'free', icon: LibraryIcon, isNew: true, hideForStatus: ['trial'] },
  { id: 'support-group', label: "MONOklix Support Group", section: 'bottom', icon: WhatsAppIcon, isExternal: true, url: 'https://chat.whatsapp.com/Hk0uyuxk1QW820oxsRaPlW' },
  { id: 'settings', label: "Settings", section: 'bottom', icon: SettingsIcon, roles: ['admin', 'user'], hideForStatus: ['trial'] },
  { id: 'logout', label: "Logout", section: 'bottom', icon: LogoutIcon }
];


interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => Promise<void>;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, currentUser, isOpen, onClose }) => {
  const navItems = getNavItems();

  const handleItemClick = async (viewId: View | 'logout') => {
    if (viewId === 'logout') {
      await onLogout();
    } else {
      setActiveView(viewId as View);
    }
    if (isOpen) {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isTrialAndUsedUp = currentUser.status === 'trial' && (currentUser.storyboardUsageCount || 0) >= TRIAL_USAGE_LIMIT;
    const isDisabled = item.id === 'ai-video-suite' && isTrialAndUsedUp;

    if (item.id === 'support-group' && item.url) {
        return (
            <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors duration-200 text-left text-sm font-semibold bg-green-500 text-white hover:bg-green-600 shadow-md"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
            </li>
        );
    }

    if (item.isSpecial) {
        return (
            <button 
                key={item.id}
                onClick={() => handleItemClick(item.id as View)}
                className={`w-full p-4 rounded-lg text-left mb-6 transition-all duration-300 transform hover:scale-[1.02] ${
                activeView === 'home' 
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' 
                    : 'bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/40 dark:to-indigo-900/40 border border-transparent text-neutral-700 dark:text-neutral-200 hover:shadow-md'
                }`}
            >
                <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                <div>
                    <p className="font-bold">{item.label}</p>
                    <p className={`text-xs ${activeView === 'home' ? 'text-white/80' : 'text-primary-600 dark:text-primary-400'}`}>{item.description}</p>
                </div>
                </div>
            </button>
        );
    }

    const baseClasses = "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-left text-sm font-medium";
    let stateClasses = "";

    if (isDisabled) {
        stateClasses = "opacity-50 cursor-not-allowed text-neutral-400 dark:text-neutral-600";
    } else if (activeView === item.id && !item.isExternal) {
        stateClasses = "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md";
    } else {
        stateClasses = "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white hover:translate-x-1";
    }

    const content = (
      <>
        <item.icon className="w-5 h-5 mr-4" />
        <span className="flex-1">{item.label}</span>
        {item.isNew && !isDisabled && <span className="text-xs bg-primary-500/20 text-primary-500 dark:text-primary-400 font-bold px-2 py-0.5 rounded-full">New!</span>}
        {isDisabled && item.id === 'ai-video-suite' && <span className="text-xs bg-red-500/20 text-red-500 font-bold px-2 py-0.5 rounded-full ml-auto">Limit</span>}
      </>
    );

    return (
        <li key={item.id}>
            {item.isExternal && item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {content}
                </a>
            ) : (
                <button
                  onClick={() => !isDisabled && handleItemClick(item.id as View | 'logout')}
                  disabled={isDisabled}
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {content}
                </button>
            )}
        </li>
    );
  };

  const renderSection = (section: NavItem['section'], title?: string) => {
    const filteredItems = navItems.filter(item => {
        if (item.section !== section) return false;
        if (item.roles && !item.roles.includes(currentUser.role)) return false;
        if (item.disabledForStatus && item.disabledForStatus.includes(currentUser.status)) return false;
        if (item.hideForStatus && item.hideForStatus.includes(currentUser.status)) return false;
        return true;
    });

    if (filteredItems.length === 0) return null;

    return (
    <div>
      {title && <h3 className="px-4 pt-6 pb-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{title}</h3>}
      <ul className="space-y-2">
        {filteredItems.map(item => renderNavItem(item))}
      </ul>
    </div>
    );
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <nav 
        className={`w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-5 flex flex-col transition-transform duration-300 ease-custom-ease z-40
                   lg:relative lg:translate-x-0
                   fixed inset-y-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 flex items-center justify-between">
            <LogoIcon className="w-40 text-neutral-800 dark:text-neutral-200" />
          <button onClick={onClose} className="lg:hidden p-2" aria-label="Close menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {renderSection('main')}
          {renderSection('free', "AI Agent")}
          {renderSection('ugc', 'UGC Content')}
          {renderSection('admin', 'Admin')}
        </div>
        
        <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-800">
          {renderSection('bottom')}
          <p className="mt-4 text-center text-neutral-500 dark:text-neutral-600 text-xs">© 2025 MONOklix.com ({APP_VERSION})</p>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;