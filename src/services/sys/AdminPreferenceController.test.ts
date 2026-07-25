import { request } from '@umijs/max'
import {
  addAdminPreference,
  confirmAdminPreference,
  deleteAdminPreference,
  getAdminPreference,
  getAdminPreferenceList,
  overrideAdminPreference,
  rejectAdminPreference,
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
    await getAdminPreferenceList({
      current: 1,
      pageSize: 20,
      category: 'style',
      keyName: 'output_length',
    })
    await getAdminPreference('preference-1')
    await addAdminPreference({
      category: 'style',
      keyName: 'output_length',
      value: '简洁',
      status: 1,
    })
    await updateAdminPreference({
      id: 'preference-1',
      category: 'style',
      keyName: 'output_length',
      value: '详细',
    })
    await updateAdminPreferenceStatus('preference-1', { status: 0 })
    await confirmAdminPreference('preference-1')
    await rejectAdminPreference('preference-1')
    await overrideAdminPreference('preference-1', { value: '详细' })
    await deleteAdminPreference('preference-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/sys/admin/preference/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, category: 'style', keyName: 'output_length' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/sys/admin/preference/preference-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/sys/admin/preference', {
      method: 'POST',
      data: { category: 'style', keyName: 'output_length', value: '简洁', status: 1 },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/sys/admin/preference/preference-1', {
      method: 'PUT',
      data: { id: 'preference-1', category: 'style', keyName: 'output_length', value: '详细' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      5,
      '/api/sys/admin/preference/preference-1/status',
      {
        method: 'PUT',
        data: { status: 0 },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      6,
      '/api/sys/admin/preference/preference-1/feedback',
      {
        method: 'POST',
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      7,
      '/api/sys/admin/preference/preference-1/feedback',
      {
        method: 'DELETE',
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      8,
      '/api/sys/admin/preference/preference-1/override',
      {
        method: 'PUT',
        data: { value: '详细' },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(9, '/api/sys/admin/preference/preference-1', {
      method: 'DELETE',
    })
  })
})
