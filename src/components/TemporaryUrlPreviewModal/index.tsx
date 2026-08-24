import { Alert, Button, Empty, Modal, Spin, Table, Tabs } from 'antd'
import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { useIntl } from '@umijs/max'
import { renderAsync } from 'docx-preview'
import * as XLSX from 'xlsx'
import './index.less'

export interface TemporaryUrlResult { code?: number; message?: string; data?: string }

interface TemporaryUrlPreviewModalProps {
  getUrl: () => Promise<TemporaryUrlResult>
  title?: string
  triggerText?: ReactNode
  disabled?: boolean
  width?: number | string
  previewHeight?: number | string
  fileName?: string
}

interface ExcelSheetPreview { name: string; rows: string[][] }

const MAX_EXCEL_ROWS = 500
const MAX_EXCEL_COLUMNS = 100

const TemporaryUrlPreviewModal: React.FC<TemporaryUrlPreviewModalProps> = ({ getUrl, title, triggerText, disabled, width = '90vw', previewHeight = '75vh', fileName }) => {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string>()
  const [docxFile, setDocxFile] = useState<Blob>()
  const [docxRendering, setDocxRendering] = useState(false)
  const [docxError, setDocxError] = useState(false)
  const [excelSheets, setExcelSheets] = useState<ExcelSheetPreview[]>([])
  const docxContainerRef = useRef<HTMLDivElement>(null)
  const isDocx = /\.docx$/i.test(fileName || title || '')
  const isExcel = /\.(xlsx|xls)$/i.test(fileName || title || '')

  const showPreview = async () => {
    setLoading(true)
    try {
      const response = await getUrl()
      if (response.code !== 200 || !response.data) return
      setUrl(response.data)
      setDocxError(false)
      setOpen(true)
      if (isDocx || isExcel) {
        const blob = await fetch(response.data).then(result => result.blob())
        if (isDocx) {
          setDocxFile(blob)
        } else {
          setExcelSheets(readExcelPreview(await blob.arrayBuffer()))
        }
      }
    } catch {
      if (isDocx) setDocxError(true)
    } finally { setLoading(false) }
  }

  const close = () => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    setOpen(false); setUrl(undefined); setDocxFile(undefined); setDocxError(false); setExcelSheets([])
  }

  useEffect(() => {
    if (!open || !isDocx || !docxFile || !docxContainerRef.current) return
    const container = docxContainerRef.current
    container.replaceChildren()
    let disposed = false
    setDocxRendering(true)
    const renderId = window.requestAnimationFrame(() => {
      void renderAsync(docxFile, container, undefined, {
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderHeaders: true,
        renderFooters: true,
      }).then(() => {
        if (!disposed) setDocxRendering(false)
      }).catch(() => {
        if (!disposed) { setDocxRendering(false); setDocxError(true) }
      })
    })
    return () => { disposed = true; window.cancelAnimationFrame(renderId) }
  }, [docxFile, isDocx, open])

  const modalTitle = title || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.filePreview' })
  return <><Button type="link" loading={loading} disabled={disabled} onClick={showPreview}>{triggerText || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.previewDownload' })}</Button>
    <Modal title={modalTitle} open={open} onCancel={close} footer={url ? <Button type="primary" href={url} target="_blank" rel="noreferrer">{intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.download' })}</Button> : null} width={width} destroyOnClose>
      {isDocx ? <div className="temporary-url-preview-modal-docx" style={{ height: previewHeight }}>
        {docxRendering && <div className="temporary-url-preview-modal-docx-loading"><Spin /></div>}
        {docxError && <Alert type="error" showIcon message={intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.docxFailed' })} />}
        <div ref={docxContainerRef} />
      </div>
        : isExcel ? <ExcelPreview sheets={excelSheets} loading={loading} height={previewHeight} />
          : url && <iframe title={modalTitle} src={url} style={{ display: 'block', width: '100%', height: previewHeight, border: 0 }} />}
    </Modal></>
}

const ExcelPreview: React.FC<{ sheets: ExcelSheetPreview[]; loading: boolean; height: number | string }> = ({ sheets, loading, height }) => {
  const intl = useIntl()
  if (loading) return <Spin />
  if (!sheets.length) return <Empty description={intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.excelEmpty' })} />
  return <div className="temporary-url-preview-modal-excel" style={{ height }}>
    <Alert type="info" showIcon message={intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.excelLimit' }, { rows: MAX_EXCEL_ROWS, columns: MAX_EXCEL_COLUMNS })} />
    <Tabs items={sheets.map(sheet => ({ key: sheet.name, label: sheet.name, children: <ExcelSheetTable rows={sheet.rows} /> }))} />
  </div>
}

const ExcelSheetTable: React.FC<{ rows: string[][] }> = ({ rows }) => {
  const intl = useIntl()
  if (!rows.length) return <Empty description={intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.excelEmpty' })} />
  const headers = rows[0] || []
  const columns = headers.map((header, index) => ({ title: header || excelColumnName(index), dataIndex: String(index), key: String(index), ellipsis: true, width: 180 }))
  const dataSource = rows.slice(1).map((row, index) => {
    const item: Record<string, string> = { key: String(index + 1) }
    headers.forEach((_, columnIndex) => { item[String(columnIndex)] = row[columnIndex] || '' })
    return item
  })
  return <Table className="temporary-url-preview-modal-excel-table" size="small" pagination={{ pageSize: 50, showSizeChanger: true, showQuickJumper: true }} scroll={{ x: 'max-content', y: 'calc(75vh - 190px)' }} columns={columns} dataSource={dataSource} />
}

const readExcelPreview = (arrayBuffer: ArrayBuffer): ExcelSheetPreview[] => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  return workbook.SheetNames.map(name => ({
    name,
    rows: (XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false }) as unknown[][])
      .slice(0, MAX_EXCEL_ROWS)
      .map(row => row.slice(0, MAX_EXCEL_COLUMNS).map(value => String(value ?? ''))),
  }))
}

const excelColumnName = (index: number): string => {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  return result
}

export default TemporaryUrlPreviewModal
