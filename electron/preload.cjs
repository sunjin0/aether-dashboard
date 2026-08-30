const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.platform = 'electron'
  document.documentElement.dataset.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
})

contextBridge.exposeInMainWorld('aetherDesktop', {
  isDesktop: true,
  onThemeChange: (listener) => {
    const handler = (_, theme) => listener(theme)
    ipcRenderer.on('aether:theme-updated', handler)
    return () => ipcRenderer.removeListener('aether:theme-updated', handler)
  },
  saveFile: (fileName, data) => ipcRenderer.invoke('aether:save-file', { fileName, data }),
  openConfigFolder: () => ipcRenderer.invoke('aether:open-config-folder'),
})

ipcRenderer.on('aether:theme-updated', (_, theme) => {
  document.documentElement.dataset.systemTheme = theme
})
