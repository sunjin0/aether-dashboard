import type { AiReviewDiffIssue } from '@/services/entity/Agent'

type ReviewIssueApplyState = Pick<AiReviewDiffIssue, 'handleStatus' | 'appliedChecksum'>;

export const countUnappliedAcceptedIssues = (issues: ReviewIssueApplyState[] = []) =>
  issues.filter((issue) => issue.handleStatus === 'accepted' && !issue.appliedChecksum).length
