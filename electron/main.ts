import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { INITIAL_DB_SEED } from './defaultSeed';

const DEFAULT_GITHUB_REPO = 'christiancomiato/almanacco-calcio';

function isNewerSemver(currentVer: string, latestVer: string): boolean {
  const clean = (v: string) =>
    v
      .replace(/^v/i, '')
      .trim()
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const [c1 = 0, c2 = 0, c3 = 0] = clean(currentVer);
  const [l1 = 0, l2 = 0, l3 = 0] = clean(latestVer);
  if (l1 !== c1) return l1 > c1;
  if (l2 !== c2) return l2 > c2;
  return l3 > c3;
}

let mainWindow: BrowserWindow | null = null;

function getDataPaths() {
  const userDataDir = app.getPath('userData');
  const dataDir = path.join(userDataDir, 'data');
  const backupDir = path.join(userDataDir, 'backups');
  const dbPath = path.join(dataDir, 'database.json');
  const tmpDbPath = path.join(dataDir, 'database.tmp.json');

  let documentsMirrorDir = path.join(userDataDir, 'mirror');
  try {
    const docs = app.getPath('documents');
    documentsMirrorDir = path.join(docs, 'Almanacco Calcio Backups');
  } catch {
    // Fallback if documents path is unavailable
  }
  const documentsMirrorPath = path.join(documentsMirrorDir, 'ultimo_salvataggio.json');

  return {
    userDataDir,
    dataDir,
    backupDir,
    dbPath,
    tmpDbPath,
    documentsMirrorDir,
    documentsMirrorPath,
  };
}

function ensureDirectories() {
  const paths = getDataPaths();
  for (const dir of [paths.dataDir, paths.backupDir, paths.documentsMirrorDir]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create directory:', dir, err);
    }
  }
}

function atomicWriteJson(targetPath: string, tmpPath: string, data: unknown) {
  const serialized = JSON.stringify(data, null, 2);
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, serialized, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, targetPath);
}

function createDailyBackupSnapshot(data: unknown) {
  const paths = getDataPaths();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const snapshotPath = path.join(paths.backupDir, `backup-${today}.json`);
    const snapshotTmp = path.join(paths.backupDir, `backup-${today}.tmp.json`);
    atomicWriteJson(snapshotPath, snapshotTmp, data);

    // Keep last 30 rolling backups
    const files = fs
      .readdirSync(paths.backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json') && !f.endsWith('.tmp.json'))
      .sort()
      .reverse();

    if (files.length > 30) {
      for (const oldFile of files.slice(30)) {
        try {
          fs.unlinkSync(path.join(paths.backupDir, oldFile));
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error('Failed to write daily snapshot:', err);
  }
}

function saveDatabaseToDisk(db: any, createSnapshot = false) {
  ensureDirectories();
  const paths = getDataPaths();
  const payload = {
    ...db,
    lastSavedAt: new Date().toISOString(),
  };

  // 1. Atomic write to primary AppData database
  atomicWriteJson(paths.dbPath, paths.tmpDbPath, payload);

  // 2. Write mirror copy to Documents\Almanacco Calcio Backups
  try {
    const mirrorTmp = path.join(paths.documentsMirrorDir, 'ultimo_salvataggio.tmp.json');
    atomicWriteJson(paths.documentsMirrorPath, mirrorTmp, payload);
  } catch (err) {
    console.warn('Could not write mirror backup to Documents:', err);
  }

  // 3. Optional rolling snapshot
  if (createSnapshot) {
    createDailyBackupSnapshot(payload);
  }

  return payload;
}

function tryReadValidDatabase(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.matches) &&
      Array.isArray(parsed.teams) &&
      Array.isArray(parsed.competitions)
    ) {
      return parsed;
    }
  } catch (err) {
    console.warn('Invalid or corrupted database file at:', filePath, err);
  }
  return null;
}

function loadDatabaseFromDisk(): any {
  ensureDirectories();
  const paths = getDataPaths();

  // 1. Try primary database
  const primary = tryReadValidDatabase(paths.dbPath);
  if (primary) {
    createDailyBackupSnapshot(primary);
    return primary;
  }

  // 2. Try temporary file or Documents mirror
  const mirror = tryReadValidDatabase(paths.documentsMirrorPath);
  if (mirror) {
    saveDatabaseToDisk(mirror, true);
    return mirror;
  }

  // 3. Try rolling backups (newest first)
  try {
    const backups = fs
      .readdirSync(paths.backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const file of backups) {
      const candidate = tryReadValidDatabase(path.join(paths.backupDir, file));
      if (candidate) {
        saveDatabaseToDisk(candidate, false);
        return candidate;
      }
    }
  } catch {
    // ignore
  }

  // 4. Initialize with default seed
  const seeded = saveDatabaseToDisk(INITIAL_DB_SEED, true);
  return seeded;
}

