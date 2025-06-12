import React from 'react';
import { AudioMetrics, PerformanceMetrics } from '../lib/services/PerformanceMonitoringService';

interface AudioQualityIndicatorProps {
  audioMetrics: AudioMetrics;
  performanceMetrics: PerformanceMetrics;
  qualityScore: number;
  warnings: string[];
}

export const AudioQualityIndicator: React.FC<AudioQualityIndicatorProps> = ({
  audioMetrics,
  performanceMetrics,
  qualityScore,
  warnings
}) => {
  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatMetric = (value: number, unit: string = ''): string => {
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      {/* Overall Quality Score */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Audio Quality Score</h3>
        <div className="flex items-center">
          <div className={`w-16 h-16 rounded-full ${getQualityColor(qualityScore)} flex items-center justify-center text-white text-xl font-bold`}>
            {Math.round(qualityScore * 100)}
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Overall Quality</p>
          </div>
        </div>
      </div>

      {/* Audio Metrics */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Audio Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Signal-to-Noise Ratio</p>
            <p className="font-medium">{formatMetric(audioMetrics.snr, ' dB')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Clarity</p>
            <p className="font-medium">{formatMetric(audioMetrics.clarity * 100, '%')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Volume</p>
            <p className="font-medium">{formatMetric(audioMetrics.volume, ' dB')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Background Noise</p>
            <p className="font-medium">{formatMetric(audioMetrics.backgroundNoise, ' dB')}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Processing Time</p>
            <p className="font-medium">{formatMetric(performanceMetrics.processingTime, ' ms')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Memory Usage</p>
            <p className="font-medium">{formatMetric(performanceMetrics.memoryUsage, ' MB')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">CPU Usage</p>
            <p className="font-medium">{formatMetric(performanceMetrics.cpuUtilization * 100, '%')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Battery Impact</p>
            <p className="font-medium">{formatMetric(performanceMetrics.batteryImpact * 100, '%')}</p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-yellow-600">Warnings</h3>
          <ul className="list-disc list-inside">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}; 