import type {
  BlockedWebsite,
  DailyActivity,
  Settings,
  WebsiteActivity,
  WebsiteTimer,
} from "@/types";

const DB_NAME = "ClarityDB";
const DB_VERSION = 1;

// Store names
export const STORES = {
  DAILY_ACTIVITY: "dailyActivity",
  WEBSITE_ACTIVITY: "websiteActivity",
  WEBSITE_TIMERS: "websiteTimers",
  BLOCKED_WEBSITES: "blockedWebsites",
  SETTINGS: "settings",
} as const;

class ClarityDatabase {
  private db: IDBDatabase | null = null;

  /**
   * Initialize and open the database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create DailyActivity store
        if (!db.objectStoreNames.contains(STORES.DAILY_ACTIVITY)) {
          const dailyStore = db.createObjectStore(STORES.DAILY_ACTIVITY, {
            keyPath: "id",
            autoIncrement: true,
          });
          dailyStore.createIndex("date", "date", { unique: true });
        }

        // Create WebsiteActivity store
        if (!db.objectStoreNames.contains(STORES.WEBSITE_ACTIVITY)) {
          const websiteStore = db.createObjectStore(STORES.WEBSITE_ACTIVITY, {
            keyPath: "id",
            autoIncrement: true,
          });
          websiteStore.createIndex("date", "date", { unique: false });
          websiteStore.createIndex("domain", "domain", { unique: false });
          websiteStore.createIndex("date_domain", ["date", "domain"], { unique: true });
        }

        // Create WebsiteTimers store
        if (!db.objectStoreNames.contains(STORES.WEBSITE_TIMERS)) {
          const timerStore = db.createObjectStore(STORES.WEBSITE_TIMERS, {
            keyPath: "id",
            autoIncrement: true,
          });
          timerStore.createIndex("domain", "domain", { unique: true });
        }

        // Create BlockedWebsites store
        if (!db.objectStoreNames.contains(STORES.BLOCKED_WEBSITES)) {
          const blockedStore = db.createObjectStore(STORES.BLOCKED_WEBSITES, {
            keyPath: "id",
            autoIncrement: true,
          });
          blockedStore.createIndex("urlPattern", "urlPattern", { unique: true });
        }

        // Create Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }

  /**
   * Get a transaction for the specified store
   */
  private async getTransaction(
    storeName: string,
    mode: IDBTransactionMode = "readonly",
  ): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ==================== DAILY ACTIVITY OPERATIONS ====================

  async getDailyActivity(date: string): Promise<DailyActivity | null> {
    const store = await this.getTransaction(STORES.DAILY_ACTIVITY);
    const index = store.index("date");
    return new Promise((resolve, reject) => {
      const request = index.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDailyActivity(activity: DailyActivity): Promise<void> {
    const store = await this.getTransaction(STORES.DAILY_ACTIVITY, "readwrite");
    const index = store.index("date");

    return new Promise((resolve, reject) => {
      // First check if the record exists
      const getRequest = index.get(activity.date);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const request = existing ? store.put({ ...existing, ...activity }) : store.add(activity);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getDailyActivitiesInRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
    const store = await this.getTransaction(STORES.DAILY_ACTIVITY);
    const index = store.index("date");
    const range = IDBKeyRange.bound(startDate, endDate);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== WEBSITE ACTIVITY OPERATIONS ====================

  async getWebsiteActivity(date: string, domain: string): Promise<WebsiteActivity | null> {
    const store = await this.getTransaction(STORES.WEBSITE_ACTIVITY);
    const index = store.index("date_domain");
    return new Promise((resolve, reject) => {
      const request = index.get([date, domain]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveWebsiteActivity(activity: WebsiteActivity): Promise<void> {
    const store = await this.getTransaction(STORES.WEBSITE_ACTIVITY, "readwrite");
    const index = store.index("date_domain");

    return new Promise((resolve, reject) => {
      // First check if the record exists
      const getRequest = index.get([activity.date, activity.domain]);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const request = existing ? store.put({ ...existing, ...activity }) : store.add(activity);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getWebsiteActivitiesForDate(date: string): Promise<WebsiteActivity[]> {
    const store = await this.getTransaction(STORES.WEBSITE_ACTIVITY);
    const index = store.index("date");

    return new Promise((resolve, reject) => {
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== WEBSITE TIMER OPERATIONS ====================

  async getAllTimers(): Promise<WebsiteTimer[]> {
    const store = await this.getTransaction(STORES.WEBSITE_TIMERS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTimerByDomain(domain: string): Promise<WebsiteTimer | null> {
    const store = await this.getTransaction(STORES.WEBSITE_TIMERS);
    const index = store.index("domain");
    return new Promise((resolve, reject) => {
      const request = index.get(domain);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTimer(timer: WebsiteTimer): Promise<void> {
    const store = await this.getTransaction(STORES.WEBSITE_TIMERS, "readwrite");
    const index = store.index("domain");

    return new Promise((resolve, reject) => {
      // First check if the record exists
      const getRequest = index.get(timer.domain);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const request = existing ? store.put({ ...existing, ...timer }) : store.add(timer);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteTimer(domain: string): Promise<void> {
    const store = await this.getTransaction(STORES.WEBSITE_TIMERS, "readwrite");
    const index = store.index("domain");

    return new Promise((resolve, reject) => {
      // First find the timer by domain
      const getRequest = index.get(domain);

      getRequest.onsuccess = () => {
        const timer = getRequest.result;
        if (!timer?.id) {
          resolve();
          return;
        }

        const deleteRequest = store.delete(timer.id);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== BLOCKED WEBSITES OPERATIONS ====================

  async getAllBlockedWebsites(): Promise<BlockedWebsite[]> {
    const store = await this.getTransaction(STORES.BLOCKED_WEBSITES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addBlockedWebsite(urlPattern: string): Promise<void> {
    const store = await this.getTransaction(STORES.BLOCKED_WEBSITES, "readwrite");
    const blocked: BlockedWebsite = {
      urlPattern,
      dateAdded: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(blocked);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBlockedWebsite(id: number): Promise<void> {
    const store = await this.getTransaction(STORES.BLOCKED_WEBSITES, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SETTINGS OPERATIONS ====================

  async getSettings(): Promise<Settings | null> {
    const store = await this.getTransaction(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result[0] || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: Settings): Promise<void> {
    const store = await this.getTransaction(STORES.SETTINGS, "readwrite");

    return new Promise((resolve, reject) => {
      // First check if settings exist
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const existing = getAllRequest.result[0];
        const request = existing ? store.put({ ...existing, ...settings }) : store.add(settings);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const db = new ClarityDatabase();
