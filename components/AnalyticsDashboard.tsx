import React, { useState, useEffect } from 'react';
import { multiModelService } from '../services/multiModelService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { securityService } from '../services/securityService';
import { collaborationService } from '../services/collaborationService';

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCard> = ({ title, value, change, trend }) => (
  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
    <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
    <div className="flex items-baseline justify-between">
      <p className="text-3xl font-bold text-white">{value}</p>
      {change && (
        <span className={`text-sm font-medium ${
          trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {change}
        </span>
      )}
    </div>
  </div>
);

const AnalyticsDashboard: React.FC = () => {
  const [totalCost, setTotalCost] = useState(0);
  const [modelStats, setModelStats] = useState<Map<string, any>>(new Map());
  const [performanceStats, setPerformanceStats] = useState<any>({});
  const [auditLogCount, setAuditLogCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    // Load AI model usage
    setTotalCost(multiModelService.getTotalCost());
    setModelStats(multiModelService.getUsageStats() as Map<string, any>);

    // Load performance data
    setPerformanceStats(performanceMonitoringService.getSummary());

    // Load security data
    const auditLogs = securityService.getAuditLogs();
    setAuditLogCount(auditLogs.length);

    // Load collaboration data
    const projects = collaborationService.getSharedProjects('local-user');
    setProjectCount(projects.length);
  };

  const exportData = (type: 'audit' | 'performance' | 'all') => {
    let data = '';
    let filename = '';

    switch (type) {
      case 'audit':
        data = securityService.exportAuditLogs('csv');
        filename = 'audit-logs.csv';
        break;
      case 'performance':
        data = performanceMonitoringService.exportMetrics('csv');
        filename = 'performance-metrics.csv';
        break;
      case 'all':
        const audit = securityService.exportAuditLogs('json');
        const perf = performanceMonitoringService.exportMetrics('json');
        data = JSON.stringify({ audit: JSON.parse(audit), performance: JSON.parse(perf) }, null, 2);
        filename = 'analytics-export.json';
        break;
    }

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCalls = Array.from(modelStats.values()).reduce((sum, stat) => sum + stat.totalCalls, 0);
  const avgLatency = Array.from(modelStats.values()).reduce((sum, stat) => sum + stat.avgLatencyMs, 0) / modelStats.size || 0;

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
        <p className="mt-2 text-lg text-gray-400">Monitor performance, costs, and usage across all features.</p>
      </header>

      {/* Key Metrics */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total AI Cost" 
            value={`$${totalCost.toFixed(2)}`}
            change="this month"
            trend="neutral"
          />
          <MetricCard 
            title="AI Requests" 
            value={totalCalls.toLocaleString()}
            change="+12%"
            trend="up"
          />
          <MetricCard 
            title="Avg Response Time" 
            value={`${avgLatency.toFixed(0)}ms`}
            change="-5%"
            trend="down"
          />
          <MetricCard 
            title="Active Projects" 
            value={projectCount}
            change="+2"
            trend="up"
          />
        </div>
      </section>

      {/* AI Model Usage */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">AI Model Usage</h2>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Model</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Calls</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Tokens In</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Tokens Out</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Avg Latency</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {Array.from(modelStats.entries()).map(([modelId, stats]) => (
                <tr key={modelId} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-white">{modelId}</td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">{stats.totalCalls.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">{stats.totalTokensIn.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">{stats.totalTokensOut.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">{stats.avgLatencyMs.toFixed(0)}ms</td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">${stats.totalCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      stats.successRate > 0.95 ? 'bg-green-900/50 text-green-400' :
                      stats.successRate > 0.8 ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {(stats.successRate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Response Time Distribution</h3>
            <div className="space-y-3">
              {Object.entries(performanceStats).slice(0, 5).map(([name, stats]: [string, any]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{name}</span>
                    <span className="text-gray-300">{stats.avg.toFixed(0)}ms avg</span>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>p50: {stats.p50.toFixed(0)}ms</span>
                    <span>p95: {stats.p95.toFixed(0)}ms</span>
                    <span>p99: {stats.p99.toFixed(0)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Security Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Audit Logs</span>
                <span className="text-white font-semibold">{auditLogCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Critical Alerts</span>
                <span className="text-red-400 font-semibold">
                  {securityService.getAuditLogs({ severity: 'critical' }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">API Keys Managed</span>
                <span className="text-white font-semibold">
                  {securityService.getApiKeys().length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Keys Need Rotation</span>
                <span className="text-yellow-400 font-semibold">
                  {securityService.checkKeyRotationNeeded().length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Export Controls */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Data Export</h2>
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-400 mb-4">Export analytics data for compliance, reporting, or external analysis.</p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => exportData('audit')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Export Audit Logs (CSV)
            </button>
            <button
              onClick={() => exportData('performance')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Export Performance (CSV)
            </button>
            <button
              onClick={() => exportData('all')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Export All Data (JSON)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
