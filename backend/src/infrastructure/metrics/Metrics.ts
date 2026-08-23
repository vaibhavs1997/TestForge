// Metrics collection for monitoring
// Provides Prometheus-compatible metrics endpoint

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

class MetricsCollector {
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  // Counter - monotonically increasing value
  increment(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing[existing.length - 1].value += value;
    } else {
      this.counters.set(key, [{ value, labels, timestamp: Date.now() }]);
    }
  }

  // Gauge - point-in-time value
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { value, labels, timestamp: Date.now() });
  }

  // Histogram - distribution of values
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key);
    
    if (existing) {
      existing.push(value);
    } else {
      this.histograms.set(key, [value]);
    }
  }

  // Get Prometheus-format metrics
  getMetrics(): string {
    const lines: string[] = [];
    
    // Add uptime
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    lines.push('# HELP testforge_uptime_seconds Server uptime in seconds');
    lines.push('# TYPE testforge_uptime_seconds gauge');
    lines.push(`testforge_uptime_seconds ${uptime}`);
    lines.push('');

    // Add counters
    lines.push('# HELP testforge_requests_total Total number of requests');
    lines.push('# TYPE testforge_requests_total counter');
    for (const [key, values] of this.counters.entries()) {
      const latest = values[values.length - 1];
      const labelsStr = this.formatLabels(latest.labels || {});
      lines.push(`testforge_requests_total${labelsStr} ${latest.value}`);
    }
    lines.push('');

    // Add gauges
    lines.push('# HELP testforge_active_jobs Number of currently running jobs');
    lines.push('# TYPE testforge_active_jobs gauge');
    for (const [key, value] of this.gauges.entries()) {
      const labelsStr = this.formatLabels(value.labels || {});
      lines.push(`testforge_active_jobs${labelsStr} ${value.value}`);
    }
    lines.push('');

    // Add histograms
    lines.push('# HELP testforge_request_duration_seconds Request duration in seconds');
    lines.push('# TYPE testforge_request_duration_seconds histogram');
    for (const [key, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const sorted = [...values].sort((a, b) => a - b);
      
      // Calculate percentiles
      const p50 = sorted[Math.floor(count * 0.5)] || 0;
      const p95 = sorted[Math.floor(count * 0.95)] || 0;
      const p99 = sorted[Math.floor(count * 0.99)] || 0;
      
      const labelsStr = this.formatLabels({});
      lines.push(`testforge_request_duration_seconds_sum${labelsStr} ${sum}`);
      lines.push(`testforge_request_duration_seconds_count${labelsStr} ${count}`);
      lines.push(`testforge_request_duration_seconds_bucket{le="0.05"} ${count}`);
      lines.push(`testforge_request_duration_seconds_bucket{le="0.1"} ${count}`);
      lines.push(`testforge_request_duration_seconds_bucket{le="0.5"} ${count}`);
      lines.push(`testforge_request_duration_seconds_bucket{le="1"} ${count}`);
      lines.push(`testforge_request_duration_seconds_bucket{le="+Inf"} ${count}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

export default metrics;