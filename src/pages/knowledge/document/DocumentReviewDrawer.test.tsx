import * as React from 'react'
import { render, screen } from '@testing-library/react'
import DocumentReviewDrawer from './DocumentReviewDrawer'

jest.mock('@/services/knowledge/DocumentController', () => ({
  getDocumentVersions: jest
    .fn()
    .mockResolvedValue({ data: [{ id: 'version-1', versionNo: 1, reviewStatus: 'AI_REVIEWED' }] }),
}))
jest.mock('@/services/knowledge/ReviewController', () => ({
  getLatestAiReview: jest.fn().mockResolvedValue({ data: { id: 'review-1' } }),
}))
jest.mock('../review/detail/DiffWorkspace', () => () => <div>AI review workspace</div>)

describe('DocumentReviewDrawer', () => {
  it('renders the AI review workspace inside a drawer', async () => {
    render(
      <DocumentReviewDrawer
        documentId="document-1"
        open
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    )

    expect(await screen.findByText('AI review workspace')).toBeTruthy()
  })
})
