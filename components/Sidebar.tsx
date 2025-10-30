import React, { memo } from 'react';
import { ModuleType } from '../types';
import { DashboardIcon, ChatIcon, VisionIcon, GenerationIcon, LiveIcon, ServerIcon, ProjectForgeIcon, StoryWriterIcon, CogIcon } from './icons';

interface SidebarProps {
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = memo(({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'text-white bg-cyan-500/20 border-r-4 border-cyan-400'
        : 'text-gray-400 hover:text-white hover:bg-gray-700'
    }`}
  >
    {icon}
    <span className="ml-4">{label}</span>
  </button>
));

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const navItems = [
    { type: ModuleType.Dashboard, icon: <DashboardIcon className="w-6 h-6" />, label: 'Dashboard' },
    { type: ModuleType.Chat, icon: <ChatIcon className="w-6 h-6" />, label: 'Chat Assistant' },
    { type: ModuleType.Vision, icon: <VisionIcon className="w-6 h-6" />, label: 'Vision Lab' },
    { type: ModuleType.Generation, icon: <GenerationIcon className="w-6 h-6" />, label: 'Asset Forge' },
    { type: ModuleType.ProjectForge, icon: <ProjectForgeIcon className="w-6 h-6" />, label: 'Project Forge' },
    { type: ModuleType.StoryWriter, icon: <StoryWriterIcon className="w-6 h-6" />, label: 'Story Writer' },
    { type: ModuleType.Live, icon: <LiveIcon className="w-6 h-6" />, label: 'Live Conversation' },
    { type: ModuleType.LocalStudio, icon: <ServerIcon className="w-6 h-6" />, label: 'Local Studio' },
  ];

  const adminItems = [
     { type: ModuleType.FeatureFlags, icon: <CogIcon className="w-6 h-6" />, label: 'Feature Flags' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-800 border-r border-gray-700">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white tracking-wider">DLX Co-Pilot</h1>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.type}
            icon={item.icon}
            label={item.label}
            isActive={activeModule === item.type}
            onClick={() => setActiveModule(item.type)}
          />
        ))}
      </nav>
      <div className="py-4 border-t border-gray-700">
         {adminItems.map((item) => (
            <NavItem
                key={item.type}
                icon={item.icon}
                label={item.label}
                isActive={activeModule === item.type}
                onClick={() => setActiveModule(item.type)}
            />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
