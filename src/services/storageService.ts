import { DatabaseSchema, OnlineLogoSearchResult, StorageInfo } from '../types';
import { DEFAULT_DATABASE } from '../data/seedData';

declare global {
  interface Window {
    electronAPI?: {
      loadDatabase: () => Promise<DatabaseSchema>;
      saveDatabase: (db: DatabaseSchema) => Promise<DatabaseSchema>;
      createBackupSnapshot: (db: DatabaseSchema) => Promise<DatabaseSchema>;
      getStorageInfo: () => Promise<StorageInfo>;
      openBackupFolder: () => Promise<boolean>;
      openAppDataFolder: () => Promise<boolean>;
      saveFileDialog: (options: {
        defaultFileName: string;
        filters: { name: string; extensions: string[] }[];
        dataBase64?: string;
        textContent?: string;
      }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
      openFileDialog: (options: {
        filters: { name: string; extensions: string[] }[];
      }) => Promise<{
        success: boolean;
        canceled?: boolean;
        filePath?: string;
        fileName?: string;
        dataBase64?: string;
        error?: string;
      }>;
      searchOnlineLogos: (query: string) => Promise<OnlineLogoSearchResult[]>;
      fetchAndCacheLogoUrl: (
        imageUrl: string
      ) => Promise<{ success: boolean; dataUrl: string | null }>;
      pickLocalLogoFile: () => Promise<{
        success: boolean;
        canceled?: boolean;
        dataUrl?: string;
        error?: string;
      }>;
      getAppVersion: () => Promise<string>;
      checkForUpdates: (customRepo?: string) => Promise<{
        checked: boolean;
        updateAvailable: boolean;
        currentVersion: string;
        latestVersion?: string;
        releaseNotes?: string;
        htmlUrl?: string;
        downloadUrl?: string | null;
        assetName?: string;
        message?: string;
        error?: string;
      }>;
      downloadAndInstallUpdate: (options: {
        downloadUrl: string;
        assetName: string;
        latestVersion?: string;
      }) => Promise<{ success: boolean; targetPath?: string; error?: string }>;
    };
  }
}

const LOCAL_STORAGE_KEY = 'almanacco_calcio_db_v1';

export async function loadDatabase(): Promise<DatabaseSchema> {
  if (window.electronAPI) {
    try {
      const db = await window.electronAPI.loadDatabase();
      return normalizeDatabase(db);
    } catch (err) {
      console.error('Electron loadDatabase failed, using fallback:', err);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return normalizeDatabase(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('localStorage load failed:', err);
  }

  return normalizeDatabase(DEFAULT_DATABASE);
}

export async function saveDatabase(
  db: DatabaseSchema,
  createSnapshot = false
): Promise<DatabaseSchema> {
  const updated: DatabaseSchema = {
    ...db,
    lastSavedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota error in browser mode
  }

  if (window.electronAPI) {
    try {
      if (createSnapshot) {
        return await window.electronAPI.createBackupSnapshot(updated);
      }
      return await window.electronAPI.saveDatabase(updated);
    } catch (err) {
      console.error('Electron saveDatabase failed:', err);
    }
  }

  return updated;
}

export async function getStorageInfo(currentDb: DatabaseSchema): Promise<StorageInfo> {
  if (window.electronAPI) {
    try {
      return await window.electronAPI.getStorageInfo();
    } catch {
      // fallback below
    }
  }
  return {
    dbPath: '%APPDATA%\\Almanacco Calcio\\data\\database.json',
    backupDirPath: '%APPDATA%\\Almanacco Calcio\\backups',
    documentsMirrorPath: 'Documenti\\Almanacco Calcio Backups\\ultimo_salvataggio.json',
    lastSavedAt: currentDb.lastSavedAt,
    totalMatches: currentDb.matches.length,
    totalTeams: currentDb.teams.length,
    totalCompetitions: currentDb.competitions.length,
    backupCount: 1,
  };
}

export async function openBackupFolder(): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.openBackupFolder();
  }
}

export async function openAppDataFolder(): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.openAppDataFolder();
  }
}

