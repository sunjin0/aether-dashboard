import { AiReviewDiff, AiReviewDiffIssue } from '@/services/entity/Agent';
export type ReviewIssueFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'risk';
export interface ReviewDiffEditorProps {
  diff: AiReviewDiff;
  activeIssue?: AiReviewDiffIssue;
}
