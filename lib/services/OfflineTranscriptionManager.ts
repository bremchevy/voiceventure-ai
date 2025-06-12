import { WhisperService } from './WhisperService';
import { OfflineStorageService } from './OfflineStorageService';
import { NetworkManager } from '../utils/NetworkManager';

interface TranscriptionQueueConfig {
  maxRetries: number;
  retryDelay: number;
  maxConcurrent: number;
  networkRequirements: {
    minDownlink?: number;
    maxLatency?: number;
    requireWifi?: boolean;
  };
}

export class OfflineTranscriptionManager {
  private storage: OfflineStorageService;
  private whisperService: WhisperService;
  private networkManager: NetworkManager;
  private isProcessing: boolean = false;
  private activeJobs: number = 0;
  private config: TranscriptionQueueConfig;

  constructor(
    storage: OfflineStorageService,
    whisperService: WhisperService,
    config?: Partial<TranscriptionQueueConfig>
  ) {
    this.storage = storage;
    this.whisperService = whisperService;
    this.networkManager = new NetworkManager();
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      maxConcurrent: 2,
      networkRequirements: {
        minDownlink: 1, // 1 Mbps
        maxLatency: 1000, // 1 second
        requireWifi: false
      },
      ...config
    };
  }

  public async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processQueue();
  }

  public async stopProcessing(): Promise<void> {
    this.isProcessing = false;
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Check network conditions
        if (!await this.checkNetworkConditions()) {
          await this.delay(this.config.retryDelay);
          continue;
        }

        // Get next item if we're not at max concurrent jobs
        if (this.activeJobs >= this.config.maxConcurrent) {
          await this.delay(1000);
          continue;
        }

        const queueItem = await this.storage.getNextQueuedItem();
        if (!queueItem) {
          await this.delay(5000); // Wait longer if queue is empty
          continue;
        }

        this.activeJobs++;
        this.processQueueItem(queueItem.recordingId, queueItem.type)
          .finally(() => this.activeJobs--);

      } catch (error) {
        console.error('Error processing queue:', error);
        await this.delay(this.config.retryDelay);
      }
    }
  }

  private async processQueueItem(recordingId: string, type: 'transcription' | 'translation'): Promise<void> {
    try {
      const recording = await this.storage.getRecording(recordingId);
      if (!recording) {
        await this.storage.removeFromQueue(recordingId);
        return;
      }

      const result = type === 'transcription'
        ? await this.whisperService.transcribe(recording.blob)
        : await this.whisperService.translate(recording.blob);

      await this.storage.updateRecording(recordingId, {
        [type]: result,
        transcriptionQueued: false
      });

      await this.storage.removeFromQueue(recordingId);

    } catch (error) {
      const queueItem = await this.storage.getNextQueuedItem();
      if (!queueItem) return;

      if (queueItem.attempts >= this.config.maxRetries) {
        await this.storage.removeFromQueue(recordingId);
        await this.storage.updateRecording(recordingId, {
          transcriptionQueued: false,
          metadata: {
            ...recording?.metadata,
            transcriptionError: error.message
          }
        });
      } else {
        await this.storage.updateQueueItem(recordingId, {
          attempts: queueItem.attempts + 1,
          lastAttempt: Date.now()
        });
      }
    }
  }

  private async checkNetworkConditions(): Promise<boolean> {
    const network = await this.networkManager.getNetworkInfo();
    const { networkRequirements } = this.config;

    if (networkRequirements.requireWifi && !network.isWifi) {
      return false;
    }

    if (networkRequirements.minDownlink && network.downlink < networkRequirements.minDownlink) {
      return false;
    }

    if (networkRequirements.maxLatency && network.rtt > networkRequirements.maxLatency) {
      return false;
    }

    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getQueueStatus(): {
    isProcessing: boolean;
    activeJobs: number;
  } {
    return {
      isProcessing: this.isProcessing,
      activeJobs: this.activeJobs
    };
  }
} 