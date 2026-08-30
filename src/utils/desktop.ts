export const isElectronDesktop = () => Boolean(window.aetherDesktop?.isDesktop)

export const saveBlob = async (blob: Blob, fileName: string): Promise<boolean> => {
  if (!isElectronDesktop()) return false
  return window.aetherDesktop!.saveFile(fileName, await blob.arrayBuffer())
}

export const downloadBlob = async (blob: Blob, fileName: string): Promise<void> => {
  if (await saveBlob(blob, fileName)) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
