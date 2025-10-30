import React, { useState, useEffect } from 'react';
import { ModuleType, StoryEntry, FeatureFlagState } from '../types';
import { ChatIcon, VisionIcon, GenerationIcon, ProjectForgeIcon, StoryWriterIcon, BeakerIcon, EyeOffIcon } from './icons';
import { storyWriterService } from '../services/storyWriterService';
import { featureFlagService } from '../services/featureFlagService';

const allFeatures = [
  { id: 'vibeWorkspace', title: "Vibe Coding Workspace", description: "Monaco Editor with AI autocomplete, live preview, and refactoring.", icon: "🎨" },
  { id: 'aiAssistants', title: "AI Development Assistants", description: "Code reviewer, bug finder, documentation generator, and test generator.", icon: "🤖" },
  { id: 'assetGeneration', title: "Asset Generation Suite", description: "AI logo/icon generator, color palettes, copywriting, and SEO metadata.", icon: "🖼️" },
  { id: 'ragLite', title: "RAG-Powered Knowledge System", description: "Context-aware AI from your documents, tutorials, and codebase.", icon: "🧠" },
  { id: 'multiModel', title: "Multi-Model AI Platform", description: "Compare Gemini, GPT-4, Claude, and local models with cost tracking.", icon: "🤹" },
  { id: 'collaborationTools', title: "Team Collaboration Suite", description: "Shared projects, code reviews, comments, and real-time editing.", icon: "👥" },
  { id: 'analytics', title: "Advanced Analytics Dashboard", description: "Performance metrics, cost tracking, usage reports, and data export.", icon: "📊" },
  { id: 'security', title: "Enterprise Security & Audit", description: "API key rotation, audit logging, rate limiting, and compliance tools.", icon: "🔒" },
  { id: 'performance', title: "Performance Monitoring", description: "Real-time metrics, web vitals tracking, and optimization insights.", icon: "⚡" },
  { id: 'automationEngine', title: "Automation Engine", description: "Templates for Affiliate/SEO sites, SaaS, Trading Bots, and more.", icon: "💰" },
  { id: 'marketIntel', title: "Market Intelligence", description: "Advanced Trading Bot Builder, backtesting, and exchange integrations.", icon: "📈" },
  { id: 'localStudio', title: "Local LLM Integration Hub", description: "Unified API adapter for local models, with management and monitoring.", icon: "🏠" },
];

const FlagBadge: React.FC<{ state: FeatureFlagState }> = ({ state }) => {
    const badgeStyles: { [key in FeatureFlagState]?: { text: string, color: string, icon: React.ReactNode } } = {
        preview: { text: "Preview", color: "border-blue-400 text-blue-300", icon: <VisionIcon className="w-3 h-3 mr-1" /> },
        labs: { text: "Labs", color: "border-purple-400 text-purple-300", icon: <BeakerIcon className="w-3 h-3 mr-1" /> },
        comingSoon: { text: "Soon", color: "border-gray-500 text-gray-400", icon: null },
        inactive: { text: "Inactive", color: "border-red-500 text-red-400", icon: <EyeOffIcon className="w-3 h-3 mr-1" /> },
    };
    const style = badgeStyles[state];
    if (!style) return null;

    return (
        <div className={`absolute top-2 right-2 text-xs border rounded-full px-2 py-0.5 flex items-center bg-gray-900/50 ${style.color}`}>
            {style.icon}
            {style.text}
        </div>
    );
};


const FeatureCard: React.FC<{ title: string, description: string, icon: string, flag: FeatureFlagState }> = ({ title, description, icon, flag }) => (
  <div className={`bg-gray-800/50 rounded-lg p-6 flex flex-col items-start transition-all duration-200 border border-gray-700 relative ${flag === 'active' || flag === 'preview' || flag === 'labs' ? 'hover:bg-gray-700/50' : 'opacity-50'}`}>
    <FlagBadge state={flag} />
    <div className="text-3xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

const ActionCard: React.FC<{ title: string, description: string, icon: React.ReactNode, onClick: () => void, flag: FeatureFlagState }> = ({ title, description, icon, onClick, flag }) => {
    const isActive = flag === 'active' || flag === 'preview' || flag === 'labs';
    return (
        <button onClick={onClick} disabled={!isActive} className={`bg-cyan-900/50 rounded-lg p-6 flex flex-col text-left items-start transition-colors duration-200 border border-cyan-700 w-full h-full relative ${isActive ? 'hover:bg-cyan-800/50' : 'opacity-50 cursor-not-allowed'}`}>
          <FlagBadge state={flag} />
          <div className="text-cyan-400 mb-4">{icon}</div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </button>
    );
};

const StoryEntryCard: React.FC<{ entry: StoryEntry; onClick: () => void }> = ({ entry, onClick }) => (
    <button onClick={onClick} className="bg-gray-800/50 rounded-lg p-4 flex flex-col text-left items-start hover:bg-gray-700/50 transition-colors duration-200 border border-gray-700 w-full">
      <h4 className="text-md font-bold text-white truncate w-full">{entry.title}</h4>
      <p className="text-xs text-gray-500 mb-2">{new Date(entry.date).toLocaleDateString()}</p>
      <div className="flex flex-wrap gap-1">
        {entry.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">{tag}</span>
        ))}
      </div>
    </button>
);


const DashboardModule: React.FC<{ setActiveModule: (module: ModuleType) => void }> = ({ setActiveModule }) => {
  const [recentEntries, setRecentEntries] = useState<StoryEntry[]>([]);
  const flags = featureFlagService.getFlags();

  useEffect(() => {
    const entries = storyWriterService.getEntries().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentEntries(entries.slice(0, 4));
  }, []);


  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">DLX Co-Pilot 4.0</h1>
        <p className="mt-2 text-lg text-gray-400">Enterprise-grade AI development platform with multi-model support and advanced collaboration.</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ActionCard title="Start New Chat" description="Engage with the multi-modal chat assistant." icon={<ChatIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.Chat)} flag={flags['chatAssistant'] || 'active'} />
            <ActionCard title="Analyze Media" description="Use the Vision Lab to understand images and videos." icon={<VisionIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.Vision)} flag={flags['visionLab'] || 'active'} />
            <ActionCard title="Start Coding" description="Open the Project Forge to build and edit web projects." icon={<ProjectForgeIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.ProjectForge)} flag={flags['vibeWorkspace']} />
            <ActionCard title="Log an Entry" description="Open the Story Writer to document decisions and events." icon={<StoryWriterIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.StoryWriter)} flag={flags['storyWriter']} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {allFeatures.slice(0,6).map((feature, index) => (
                    <FeatureCard key={index} {...feature} flag={flags[feature.id]} />
                ))}
            </div>
        </section>
        <section>
            <h2 className="text-2xl font-bold text-white mb-4">Story Writer Highlights</h2>
            <div className="space-y-4">
                {recentEntries.length > 0 ? (
                    recentEntries.map(entry => <StoryEntryCard key={entry.id} entry={entry} onClick={() => setActiveModule(ModuleType.StoryWriter)} />)
                ) : (
                    <p className="text-gray-500">No entries found. Start by creating one!</p>
                )}
            </div>
        </section>
      </div>

    </div>
  );
};

export default DashboardModule;