import { useIntl } from '@umijs/max'
import { Input, Modal } from 'antd'
import React, { useEffect, useState } from 'react'
import { AiReviewDiffIssue } from '@/services/entity/Agent'
interface Props {
  issue?: AiReviewDiffIssue;
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (replacement?: string) => void;
}
const ReplacementEditor: React.FC<Props> = ({ issue, open, loading, onCancel, onConfirm }) => {
  const intl = useIntl()
  const [replacement, setReplacement] = useState('')
  useEffect(() => setReplacement(issue?.suggestedPatch?.replacement || ''), [issue])
  return (
    <Modal
      open={open}
      title={intl.formatMessage({ id: 'pages.knowledge.review.replacementEditor.title' })}
      okText={intl.formatMessage({ id: 'pages.knowledge.review.replacementEditor.okText' })}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => onConfirm(replacement || undefined)}
    >
      <p>{issue?.message}</p>
      <Input.TextArea
        rows={5}
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder={intl.formatMessage({
          id: 'pages.knowledge.review.replacementEditor.placeholder',
        })}
      />
    </Modal>
  )
}
export default ReplacementEditor
