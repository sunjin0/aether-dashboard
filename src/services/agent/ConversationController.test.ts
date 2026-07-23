import { request } from '@umijs/max';
import {
  closeAgentConversation,
  deleteAgentConversation,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMessages,
} from './ConversationController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('ConversationController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented conversation management endpoints', async () => {
    await getAgentConversationList({ current: 1, pageSize: 20, title: 'hello' });
    await getAgentConversationInfo('conversation-1');
    await getAgentConversationMessages('conversation-1', { current: 1, pageSize: 20 });
    await closeAgentConversation('conversation-1');
    await deleteAgentConversation('conversation-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/conversation/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, title: 'hello' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/conversation/conversation-1', {
      method: 'GET',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(
      3,
      '/api/agent/conversation/conversation-1/messages',
      {
        method: 'GET',
        params: { current: 1, pageSize: 20 },
      },
    );
    expect(mockedRequest).toHaveBeenNthCalledWith(
      4,
      '/api/agent/conversation/conversation-1/close',
      {
        method: 'PUT',
      },
    );
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/conversation/conversation-1', {
      method: 'DELETE',
    });
  });
});