// Helper to fetch an image URL and convert to Base64 data URL
async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AlmanaccoCalcioDesktop/1.0 (Windows; Football Stats Tracker)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 64) return null;
    const mime = contentType.split(';')[0].trim();
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('Failed to fetch image URL:', imageUrl, err);
    return null;
  }
}

// Curated Wikipedia page titles for Italian/European teams & competitions for ultra-accurate logo lookup
const WIKI_FOOTBALL_MAPPING: Record<string, string[]> = {
  inter: ['FC Internazionale Milano', 'Inter Milan'],
  milan: ['AC Milan'],
  juventus: ['Juventus FC', 'Juventus Football Club'],
  napoli: ['SSC Napoli'],
  roma: ['AS Roma'],
  lazio: ['SS Lazio'],
  atalanta: ['Atalanta BC'],
  fiorentina: ['ACF Fiorentina'],
  bologna: ['Bologna FC 1909'],
  torino: ['Torino FC'],
  udinese: ['Udinese Calcio'],
  genoa: ['Genoa CFC'],
  parma: ['Parma Calcio 1913'],
  como: ['Como 1907'],
  cagliari: ['Cagliari Calcio'],
  'hellas verona': ['Hellas Verona FC'],
  verona: ['Hellas Verona FC'],
  lecce: ['US Lecce'],
  empoli: ['Empoli FC'],
  venezia: ['Venezia FC'],
  monza: ['AC Monza'],
  sampdoria: ['UC Sampdoria'],
  palermo: ['Palermo FC'],
  bari: ['SSC Bari'],
  brescia: ['Brescia Calcio'],
  cremonese: ['US Cremonese'],
  sassuolo: ['US Sassuolo Calcio'],
  salernitana: ['US Salernitana 1919'],
  spezia: ['Spezia Calcio'],
  pisac: ['Pisa SC'],
  pisa: ['Pisa SC'],
  catanzaro: ['US Catanzaro 1929'],
  cesena: ['Cesena FC'],
  modena: ['Modena FC'],
  frosinone: ['Frosinone Calcio'],
  'real madrid': ['Real Madrid CF'],
  barcellona: ['FC Barcelona'],
  barcelona: ['FC Barcelona'],
  'manchester city': ['Manchester City F.C.'],
  liverpool: ['Liverpool F.C.'],
  arsenal: ['Arsenal F.C.'],
  chelsea: ['Chelsea F.C.'],
  'manchester united': ['Manchester United F.C.'],
  'bayern monaco': ['FC Bayern Munich'],
  'bayern munich': ['FC Bayern Munich'],
  psg: ['Paris Saint-Germain F.C.'],
  italia: ['Italy national football team', 'Federazione Italiana Giuoco Calcio'],
  'serie a': ['Serie A'],
  'serie b': ['Serie B'],
  'coppa italia': ['Coppa Italia'],
  'uefa champions league': ['UEFA Champions League'],
  'champions league': ['UEFA Champions League'],
  'uefa europa league': ['UEFA Europa League'],
  'europa league': ['UEFA Europa League'],
  'premier league': ['Premier League'],
  'la liga': ['La Liga'],
  bundesliga: ['Bundesliga'],
};

