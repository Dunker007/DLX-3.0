import React from 'react';
import { ModuleType } from '../types';
import { ChatIcon, VisionIcon, GenerationIcon, ProjectForgeIcon } from './icons';

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

const DashboardModule: React.FC<{ setActiveModule: (module: ModuleType) => void }> = ({ setActiveModule }) => {
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
            <ActionCard title="Generate an Asset" description="Create images or videos with the Asset Forge." icon={<GenerationIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.Generation)} />
            <ActionCard title="Start Coding" description="Open the Project Forge to build and edit web projects." icon={<ProjectForgeIcon className="w-8 h-8"/>} onClick={() => setActiveModule(ModuleType.ProjectForge)} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
            ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardModule;