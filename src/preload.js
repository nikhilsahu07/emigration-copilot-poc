const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script running...');

contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: () => ipcRenderer.invoke('start-automation'),
  approveSubmit: () => ipcRenderer.invoke('approve-submit'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
});

console.log('✅ electronAPI exposed to renderer');
