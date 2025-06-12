export interface PerformanceMetrics {
  audioDropouts: number
  processingLatency: number
  batteryDrain: number
  memoryUsage: number
  timestamp: number
}

export interface PerformanceAlert {
  type: 'warning' | 'error'
  message: string
  metrics: Partial<PerformanceMetrics>
  timestamp: number
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private readonly maxMetricsHistory = 100
  private readonly maxAlertsHistory = 50
  private startTime: number = 0
  private lastBatteryLevel: number | null = null
  private lastMemoryUsage: number | null = null
  private dropoutThreshold = 0.1 // 100ms
  private latencyThreshold = 0.2 // 200ms
  private batteryDrainThreshold = 0.01 // 1% per minute
  private memoryUsageThreshold = 0.8 // 80% usage

  constructor() {
    this.startTime = Date.now()
  }

  public recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    const currentMetrics: PerformanceMetrics = {
      audioDropouts: metrics.audioDropouts ?? 0,
      processingLatency: metrics.processingLatency ?? 0,
      batteryDrain: metrics.batteryDrain ?? 0,
      memoryUsage: metrics.memoryUsage ?? 0,
      timestamp: Date.now()
    }

    this.metrics.push(currentMetrics)
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift()
    }

    this.analyzeMetrics(currentMetrics)
  }

  private analyzeMetrics(metrics: PerformanceMetrics): void {
    // Check for audio dropouts
    if (metrics.audioDropouts > this.dropoutThreshold) {
      this.addAlert({
        type: 'warning',
        message: 'Audio dropouts detected',
        metrics: { audioDropouts: metrics.audioDropouts },
        timestamp: Date.now()
      })
    }

    // Check processing latency
    if (metrics.processingLatency > this.latencyThreshold) {
      this.addAlert({
        type: 'warning',
        message: 'High processing latency detected',
        metrics: { processingLatency: metrics.processingLatency },
        timestamp: Date.now()
      })
    }

    // Check battery drain
    if (this.lastBatteryLevel !== null) {
      const batteryDrainRate = (this.lastBatteryLevel - metrics.batteryDrain) / 
        ((metrics.timestamp - this.startTime) / (1000 * 60)) // per minute
      
      if (batteryDrainRate > this.batteryDrainThreshold) {
        this.addAlert({
          type: 'warning',
          message: 'High battery drain detected',
          metrics: { batteryDrain: batteryDrainRate },
          timestamp: Date.now()
        })
      }
    }
    this.lastBatteryLevel = metrics.batteryDrain

    // Check memory usage
    if (metrics.memoryUsage > this.memoryUsageThreshold) {
      this.addAlert({
        type: 'error',
        message: 'High memory usage detected',
        metrics: { memoryUsage: metrics.memoryUsage },
        timestamp: Date.now()
      })
    }
    this.lastMemoryUsage = metrics.memoryUsage
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift()
    }
  }

  public getMetricsSummary(): {
    averageLatency: number
    totalDropouts: number
    averageMemoryUsage: number
    batteryDrainRate: number
  } {
    if (this.metrics.length === 0) {
      return {
        averageLatency: 0,
        totalDropouts: 0,
        averageMemoryUsage: 0,
        batteryDrainRate: 0
      }
    }

    const sum = this.metrics.reduce((acc, metric) => ({
      latency: acc.latency + metric.processingLatency,
      dropouts: acc.dropouts + metric.audioDropouts,
      memory: acc.memory + metric.memoryUsage,
      battery: acc.battery + metric.batteryDrain
    }), { latency: 0, dropouts: 0, memory: 0, battery: 0 })

    const duration = (Date.now() - this.startTime) / (1000 * 60) // minutes
    
    return {
      averageLatency: sum.latency / this.metrics.length,
      totalDropouts: sum.dropouts,
      averageMemoryUsage: sum.memory / this.metrics.length,
      batteryDrainRate: duration > 0 ? sum.battery / duration : 0
    }
  }

  public getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count)
  }

  public reset(): void {
    this.metrics = []
    this.alerts = []
    this.startTime = Date.now()
    this.lastBatteryLevel = null
    this.lastMemoryUsage = null
  }

  public updateThresholds(thresholds: {
    dropout?: number
    latency?: number
    batteryDrain?: number
    memoryUsage?: number
  }): void {
    if (thresholds.dropout !== undefined) this.dropoutThreshold = thresholds.dropout
    if (thresholds.latency !== undefined) this.latencyThreshold = thresholds.latency
    if (thresholds.batteryDrain !== undefined) this.batteryDrainThreshold = thresholds.batteryDrain
    if (thresholds.memoryUsage !== undefined) this.memoryUsageThreshold = thresholds.memoryUsage
  }
} 