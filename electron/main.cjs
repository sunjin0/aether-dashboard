const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell, Tray } = require('electron')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

const DEFAULT_ADMIN_URL = 'http://localhost:8080'
const LOOPBACK_ADDRESS = '127.0.0.1'

let localServer
let tray
let isQuitting = false

function readDesktopConfig() {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeDesktopConfig(updates) {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, `${JSON.stringify({ ...readDesktopConfig(), ...updates }, null, 2)}\n`)
}

function getAdminUrl() {
  const config = readDesktopConfig()
  const value = process.env.AETHER_ADMIN_URL || config.adminUrl || DEFAULT_ADMIN_URL
  try {
    return new URL(value)
  } catch {
    throw new Error(`Invalid Admin URL: ${value}`)
  }
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }[extension] || 'application/octet-stream'
}

function sendStaticFile(response, root, pathname) {
  const decodedPath = decodeURIComponent(pathname)
  const requestedPath = path.resolve(root, `.${decodedPath}`)
  const indexPath = path.join(root, 'index.html')
  const filePath = requestedPath.startsWith(root) && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
    ? requestedPath
    : indexPath

  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': filePath === indexPath ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(filePath).pipe(response)
}

function proxyApiRequest(request, response, adminUrl) {
  const transport = adminUrl.protocol === 'https:' ? https : http
  const headers = { ...request.headers, host: adminUrl.host }
  delete headers.origin

  const upstreamRequest = transport.request({
    protocol: adminUrl.protocol,
    hostname: adminUrl.hostname,
    port: adminUrl.port || undefined,
    method: request.method,
    path: request.url,
    headers,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })

  upstreamRequest.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    }
    response.end(JSON.stringify({ code: 502, message: `Cannot reach Aether Admin at ${adminUrl.origin}: ${error.message}` }))
  })
  request.pipe(upstreamRequest)
}

function startLocalServer() {
  const distPath = path.join(app.getAppPath(), 'dist-desktop')
  const adminUrl = getAdminUrl()
  if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    throw new Error(`Dashboard build was not found: ${distPath}`)
  }

  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        proxyApiRequest(request, response, adminUrl)
        return
      }
      sendStaticFile(response, distPath, pathname)
    })
    localServer.once('error', reject)
    localServer.listen(0, LOOPBACK_ADDRESS, () => {
      const { port } = localServer.address()
      resolve(`http://${LOOPBACK_ADDRESS}:${port}`)
    })
  })
}

function createApplicationMenu() {
  const openConfig = () => {
    const configPath = path.join(app.getPath('userData'), 'config.json')
    if (!fs.existsSync(configPath)) writeDesktopConfig({ adminUrl: DEFAULT_ADMIN_URL })
    shell.showItemInFolder(configPath)
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: '应用',
      submenu: [
        { label: '打开连接配置目录', click: openConfig },
        { type: 'separator' },
        { label: '退出', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'Ctrl+R', click: (_, window) => window?.reload() },
        { label: '强制刷新', accelerator: 'Ctrl+Shift+R', click: (_, window) => window?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: '放大', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: '缩小', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [
          { type: 'separator' },
          { label: '开发者工具', accelerator: 'Ctrl+Shift+I', click: (_, window) => window?.webContents.toggleDevTools() },
        ]),
      ],
    },
  ]))
}

function createTray(window) {
  tray = new Tray(path.join(app.getAppPath(), 'public', 'favicon.ico'))
  tray.setToolTip('Aether Dashboard')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: () => { window.show(); window.focus() } },
    { label: '退出', click: () => app.quit() },
  ]))
  tray.on('double-click', () => { window.show(); window.focus() })
}

function createWindow(localUrl) {
  const { windowBounds = {} } = readDesktopConfig()
  const window = new BrowserWindow({
    width: Number.isFinite(windowBounds.width) ? windowBounds.width : 1440,
    height: Number.isFinite(windowBounds.height) ? windowBounds.height : 900,
    x: Number.isFinite(windowBounds.x) ? windowBounds.x : undefined,
    y: Number.isFinite(windowBounds.y) ? windowBounds.y : undefined,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: 'Aether Dashboard',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141414' : '#f5f7fa',
    icon: path.join(app.getAppPath(), 'public', 'favicon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  window.once('ready-to-show', () => window.show())
  window.on('close', () => {
    if (!window.isMaximized()) writeDesktopConfig({ windowBounds: window.getBounds() })
    if (!isQuitting) {
      window.hide()
      return false
    }
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (app.isPackaged) window.webContents.on('devtools-opened', () => window.webContents.closeDevTools())
  window.loadURL(localUrl)
  createTray(window)
}

app.whenReady().then(async () => {
  try {
    nativeTheme.themeSource = 'system'
    ipcMain.handle('aether:save-file', async (_, { fileName, data }) => {
      const result = await dialog.showSaveDialog({ defaultPath: fileName || 'file' })
      if (!result.canceled && result.filePath) fs.writeFileSync(result.filePath, Buffer.from(data))
      return !result.canceled
    })
    ipcMain.handle('aether:open-config-folder', () => {
      const configPath = path.join(app.getPath('userData'), 'config.json')
      if (!fs.existsSync(configPath)) writeDesktopConfig({ adminUrl: DEFAULT_ADMIN_URL })
      shell.showItemInFolder(configPath)
    })
    createApplicationMenu()
    createWindow(await startLocalServer())
  } catch (error) {
    dialog.showErrorBox('Aether Dashboard could not start', error.message)
    app.quit()
  }
})

nativeTheme.on('updated', () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#141414' : '#f5f7fa')
    window.webContents.send('aether:theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  })
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => { isQuitting = true; localServer?.close() })
