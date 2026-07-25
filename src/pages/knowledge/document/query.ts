export const getKnowledgeBaseContext = (search: string) => {
  const params = new URLSearchParams(search)
  return {
    id: params.get('knowledgeBaseId') || '',
    name: params.get('knowledgeBaseName') || '',
  }
}
