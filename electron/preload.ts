import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadDatabase: () => ipcRenderer.invoke('db:load'),
  saveDatabase: (db: unknown) => ipcRenderer.invoke('db:save', db),
  createBackupSnapshot: (db: unknown) => ipcRenderer.invoke('db:createBackupSnapshot', db),
  getStorageInfo: () => ipcRenderer.invoke('db:getStorageInfo'),
  openBackupFolder: () => ipcRenderer.invoke('shell:openBackupFolder'),
  openAppDataFolder: () => ipcRenderer.invoke('shell:openAppDataFolder'),
  saveFileDialog: (options: {
    defaultFileName: string;
    filters: { name: string; extensions: string[] }[];
    dataBase64?: string;
    textContent?: string;
  }) => ipcRenderer.invoke('dialog:saveFile', options),
  openFileDialog: (options: { filters: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options),
  searchOnlineLogos: (query: string) => ipcRenderer.invoke('logo:searchOnline', query),
  fetchAndCacheLogoUrl: (imageUrl: string) => ipcRenderer.invoke('logo:fetchAndCacheUrl', imageUrl),
  pickLocalLogoFile: () => ipcRenderer.invoke('logo:pickLocalFile'),
  getAppVersion: () => ipcRenderer.invoke('updater:getAppVersion'),
  checkForUpdates: (customRepo?: string) => ipcRenderer.invoke('updater:check', customRepo),
  downloadAndInstallUpdate: (options: {
    downloadUrl: string;
    assetName: string;
    latestVersion?: string;
  }) => ipcRenderer.invoke('updater:downloadAndInstall', options),
});
