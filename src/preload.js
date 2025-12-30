const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: () => ipcRenderer.invoke('start-automation'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  approveAndFill: (mapping) => ipcRenderer.invoke('approve-and-fill', mapping),
  finalSubmit: () => ipcRenderer.invoke('final-submit'),
  editField: (data) => ipcRenderer.invoke('edit-field', data),

  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },

  onFormPreview: (callback) => {
    ipcRenderer.on('form-preview', (event, data) => callback(data));
  },
});
