import { DiffEditor } from '@monaco-editor/react'
import { useIntl } from '@umijs/max'
import { Modal, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { getDocumentVersion } from '@/services/knowledge/DocumentController'

interface Props {
  versionId?: string;
  currentVersionId?: string;
  open: boolean;
  onClose: () => void;
}

const VersionDiffModal: React.FC<Props> = ({ versionId, currentVersionId, open, onClose }) => {
  const intl = useIntl()
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !versionId || !currentVersionId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [oldResp, newResp] = await Promise.all([
          getDocumentVersion(versionId),
          getDocumentVersion(currentVersionId),
        ])
        if (!cancelled) {
          setOriginal(oldResp.data?.content || '')
          setModified(newResp.data?.content || '')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, versionId, currentVersionId])

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.knowledge.document.version.diffTitle' })}
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      destroyOnClose
    >
      <Spin spinning={loading}>
        <div style={{ height: '70vh' }}>
          {!loading && original !== undefined && (
            <DiffEditor
              original={original}
              modified={modified}
              language="plaintext"
              theme="vs"
            />
          )}
        </div>
      </Spin>
    </Modal>
  )
}

export default VersionDiffModal
