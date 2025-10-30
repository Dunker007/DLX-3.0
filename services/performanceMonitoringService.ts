import { telemetryService } from './telemetryService';

interface PerformanceMetric {
    operation: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    metadata?: Record<string, any>;
}

interface PerformanceThresholds {
    entryCreation: number; // ms
    entryUpdate: number; // ms
    search: number; // ms
    referenceValidation: number; // ms
}

class PerformanceMonitoringService {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private thresholds: PerformanceThresholds = {
        entryCreation: 180000, // 3 minutes (but target is 2-3 minutes to write)
        entryUpdate: 5000, // 5 seconds
        search: 1000, // 1 second
        referenceValidation: 500, // 500ms
    };

    /**
     * Start tracking a performance metric
     */
    public startMetric(operationId: string, operation: string, metadata?: Record<string, any>): void {
        this.metrics.set(operationId, {
            operation,
            startTime: performance.now(),
            metadata,
        });
    }

    /**
     * End tracking a performance metric and log if it exceeds threshold
     */
    public endMetric(operationId: string): number | null {
        const metric = this.metrics.get(operationId);
        if (!metric) {
            console.warn(`Performance metric not found: ${operationId}`);
            return null;
        }

        metric.endTime = performance.now();
        metric.durationMs = metric.endTime - metric.startTime;

        // Check against thresholds
        const threshold = this.getThreshold(metric.operation);
        if (threshold && metric.durationMs > threshold) {
            console.warn(
                `Performance threshold exceeded for ${metric.operation}: ${metric.durationMs.toFixed(2)}ms (threshold: ${threshold}ms)`,
                metric.metadata
            );
        }

        // Clean up
        this.metrics.delete(operationId);

        return metric.durationMs;
    }

    /**
     * Track Story Writer overhead specifically
     */
    public trackStoryWriterOverhead(operation: string, durationMs: number, metadata?: Record<string, any>): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            durationMs,
            metadata,
        };

        console.log('STORY_WRITER_OVERHEAD:', JSON.stringify(logEntry));

        // If duration exceeds "2-3 minutes to write" success criteria
        if (operation === 'entry_creation' && durationMs > 180000) {
            console.warn(
                `Story Writer entry creation took ${(durationMs / 1000).toFixed(1)}s, exceeding 3-minute target`
            );
        }
    }

    /**
     * Monitor build performance to ensure it stays under 2s target
     */
    public trackBuildPerformance(buildTimeMs: number): void {
        const targetMs = 2000; // 2 seconds (current is 1.75s)
        
        if (buildTimeMs > targetMs) {
            console.warn(
                `Build time ${(buildTimeMs / 1000).toFixed(2)}s exceeds target of ${(targetMs / 1000).toFixed(2)}s`
            );
        } else {
            console.log(
                `Build performance within target: ${(buildTimeMs / 1000).toFixed(2)}s / ${(targetMs / 1000).toFixed(2)}s`
            );
        }
    }

    /**
     * Get performance statistics for a specific operation type
     */
    public getStats(operation: string): { count: number; avgMs: number; maxMs: number; minMs: number } | null {
        // This would require persistent storage in a real implementation
        // For now, return null as we're not storing historical data
        return null;
    }

    /**
     * Update performance thresholds
     */
    public setThreshold(operation: keyof PerformanceThresholds, thresholdMs: number): void {
        this.thresholds[operation] = thresholdMs;
    }

    private getThreshold(operation: string): number | null {
        switch (operation) {
            case 'entry_creation':
                return this.thresholds.entryCreation;
            case 'entry_update':
                return this.thresholds.entryUpdate;
            case 'search':
                return this.thresholds.search;
            case 'reference_validation':
                return this.thresholds.referenceValidation;
            default:
                return null;
        }
    }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
