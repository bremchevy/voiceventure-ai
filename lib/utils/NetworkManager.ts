interface NetworkInfo {
  isOnline: boolean;
  isWifi: boolean;
  downlink: number;
  rtt: number;
  effectiveType: string;
  saveData: boolean;
}

export class NetworkManager {
  private connection: any;

  constructor() {
    this.connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;
  }

  public async getNetworkInfo(): Promise<NetworkInfo> {
    const online = navigator.onLine;
    
    if (!online) {
      return {
        isOnline: false,
        isWifi: false,
        downlink: 0,
        rtt: Infinity,
        effectiveType: 'none',
        saveData: true
      };
    }

    if (!this.connection) {
      // Fallback when Network Information API is not available
      return {
        isOnline: true,
        isWifi: true, // Optimistic assumption
        downlink: Infinity,
        rtt: 0,
        effectiveType: '4g', // Optimistic assumption
        saveData: false
      };
    }

    return {
      isOnline: true,
      isWifi: this.connection.type === 'wifi',
      downlink: this.connection.downlink || Infinity,
      rtt: this.connection.rtt || 0,
      effectiveType: this.connection.effectiveType || '4g',
      saveData: this.connection.saveData || false
    };
  }

  public addNetworkChangeListener(callback: (info: NetworkInfo) => void): () => void {
    const handleChange = () => {
      this.getNetworkInfo().then(callback);
    };

    window.addEventListener('online', handleChange);
    window.addEventListener('offline', handleChange);

    if (this.connection) {
      this.connection.addEventListener('change', handleChange);
    }

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleChange);
      window.removeEventListener('offline', handleChange);
      if (this.connection) {
        this.connection.removeEventListener('change', handleChange);
      }
    };
  }

  public async waitForNetwork(requirements?: {
    minDownlink?: number;
    maxRtt?: number;
    requireWifi?: boolean;
  }): Promise<void> {
    return new Promise((resolve) => {
      const check = async () => {
        const info = await this.getNetworkInfo();
        
        if (!info.isOnline) return false;
        
        if (requirements?.requireWifi && !info.isWifi) return false;
        
        if (requirements?.minDownlink && info.downlink < requirements.minDownlink) {
          return false;
        }
        
        if (requirements?.maxRtt && info.rtt > requirements.maxRtt) {
          return false;
        }
        
        return true;
      };

      const cleanup = this.addNetworkChangeListener(async (info) => {
        if (await check()) {
          cleanup();
          resolve();
        }
      });

      // Also check immediately
      check().then((result) => {
        if (result) {
          cleanup();
          resolve();
        }
      });
    });
  }
} 