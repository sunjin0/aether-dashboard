import { request } from '@umijs/max'
import { getEmbeddingProviderOptions } from './ModelProviderController'

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
})
