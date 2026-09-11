import { request } from '@umijs/max'
import { getEmbeddingProviderOptions, saveModelCatalogBatch } from './ModelProviderController'

jest.mock('@umijs/max', () => ({ request: jest.fn() }))

const mockedRequest = request as jest.Mock

describe('ModelProviderController', () => {
  it('loads enabled embedding provider options from the documented endpoint', async () => {
    mockedRequest.mockResolvedValue({ code: 200, data: [] })

    await getEmbeddingProviderOptions()

    expect(mockedRequest).toHaveBeenCalledWith('/api/agent/model-provider/embedding-options', {
      method: 'GET',
    })
  })

  it('wraps batch model catalog saves in the envelope the endpoint binds to', async () => {
    mockedRequest.mockResolvedValue({ code: 200, data: 1 })
    const models = [{ providerId: 'p1', name: 'qwen-max', capabilities: 'CHAT', status: 1 }]

    await saveModelCatalogBatch(models)

    // 服务端形参是 ModelCatalogBatch{models:[...]}；直接发裸数组会反序列化失败并返回 500。
    expect(mockedRequest).toHaveBeenCalledWith('/api/agent/model-provider/models/batch', {
      method: 'POST',
      data: { models },
    })
  })
})
