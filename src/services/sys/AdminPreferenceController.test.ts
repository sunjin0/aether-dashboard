import { request } from '@umijs/max'
import {
  addAdminPreference,
  deleteAdminPreference,
  getAdminPreference,
  getAdminPreferenceList,
  updateAdminPreference,
  updateAdminPreferenceStatus,
} from './AdminPreferenceController'

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}))

const mockedRequest = request as jest.Mock

describe('AdminPreferenceController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented user preference endpoints', async () => {
    await getAdminPreferenceList({ current: 1, pageSize: 20, category: 'style' })
    await getAdminPreference('preference-1')
    await addAdminPreference({ category: 'style', content: 'Use Chinese', status: 1 })
    await updateAdminPreference({ id: 'preference-1', category: 'style', content: 'Be concise' })
    await updateAdminPreferenceStatus('preference-1', { status: 0 })
    await deleteAdminPreference('preference-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/sys/admin/preference/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, category: 'style' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/sys/admin/preference/preference-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/sys/admin/preference', {
      method: 'POST',
      data: { category: 'style', content: 'Use Chinese', status: 1 },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/sys/admin/preference/preference-1', {
      method: 'PUT',
      data: { id: 'preference-1', category: 'style', content: 'Be concise' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      5,
      '/api/sys/admin/preference/preference-1/status',
      {
        method: 'PUT',
        data: { status: 0 },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(6, '/api/sys/admin/preference/preference-1', {
      method: 'DELETE',
    })
  })
})
