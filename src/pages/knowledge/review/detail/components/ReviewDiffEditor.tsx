import type { editor } from 'monaco-editor'
import { DiffEditor } from '@monaco-editor/react'
import { Card, Typography } from 'antd'
import React, { useEffect, useRef } from 'react'
import { ReviewDiffEditorProps } from '../types'

const { Text } = Typography

const ReviewDiffEditor: React.FC<ReviewDiffEditorProps> = ({ diff, activeIssue }) => {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)

  useEffect(() => {
    if (!activeIssue || !editorRef.current) return
    const rafId = requestAnimationFrame(() => {
      const originalEditor = editorRef.current?.getOriginalEditor()
      const modifiedEditor = editorRef.current?.getModifiedEditor()
      if (!originalEditor || !modifiedEditor) return
      if (activeIssue.baseStartLine) {
        originalEditor.revealLineInCenter(activeIssue.baseStartLine)
        originalEditor.setPosition({ lineNumber: activeIssue.baseStartLine, column: 1 })
      }
      if (activeIssue.proposedStartLine && activeIssue.proposedStartLine > 0) {
        modifiedEditor.revealLineInCenter(activeIssue.proposedStartLine)
        modifiedEditor.setPosition({ lineNumber: activeIssue.proposedStartLine, column: 1 })
      }
    })
    return () => cancelAnimationFrame(rafId)
  }, [activeIssue])

  useEffect(() => {
    if (!editorRef.current) return
    const decorations = activeIssue?.baseStartLine
      ? [
        {
          range: {
            startLineNumber: activeIssue.baseStartLine,
            startColumn: 1,
            endLineNumber: activeIssue.baseEndLine || activeIssue.baseStartLine,
            endColumn: 1,
          },
          options: { isWholeLine: true, className: 'ai-review-active-line' },
        },
      ]
      : []
    const collection = editorRef.current
      .getOriginalEditor()
      .createDecorationsCollection(decorations)
    return () => collection.clear()
  }, [activeIssue])

  const title = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>Content Diff</span>
      {activeIssue && (
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
          Line {activeIssue.baseStartLine || '-'}
        </Text>
      )}
    </div>
  )

  return (
    <Card
      size="small"
      title={title}
      styles={{ body: { padding: 0, height: 'calc(100vh - 250px)', overflow: 'hidden' } }}
      style={{ height: '100%' }}
    >
      <DiffEditor
        height="100%"
        language="markdown"
        original={diff.originalContent}
        modified={diff.proposedContent}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        options={{
          readOnly: true,
          domReadOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          originalEditable: false,
          fontSize: 13,
          lineHeight: 22,
        }}
      />
    </Card>
  )
}
export default ReviewDiffEditor
