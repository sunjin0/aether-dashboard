import type { ProColumns } from '@ant-design/pro-components'
import { useModel, useIntl } from '@umijs/max'
import { useEffect, useMemo, useState } from 'react'
import { getAdminOptions } from '@/services/sys/AdminController'

/** 管理员业务列表统一的创建人筛选列。 */
export const useCreatorSearchColumn = <T extends object>() => {
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const isAdmin = initialState?.currentUser?.roleType === 'ADMIN'

  return useMemo<ProColumns<T> | undefined>(() => {
    if (!isAdmin) return undefined
    return {
      title: intl.formatMessage({ id: 'pages.common.creator' }),
      dataIndex: 'creatorUserId',
      valueType: 'select',
      hideInTable: true,
      request: async () => {
        const options = await getAdminOptions()
        return options.map((item) => ({ label: item.label, value: String(item.value) }))
      },
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
      },
    }
  }, [intl, isAdmin])
}

/** 自定义筛选栏使用的管理员创建人选项。 */
export const useCreatorSearchOptions = () => {
  const { initialState } = useModel('@@initialState')
  const isAdmin = initialState?.currentUser?.roleType === 'ADMIN'
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    if (!isAdmin) {
      setOptions([])
      return
    }
    getAdminOptions()
      .then((items) => setOptions(items.map((item) => ({ label: item.label, value: String(item.value) }))))
      .catch(() => setOptions([]))
  }, [isAdmin])

  return { isAdmin, options }
}

export default useCreatorSearchColumn
