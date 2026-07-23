import { request } from '@umijs/max';
import {
  addDocument,
  deleteDocument,
  getDocument,
  getDocumentList,
  reindexDocument,
  updateDocument,
} from './DocumentController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('DocumentController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented document endpoints', async () => {
    await getDocumentList({ current: 1, pageSize: 20, knowledgeBaseId: 'knowledge-base-1' });
    await getDocument('document-1');
    await addDocument({
      knowledgeBaseId: 'knowledge-base-1',
      title: 'Quick start',
      content: '# Start',
    });
    await updateDocument({ id: 'document-1', title: 'Quick start', content: '# Updated' });
    await deleteDocument('document-1');
    await reindexDocument('document-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/knowledge/document/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, knowledgeBaseId: 'knowledge-base-1' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/knowledge/document/document-1', {
      method: 'GET',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/knowledge/document', {
      method: 'POST',
      data: { knowledgeBaseId: 'knowledge-base-1', title: 'Quick start', content: '# Start' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/knowledge/document/document-1', {
      method: 'PUT',
      data: { id: 'document-1', title: 'Quick start', content: '# Updated' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/knowledge/document/document-1', {
      method: 'DELETE',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(6, '/api/knowledge/document/document-1/reindex', {
      method: 'POST',
    });
  });
});
