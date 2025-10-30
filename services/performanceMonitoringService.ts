import { telemetryService } from './telemetryService';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  category: 'response' | 'render' | 'memory' | 'api' | 'cache';
  tags?: Record<string, string>;
}

export interface PerformanceStats {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

const STORAGE_KEY = 'dlx-performance-metrics';
const MAX_METRICS = 5000;

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.loadMetrics();
    this.initializeObservers();
  }

  // Record a custom metric
  public recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      id: crypto.randomUUID(),
      name,
      value,
      timestamp: new Date().toISOString(),
      category,
      tags,
    };

    this.metrics.unshift(metric);

    // Keep only recent metrics
    if (this.metrics.length > MAX_METRICS) {
      this.metrics = this.metrics.slice(0, MAX_METRICS);
    }

    this.saveMetrics();
  }

  // Start timing an operation
  public startTimer(operationName: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration, 'response');
    };
  }

  // Measure a function execution
  public async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'api'
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, category);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, category, { error: 'true' });
      throw error;
    }
  }

  // Get statistics for a specific metric
  public getStats(
    metricName: string,
    timeRange?: { start: string; end: string }
  ): PerformanceStats | null {
    let filtered = this.metrics.filter(m => m.name === metricName);

    if (timeRange) {
      filtered = filtered.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    if (filtered.length === 0) return null;

    const values = filtered.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      count: values.length,
    };
  }

  // Get all metrics by category
  public getMetricsByCategory(
    category: PerformanceMetric['category'],
    limit: number = 100
  ): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category).slice(0, limit);
  }

  // Get metrics summary
  public getSummary(): Record<string, PerformanceStats> {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    const summary: Record<string, PerformanceStats> = {};

    for (const name of uniqueNames) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }

    return summary;
  }

  // Monitor memory usage
  public getMemoryUsage(): {
    jsHeapSize?: number;
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedPercent?: number;
  } {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        jsHeapSize: mem.usedJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        totalJSHeapSize: mem.totalJSHeapSize,
        usedPercent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
      };
    }
    return {};
  }

  // Clear old metrics
  public clearOldMetrics(olderThanDays: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffStr = cutoffDate.toISOString();

    const originalCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffStr);
    const removedCount = originalCount - this.metrics.length;

    if (removedCount > 0) {
      this.saveMetrics();
      telemetryService.logEvent({
        type: 'metrics_cleanup',
        removed: removedCount,
        remaining: this.metrics.length,
      });
    }
  }

  // Export metrics for analysis
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    } else {
      const headers = ['ID', 'Name', 'Value', 'Timestamp', 'Category', 'Tags'];
      const rows = this.metrics.map(m => [
        m.id,
        m.name,
        m.value.toString(),
        m.timestamp,
        m.category,
        m.tags ? JSON.stringify(m.tags) : '',
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
  }

  // Initialize performance observers for web vitals
  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Observe long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('long-task', entry.duration, 'render', {
            entryType: entry.entryType,
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (e) {
      // Long task observer not supported
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.startTime, 'render', {
            entryType: entry.entryType,
          });
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    } catch (e) {
      // Paint observer not supported
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordMetric(
            `resource-${resourceEntry.initiatorType}`,
            resourceEntry.duration,
            'api',
            {
              name: resourceEntry.name,
            }
          );
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      // Resource observer not supported
    }
  }

  // Helper: Calculate percentile
  private percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private loadMetrics() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load performance metrics', e);
    }
  }

  private saveMetrics() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (e) {
      console.error('Failed to save performance metrics', e);
    }
  }

  // Cleanup
  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
