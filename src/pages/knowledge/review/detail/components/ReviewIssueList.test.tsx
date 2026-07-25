import * as React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ReviewIssueList from './ReviewIssueList'

jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}))

const issue = {
  id: 'issue-1',
  severity: 'high' as const,
  issueType: 'clarity',
  message: 'Clarify the approval criteria',
  originalExcerpt: 'Approval is required.',
  handleStatus: 'pending' as const,
  baseStartLine: 12,
  baseEndLine: 14,
  suggestedPatch: {
    operation: 'replace' as const,
    target: { original: 'Approval is required.' },
    replacement: 'Approval criteria are required.',
  },
}

describe('ReviewIssueList', () => {
  it('shows issue actions only after the issue is selected', () => {
    const IssueList = () => {
      const [activeId, setActiveId] = React.useState<string>()
      return (
        <ReviewIssueList
          issues={[issue]}
          filter="all"
          activeId={activeId}
          onFilter={jest.fn()}
          onSelect={(selectedIssue) => setActiveId(selectedIssue.id)}
          onAccept={jest.fn()}
          onReject={jest.fn()}
          onUnaccept={jest.fn()}
        />
      )
    }

    render(<IssueList />)

    expect(
      screen.queryByRole('button', { name: /pages\.knowledge\.review\.issueList\.accept/ }),
    ).toBeNull()
    fireEvent.click(screen.getByText(issue.message))
    expect(
      screen.getByRole('button', { name: /pages\.knowledge\.review\.issueList\.accept/ }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /pages\.knowledge\.review\.issueList\.reject/ }),
    ).toBeTruthy()
  })
})
