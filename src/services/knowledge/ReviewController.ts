import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  AiReviewDiff,
  AiReviewDiffAcceptResult,
  KnowledgeAiReview,
  KnowledgeAiReviewIssue,
  KnowledgeReviewTask,
  KnowledgeReviewTaskDetail,
  KnowledgeReviewTaskSearchParams,
} from '@/services/entity/Agent';
export const startAiReview = (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${id}/ai-review`, { method: 'POST' });
export const getLatestAiReview = (
  id: string,
): Promise<ResponseStructure<KnowledgeAiReview | null>> =>
  request(`/api/knowledge/ai-review/version/${id}/latest`, { method: 'GET' });
export const getAiReview = (id: string): Promise<ResponseStructure<KnowledgeAiReview>> =>
  request(`/api/knowledge/ai-review/${id}`, { method: 'GET' });
export const getAiReviewIssues = (
  id: string,
): Promise<ResponseStructure<KnowledgeAiReviewIssue[]>> =>
  request(`/api/knowledge/ai-review/${id}/issues`, { method: 'GET' });
export const getAiReviewDiff = (id: string): Promise<ResponseStructure<AiReviewDiff>> =>
  request(`/api/knowledge/ai-review/${id}/diff`, { method: 'GET' });
export const acceptAiReviewIssue = (
  reviewId: string,
  issueId: string,
  data: { expectedChecksum: string; replacement?: string; comment?: string },
): Promise<ResponseStructure<AiReviewDiffAcceptResult>> =>
  request(`/api/knowledge/ai-review/${reviewId}/issues/${issueId}/accept`, {
    method: 'POST',
    data,
  });
export const rejectAiReviewIssue = (
  reviewId: string,
  issueId: string,
  data?: { comment?: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/ai-review/${reviewId}/issues/${issueId}/reject`, {
    method: 'POST',
    data,
  });
export const acceptAiReviewIssues = (
  reviewId: string,
  data: { issueIds: string[]; expectedChecksum: string; comment?: string },
): Promise<ResponseStructure<AiReviewDiffAcceptResult>> =>
  request(`/api/knowledge/ai-review/${reviewId}/issues/accept-batch`, { method: 'POST', data });
export const applyAcceptedAiReviewIssues = (
  reviewId: string,
  data: { expectedChecksum: string },
): Promise<ResponseStructure<AiReviewDiffAcceptResult>> =>
  request(`/api/knowledge/ai-review/${reviewId}/issues/apply`, { method: 'POST', data });
export const unacceptAiReviewIssue = (
  reviewId: string,
  issueId: string,
  data?: { comment?: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/ai-review/${reviewId}/issues/${issueId}/unaccept`, {
    method: 'POST',
    data,
  });
export const handleAiReviewIssue = (
  id: string,
  data: { status: 'rejected' | 'manually_fixed' | 'ignored'; comment?: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/ai-review/issue/${id}/handle`, { method: 'PUT', data });
export const submitReview = (id: string, comment?: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${id}/submit`, { method: 'POST', data: { comment } });
export const getReviewTaskList = (
  data: KnowledgeReviewTaskSearchParams,
): Promise<ResponseStructure<KnowledgeReviewTask[]>> =>
  request('/api/knowledge/review-task/list', { method: 'POST', data });
export const getReviewTask = (id: string): Promise<ResponseStructure<KnowledgeReviewTaskDetail>> =>
  request(`/api/knowledge/review-task/${id}`, { method: 'GET' });
export const claimReviewTask = (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/review-task/${id}/claim`, { method: 'POST' });
export const approveReviewTask = (
  id: string,
  comment?: string,
): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/review-task/${id}/approve`, { method: 'POST', data: { comment } });
export const rejectReviewTask = (id: string, comment: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/review-task/${id}/reject`, { method: 'POST', data: { comment } });
