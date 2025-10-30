import React, { useState, useEffect } from 'react';
import { ModuleType, StoryWriterEntry } from '../types';
import { ChatIcon, VisionIcon, GenerationIcon, ProjectForgeIcon, StoryWriterIcon } from './icons';
import { storyWriterService } from '../services/storyWriterService';

const features = [
  { title: "Local LLM Integration Hub", description: "Unified API adapter for local models, with management and monitoring.", icon: "🏠" },
  { title: "Multi-Provider AI Management", description: "Service layer for LM Studio, Gemini, Claude, and more with key management.", icon: "🔌" },
  { title: "Vibe Coding Workspace", description: "Monaco Editor with AI autocomplete, live preview, and refactoring.", icon: "🎨" },
  { title: "Project Management System", description: "Project templates, AI planner, task breakdown, and version control.", icon: "🗂️" },
  { title: "Passive Income Project Generators", description: "Templates for Affiliate/SEO sites, SaaS, Trading Bots, and more.", icon: "💰" },
  { title: "Advanced Trading Bot Builder", description: "Visual strategy designer, backtesting engine, and exchange integrations.", icon: "📈" },
  { title: "Integrated Toolchain", description: "Package manager UI, build tool configurator, and dependency analyzer.", icon: "🛠️" },
  { title: "AI Development Assistants", description: "Code reviewer, bug finder, documentation generator, and test generator.", icon: "🤖" },
  { title: "Asset Generation Suite", description: "AI logo/icon generator, color palettes, copywriting, and SEO metadata.", icon: "🖼️" },
  { title: "RAG-Powered Knowledge System", description: "Context-aware AI from your documents, tutorials, and codebase.", icon: "🧠" },
];

const FeatureCard: React.FC<{ title: string, description: string, icon: string }> = ({ title, description, icon }) => (
  <div className="bg-gray-800/50 rounded-lg p-6 flex flex-col items-start hover:bg-gray-700/50 transition-colors duration-200 border border-gray-700">
    <div className="text-3xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

const ActionCard: React.FC<{ title: string, description: string, icon: React.ReactNode, onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <button onClick={onClick} className="bg-cyan-900/50 rounded-lg p-6 flex flex-col text-left items-start hover:bg-cyan-800/50 transition-colors duration-200 border border-cyan-700 w-full h-full">
      <div className="text-cyan-400 mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </button>
);

const StoryEntryCard: React.FC<{ entry: StoryWriterEntry; onClick: () => void }> = ({ entry, onClick }) => (
    <button onClick={onClick} className="bg-gray-800/50 rounded-lg p-4 flex flex-col text-left items-start hover:bg-gray-700/50 transition-colors duration-200 border border-gray-700 w-full">
      <h4 className="text-md font-bold text-white truncate w-full">{entry.title}</h4>
      <p className="text-xs text-gray-500 mb-2">{new Date(entry.dateUtc).toLocaleDateString()}</p>
      <div className="flex flex-wrap gap-1">
        {entry.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">{tag}</span>
        ))}
      </div>
    </button>
);


const DashboardModule: React.FC<{ setActiveModule: (module: ModuleType) => void }> = ({ setActiveModule }) => {
  const [recentEntries, setRecentEntries] = useState<StoryWriterEntry[]>([]);

  useEffect(() => {
    const entries = storyWriterService.getEntries().sort((a,b) => new Date(b.dateUtc).getTime() - new Date(a.dateUtc).getTime());
    setRecentEntries(entries.slice(0, 4));
  }, []);


  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Cognitive Operational Co-Pilot</h1>
        <p className="mt-2 text-lg text-gray-400">Your self-hosted AI web creation studio and strategic partner.</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ActionCard title="Start New Chat" description="Engage with the multi-modal chat assistant." icon={<ChatIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.Chat)} />
            <ActionCard title="Analyze Media" description="Use the Vision Lab to understand images and videos." icon={<VisionIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.Vision)} />
            <ActionCard title="Start Coding" description="Open the Project Forge to build and edit web projects." icon={<ProjectForgeIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.ProjectForge)} />
            <ActionCard title="Log an Entry" description="Open the Story Writer to document decisions and events." icon={<StoryWriterIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.StoryWriter)} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {features.slice(0,6).map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
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