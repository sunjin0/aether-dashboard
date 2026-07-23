import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import ReviewTaskDrawer from './ReviewTaskDrawer';

const mockGetReviewTask = jest.fn();
const mockClaimReviewTask = jest.fn();
const mockApproveReviewTask = jest.fn();
const mockUpdateDocumentDraft = jest.fn();

jest.mock('@/services/knowledge/ReviewController', () => ({
  getReviewTask: (...args: unknown[]) => mockGetReviewTask(...args),
  claimReviewTask: (...args: unknown[]) => mockClaimReviewTask(...args),
  approveReviewTask: (...args: unknown[]) => mockApproveReviewTask(...args),
  rejectReviewTask: jest.fn(),
}));
jest.mock('@/services/knowledge/DocumentController', () => ({
  updateDocumentDraft: (...args: unknown[]) => mockUpdateDocumentDraft(...args),
}));
jest.mock('@/services/sys/AdminController', () => ({
  getAdminList: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: { value?: string; onChange?: (value?: string) => void }) => (
    <textarea
      aria-label="document-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  useModel: () => ({ initialState: { currentUser: { id: 'admin-1' } } }),
}));

describe('ReviewTaskDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewTask.mockResolvedValue({
      data: {
        id: 'task-1',
        documentTitle: '审批文档',
        status: 'pending',
        version: { id: 'version-1', content: '正文', contentChecksum: 'checksum-1' },
        actionLogs: [
          { operatorName: '张三', action: 'CLAIMED', createdAt: 1735689600000 },
          { action: 'DRAFT_CREATED', createdAt: 1784524500000 },
          { action: 'AI_REVIEW_STARTED', createdAt: 1784524500000 },
          { action: 'DRAFT_UPDATED', createdAt: 1784524560000 },
        ],
      },
    });
    mockClaimReviewTask.mockResolvedValue({ code: 200 });
    mockApproveReviewTask.mockResolvedValue({ code: 200 });
    mockUpdateDocumentDraft.mockResolvedValue({
      data: { id: 'version-1', content: '修改后正文', contentChecksum: 'checksum-2' },
    });
  });

  it('shows a review task in a drawer rather than navigating to a detail page', async () => {
    render(<ReviewTaskDrawer taskId="task-1" open onClose={jest.fn()} onSuccess={jest.fn()} />);

    expect(await screen.findByText('审批文档')).toBeTruthy();
  });

  it('renders the page presentation as a review workspace', async () => {
    render(
      <ReviewTaskDrawer
        taskId="task-1"
        open
        presentation="page"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    expect(await screen.findByText('审批文档')).toBeTruthy();
    expect(screen.getByText('问题 0')).toBeTruthy();
    expect(screen.getByText('审批信息')).toBeTruthy();
    expect(screen.getByText('操作记录')).toBeTruthy();
    expect(screen.getByLabelText('document-editor')).toBeTruthy();
  });

  it('shows decision actions immediately after a successful claim and formats action logs', async () => {
    render(<ReviewTaskDrawer taskId="task-1" open onClose={jest.fn()} onSuccess={jest.fn()} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'pages.knowledge.review.detail.claim' }),
    );

    await waitFor(
      () =>
        expect(
          screen.getByRole('button', { name: 'pages.knowledge.review.detail.approve' }),
        ).toBeTruthy(),
      { timeout: 10_000 },
    );
    expect(
      screen.getByRole('button', { name: 'pages.knowledge.review.detail.reject' }),
    ).toBeTruthy();
    expect(screen.getByText('pages.knowledge.review.action.claimed')).toBeTruthy();
    expect(screen.getByText('pages.knowledge.review.action.draftCreated')).toBeTruthy();
    expect(screen.getByText('pages.knowledge.review.action.aiReviewStarted')).toBeTruthy();
    expect(screen.getByText('pages.knowledge.review.action.draftUpdated')).toBeTruthy();
    expect(screen.getByText(dayjs(1735689600000).format('YYYY-MM-DD HH:mm'))).toBeTruthy();
  });

  it('saves edited version content before approval', async () => {
    mockGetReviewTask.mockResolvedValue({
      data: {
        id: 'task-1',
        documentTitle: '审批文档',
        status: 'claimed',
        reviewerId: 'admin-1',
        version: { id: 'version-1', content: '正文', contentChecksum: 'checksum-1' },
      },
    });

    render(<ReviewTaskDrawer taskId="task-1" open onClose={jest.fn()} onSuccess={jest.fn()} />);

    fireEvent.change(await screen.findByLabelText('document-editor'), {
      target: { value: '修改后正文' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pages.knowledge.review.detail.approve' }));

    await waitFor(() =>
      expect(mockUpdateDocumentDraft).toHaveBeenCalledWith('version-1', '修改后正文', 'checksum-1'),
    );
    expect(mockApproveReviewTask).toHaveBeenCalledWith('task-1', '');
  });
});
