import React, { useState, useCallback, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import { ModuleType } from './types';
import Spinner from './components/Spinner';
import ErrorBoundary from './components/ErrorBoundary';

const DashboardModule = lazy(() => import('./components/DashboardModule'));
const ChatModule = lazy(() => import('./components/ChatModule'));
const VisionModule = lazy(() => import('./components/VisionModule'));
const GenerationModule = lazy(() => import('./components/GenerationModule'));
const LiveModule = lazy(() => import('./components/LiveModule'));
const LocalStudioModule = lazy(() => import('./components/LocalStudioModule'));
const ProjectForgeModule = lazy(() => import('./components/ProjectForgeModule'));
const StoryWriterModule = lazy(() => import('./components/StoryWriterModule'));
const FeatureFlagModule = lazy(() => import('./components/FeatureFlagModule'));

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.Dashboard);

  const renderModule = useCallback(() => {
    switch (activeModule) {
      case ModuleType.Dashboard:
        return <DashboardModule setActiveModule={setActiveModule} />;
      case ModuleType.Chat:
        return <ChatModule />;
      case ModuleType.Vision:
        return <VisionModule />;
      case ModuleType.Generation:
        return <GenerationModule />;
      case ModuleType.Live:
        return <LiveModule />;
      case ModuleType.LocalStudio:
        return <LocalStudioModule />;
      case ModuleType.ProjectForge:
        return <ProjectForgeModule />;
      case ModuleType.StoryWriter:
        return <StoryWriterModule />;
      case ModuleType.FeatureFlags:
        return <FeatureFlagModule />;
      default:
        return <DashboardModule setActiveModule={setActiveModule} />;
    }
  }, [activeModule]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-300 overflow-hidden">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex justify-center items-center h-full"><Spinner className="w-10 h-10"/></div>}>
              {renderModule()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default App;