async function searchWikipediaLogos(query: string): Promise<any[]> {
  const results: any[] = [];
  const normalized = query.trim().toLowerCase();
  const mappedTitles = WIKI_FOOTBALL_MAPPING[normalized] || [];

  const searchTerms = Array.from(
    new Set([
      ...mappedTitles,
      `${query.trim()} football club`,
      `${query.trim()} calcio`,
      query.trim(),
    ])
  ).slice(0, 4);

  for (const lang of ['en', 'it']) {
    for (const term of searchTerms) {
      try {
        const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          term
        )}&gsrlimit=3&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=320&format=json`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AlmanaccoCalcioDesktop/1.0 (Windows; Football Stats Tracker)',
          },
        });
        clearTimeout(timeout);
        if (!res.ok) continue;
        const json: any = await res.json();
        const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
        for (const page of pages as any[]) {
          const thumb = page?.thumbnail?.source;
          if (thumb && !results.some((r) => r.imageUrl === thumb)) {
            results.push({
              id: `wiki-${lang}-${page.pageid}`,
              name: page.title,
              subtitle:
                page?.terms?.description?.[0] ||
                (lang === 'it' ? 'Wikipedia Italia' : 'Wikipedia Internacional'),
              imageUrl: thumb,
              source: 'Wikipedia',
            });
          }
        }
        if (results.length >= 6) break;
      } catch {
        // continue
      }
    }
    if (results.length >= 6) break;
  }

  return results;
}

async function searchSportsDbLogos(query: string): Promise<any[]> {
  const results: any[] = [];
  const normalized = query.trim().toLowerCase();

  // Map Italian names to English for TheSportsDB if needed
  const englishAliases: Record<string, string> = {
    'bayern monaco': 'Bayern Munich',
    barcellona: 'Barcelona',
    italia: 'Italy',
    'hellas verona': 'Verona',
  };
  const searchQuery = englishAliases[normalized] || query.trim();

  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
      searchQuery
    )}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AlmanaccoCalcioDesktop/1.0',
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data: any = await res.json();
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      for (const t of teams) {
        if (t.strSport && t.strSport !== 'Soccer') continue;
        const badge = t.strBadge || t.strTeamBadge || t.strLogo;
        if (badge) {
          results.push({
            id: `tsdb-team-${t.idTeam}`,
            name: t.strTeam,
            subtitle: `${t.strLeague || 'Calcio'} • ${t.strCountry || ''}`.trim(),
            imageUrl: badge,
            primaryColor: t.strColour1 || undefined,
            secondaryColor: t.strColour2 || undefined,
            source: 'TheSportsDB',
          });
        }
      }
    }
  } catch {
    // ignore network error
  }
  return results;
}

function registerIpcHandlers() {
  ipcMain.handle('db:load', async () => {
    return loadDatabaseFromDisk();
  });

  ipcMain.handle('db:save', async (_event, db: any) => {
    return saveDatabaseToDisk(db, false);
  });

  ipcMain.handle('db:createBackupSnapshot', async (_event, db: any) => {
    return saveDatabaseToDisk(db, true);
  });

  ipcMain.handle('db:getStorageInfo', async () => {
    ensureDirectories();
    const paths = getDataPaths();
    const db = loadDatabaseFromDisk();
    let backupCount = 0;
    try {
      backupCount = fs
        .readdirSync(paths.backupDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json')).length;
    } catch {
      // ignore
    }
    return {
      dbPath: paths.dbPath,
      backupDirPath: paths.backupDir,
      documentsMirrorPath: paths.documentsMirrorPath,
      lastSavedAt: db.lastSavedAt || new Date().toISOString(),
      totalMatches: db.matches?.length || 0,
      totalTeams: db.teams?.length || 0,
      totalCompetitions: db.competitions?.length || 0,
      backupCount,
    };
  });

  ipcMain.handle('shell:openBackupFolder', async () => {
    ensureDirectories();
    const paths = getDataPaths();
    await shell.openPath(paths.documentsMirrorDir);
    return true;
  });

  ipcMain.handle('shell:openAppDataFolder', async () => {
    ensureDirectories();
    const paths = getDataPaths();
    await shell.openPath(paths.dataDir);
    return true;
  });

  ipcMain.handle(
    'dialog:saveFile',
    async (
      _event,
      options: {
        defaultFileName: string;
        filters: { name: string; extensions: string[] }[];
        dataBase64?: string;
        textContent?: string;
      }
    ) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Esporta Dati Almanacco Calcio',
        defaultPath: path.join(app.getPath('documents'), options.defaultFileName),
        filters: options.filters,
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      try {
        if (options.dataBase64) {
          const buf = Buffer.from(options.dataBase64, 'base64');
          fs.writeFileSync(result.filePath, buf);
        } else if (typeof options.textContent === 'string') {
          fs.writeFileSync(result.filePath, options.textContent, 'utf-8');
        }
        return { success: true, filePath: result.filePath };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore di scrittura file' };
      }
    }
  );

  ipcMain.handle(
    'dialog:openFile',
    async (_event, options: { filters: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Importa File o Backup',
        properties: ['openFile'],
        filters: options.filters,
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      try {
        const buf = fs.readFileSync(filePath);
        return {
          success: true,
          filePath,
          fileName: path.basename(filePath),
          dataBase64: buf.toString('base64'),
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Impossibile leggere il file selezionato' };
      }
    }
  );

  ipcMain.handle('logo:searchOnline', async (_event, query: string) => {
    if (!query || !query.trim()) return [];
    const [tsdbResults, wikiResults] = await Promise.all([
      searchSportsDbLogos(query),
      searchWikipediaLogos(query),
    ]);
    const combined = [...tsdbResults, ...wikiResults].slice(0, 8);

    // Pre-convert thumbnails to dataUrls so they render reliably without hotlink issues
    const enriched = await Promise.all(
      combined.map(async (item) => {
        const dataUrl = await fetchImageAsDataUrl(item.imageUrl);
        return {
          ...item,
          dataUrl: dataUrl || item.imageUrl,
        };
      })
    );
    return enriched;
  });

  ipcMain.handle('logo:fetchAndCacheUrl', async (_event, imageUrl: string) => {
    const dataUrl = await fetchImageAsDataUrl(imageUrl);
    return {
      success: Boolean(dataUrl),
      dataUrl: dataUrl || null,
    };
  });

  ipcMain.handle('logo:pickLocalFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Seleziona Immagine Stemma / Logo',
      properties: ['openFile'],
      filters: [
        { name: 'Immagini (PNG, JPG, SVG, WEBP)', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const filePath = result.filePaths[0];
    try {
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        svg: 'image/svg+xml',
        webp: 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/png';
      const buf = fs.readFileSync(filePath);
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      return { success: true, dataUrl };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('updater:getAppVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('updater:check', async (_event, customRepo?: string) => {
    const repo = (customRepo || DEFAULT_GITHUB_REPO).trim();
    const currentVersion = app.getVersion();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AlmanaccoCalcioDesktop/1.0',
          Accept: 'application/vnd.github+json',
        },
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        return {
          checked: true,
          updateAvailable: false,
          currentVersion,
          latestVersion: currentVersion,
          message: 'Nessuna release ancora pubblicata su GitHub.',
        };
      }

      if (!res.ok) {
        return {
          checked: false,
          updateAvailable: false,
          currentVersion,
          error: `Impossibile verificare aggiornamenti (HTTP ${res.status}).`,
        };
      }

      const release: any = await res.json();
      const latestTag = String(release.tag_name || release.name || currentVersion).replace(/^v/i, '');
      const hasUpdate = isNewerSemver(currentVersion, latestTag);

      const assets = Array.isArray(release.assets) ? release.assets : [];
      // Prefer Setup.exe for seamless silent update, fallback to Portable.exe or any .exe
      const exeAsset =
        assets.find((a: any) => /setup\.exe$/i.test(a.name)) ||
        assets.find((a: any) => /portable\.exe$/i.test(a.name)) ||
        assets.find((a: any) => /\.exe$/i.test(a.name));

      return {
        checked: true,
        updateAvailable: hasUpdate,
        currentVersion,
        latestVersion: latestTag,
        releaseNotes: release.body || '',
        htmlUrl: release.html_url || `https://github.com/${repo}/releases`,
        downloadUrl: exeAsset?.browser_download_url || null,
        assetName: exeAsset?.name || 'AlmanaccoCalcio-Update.exe',
      };
    } catch (err: any) {
      return {
        checked: false,
        updateAvailable: false,
        currentVersion,
        error: 'Connessione assente o repository GitHub non raggiungibile.',
      };
    }
  });

  ipcMain.handle(
    'updater:downloadAndInstall',
    async (_event, options: { downloadUrl: string; assetName: string; latestVersion?: string }) => {
      try {
        const res = await fetch(options.downloadUrl, {
          headers: { 'User-Agent': 'AlmanaccoCalcioDesktop/1.0' },
        });
        if (!res.ok) {
          return { success: false, error: `Download fallito (HTTP ${res.status})` };
        }

        const isPortable = /portable/i.test(options.assetName);
        const targetDir = isPortable ? app.getPath('desktop') : app.getPath('temp');
        const targetFileName = isPortable
          ? `AlmanaccoCalcio-Portable.exe`
          : options.assetName || `AlmanaccoCalcio-Setup-${Date.now()}.exe`;
        const targetPath = path.join(targetDir, targetFileName);

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(targetPath, buffer);

        // Launch the new installer or updated portable executable detached and close current instance
        const child = spawn(targetPath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        setTimeout(() => {
          app.quit();
        }, 600);

        return { success: true, targetPath };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Errore durante il download dell’aggiornamento.',
        };
      }
    }
  );
}

function createWindow() {
  const icoPath = path.join(__dirname, '../dist/app-icon.ico');
  const jpgPath = path.join(__dirname, '../dist/app-icon.jpg');
  const resolvedIconPath = fs.existsSync(icoPath)
    ? icoPath
    : fs.existsSync(jpgPath)
    ? jpgPath
    : undefined;
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: 'Almanacco Sportivo — Registro Partite, Campionati & Statistiche',
    icon: resolvedIconPath,
    backgroundColor: '#0B111E',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureDirectories();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
