import { getKnowledgeBaseContext } from './query';

describe('document page knowledge-base context', () => {
  it('reads the knowledge-base id and name from the URL query string', () => {
    expect(
      getKnowledgeBaseContext('?knowledgeBaseId=base-1&knowledgeBaseName=Product%20Docs'),
    ).toEqual({
      id: 'base-1',
      name: 'Product Docs',
    });
  });

  it('returns an empty context when no knowledge base is selected', () => {
    expect(getKnowledgeBaseContext('')).toEqual({ id: '', name: '' });
  });
});