export async function searchLogosOnline(query: string): Promise<OnlineLogoSearchResult[]> {
  if (!query.trim()) return [];
  if (window.electronAPI) {
    try {
      return await window.electronAPI.searchOnlineLogos(query);
    } catch (err) {
      console.warn('Electron searchOnlineLogos error:', err);
    }
  }

  // Browser fallback using TheSportsDB & Wikipedia CORS APIs
  const results: OnlineLogoSearchResult[] = [];
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`
    );
    if (res.ok) {
      const data = await res.json();
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      for (const t of teams) {
        if (t.strSport && t.strSport !== 'Soccer') continue;
        const badge = t.strBadge || t.strTeamBadge || t.strLogo;
        if (badge) {
          results.push({
            id: `tsdb-${t.idTeam}`,
            name: t.strTeam,
            subtitle: `${t.strLeague || 'Calcio'} • ${t.strCountry || ''}`,
            imageUrl: badge,
            dataUrl: badge,
            primaryColor: t.strColour1 || undefined,
            secondaryColor: t.strColour2 || undefined,
            source: 'TheSportsDB',
          });
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const wikiUrl = `https://it.wikipedia.org/w/api.php?origin=*&action=query&generator=search&gsrsearch=${encodeURIComponent(
      query + ' calcio'
    )}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=250&format=json`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const json = await res.json();
      const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
      for (const p of pages as any[]) {
        if (p?.thumbnail?.source) {
          results.push({
            id: `wiki-${p.pageid}`,
            name: p.title,
            subtitle: 'Wikipedia Italia',
            imageUrl: p.thumbnail.source,
            dataUrl: p.thumbnail.source,
            source: 'Wikipedia',
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return results;
}

export async function fetchAndCacheLogoUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl.trim()) return null;
  if (imageUrl.startsWith('data:image/')) return imageUrl;

  if (window.electronAPI) {
    try {
      const res = await window.electronAPI.fetchAndCacheLogoUrl(imageUrl);
      if (res.success && res.dataUrl) return res.dataUrl;
    } catch {
      // fallback
    }
  }
  return imageUrl;
}

export async function pickLocalLogoFile(): Promise<string | null> {
  if (window.electronAPI) {
    const res = await window.electronAPI.pickLocalLogoFile();
    if (res.success && res.dataUrl) return res.dataUrl;
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function checkForAppUpdates(customRepo?: string) {
  if (window.electronAPI?.checkForUpdates) {
    return await window.electronAPI.checkForUpdates(customRepo);
  }
  return {
    checked: false,
    updateAvailable: false,
    currentVersion: '1.0.0',
    error: 'Controllo aggiornamenti disponibile nell’app desktop Windows.',
  };
}

export async function installAppUpdate(options: {
  downloadUrl: string;
  assetName: string;
  latestVersion?: string;
}) {
  if (window.electronAPI?.downloadAndInstallUpdate) {
    return await window.electronAPI.downloadAndInstallUpdate(options);
  }
  return { success: false, error: 'Non disponibile in modalità browser.' };
}

function normalizeDatabase(raw: any): DatabaseSchema {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_DATABASE;
  }
  return {
    version: raw.version || 1,
    lastSavedAt: raw.lastSavedAt || new Date().toISOString(),
    settings: {
      ...DEFAULT_DATABASE.settings,
      ...(raw.settings || {}),
    },
    competitions: Array.isArray(raw.competitions)
      ? raw.competitions
      : DEFAULT_DATABASE.competitions,
    teams: Array.isArray(raw.teams) ? raw.teams : DEFAULT_DATABASE.teams,
    matches: Array.isArray(raw.matches) ? raw.matches : DEFAULT_DATABASE.matches,
  };
}
