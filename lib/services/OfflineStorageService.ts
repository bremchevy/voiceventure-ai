import { TranscriptionResult, TranslationResult } from './WhisperService';

interface StoredRecording {
  id: string;
  blob: Blob;
  format: string;
  timestamp: number;
  duration: number;
  transcriptionQueued?: boolean;
  transcription?: TranscriptionResult;
  translation?: TranslationResult;
  metadata?: Record<string, any>;
}

interface TranscriptionQueueItem {
  recordingId: string;
  type: 'transcription' | 'translation';
  attempts: number;
  lastAttempt?: number;
}

export class OfflineStorageService {
  private readonly DB_NAME = 'voiceventure_offline';
  private readonly RECORDINGS_STORE = 'recordings';
  private readonly QUEUE_STORE = 'transcription_queue';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create recordings store
        if (!db.objectStoreNames.contains(this.RECORDINGS_STORE)) {
          const recordingsStore = db.createObjectStore(this.RECORDINGS_STORE, { keyPath: 'id' });
          recordingsStore.createIndex('timestamp', 'timestamp');
          recordingsStore.createIndex('transcriptionQueued', 'transcriptionQueued');
        }

        // Create queue store
        if (!db.objectStoreNames.contains(this.QUEUE_STORE)) {
          const queueStore = db.createObjectStore(this.QUEUE_STORE, { keyPath: 'recordingId' });
          queueStore.createIndex('attempts', 'attempts');
          queueStore.createIndex('lastAttempt', 'lastAttempt');
        }
      };
    });
  }

  public async storeRecording(recording: StoredRecording): Promise<string> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.RECORDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(this.RECORDINGS_STORE);
      const request = store.add(recording);

      request.onsuccess = () => resolve(recording.id);
      request.onerror = () => reject(request.error);
    });
  }

  public async getRecording(id: string): Promise<StoredRecording | null> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.RECORDINGS_STORE], 'readonly');
      const store = transaction.objectStore(this.RECORDINGS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateRecording(id: string, updates: Partial<StoredRecording>): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.RECORDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(this.RECORDINGS_STORE);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const recording = { ...getRequest.result, ...updates };
        const updateRequest = store.put(recording);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  public async queueForTranscription(recordingId: string, type: 'transcription' | 'translation'): Promise<void> {
    if (!this.db) await this.initializeDB();

    const queueItem: TranscriptionQueueItem = {
      recordingId,
      type,
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(this.QUEUE_STORE);
      const request = store.add(queueItem);

      request.onsuccess = () => {
        this.updateRecording(recordingId, { transcriptionQueued: true })
          .then(() => resolve())
          .catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getNextQueuedItem(): Promise<TranscriptionQueueItem | null> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(this.QUEUE_STORE);
      const index = store.index('attempts');
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async removeFromQueue(recordingId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(this.QUEUE_STORE);
      const request = store.delete(recordingId);

      request.onsuccess = () => {
        this.updateRecording(recordingId, { transcriptionQueued: false })
          .then(() => resolve())
          .catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async updateQueueItem(recordingId: string, updates: Partial<TranscriptionQueueItem>): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(this.QUEUE_STORE);
      
      const getRequest = store.get(recordingId);
      getRequest.onsuccess = () => {
        const item = { ...getRequest.result, ...updates };
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
} 