import React, { useMemo, useState } from 'react'
import * as AntIcons from '@ant-design/icons'
import { Button, Input, Popover, Space, Tooltip } from 'antd'
import { useIntl } from '@umijs/max'

type IconComponent = React.ElementType

const ICON_GROUPS: Record<string, string[]> = {
  common: ['AppstoreOutlined', 'BlocksOutlined', 'ClusterOutlined', 'ProjectOutlined', 'ApartmentOutlined', 'DeploymentUnitOutlined', 'RobotOutlined', 'ThunderboltOutlined'],
  content: ['BookOutlined', 'ReadOutlined', 'FileTextOutlined', 'FolderOpenOutlined', 'DatabaseOutlined', 'CloudOutlined', 'SearchOutlined', 'SolutionOutlined', 'EditOutlined', 'PictureOutlined', 'VideoCameraOutlined', 'TranslationOutlined'],
  automation: ['ApiOutlined', 'CodeOutlined', 'ToolOutlined', 'SyncOutlined', 'PlayCircleOutlined', 'ScheduleOutlined', 'RocketOutlined', 'BugOutlined', 'BuildOutlined', 'CloudServerOutlined'],
  business: ['CustomerServiceOutlined', 'MessageOutlined', 'MailOutlined', 'NotificationOutlined', 'PhoneOutlined', 'TeamOutlined', 'UserOutlined', 'ShopOutlined', 'DollarOutlined', 'GlobalOutlined', 'CalendarOutlined', 'ClockCircleOutlined'],
  dataSecurity: ['BarChartOutlined', 'LineChartOutlined', 'PieChartOutlined', 'FundOutlined', 'TableOutlined', 'CalculatorOutlined', 'FileSearchOutlined', 'SafetyOutlined', 'LockOutlined', 'KeyOutlined', 'AuditOutlined', 'EyeOutlined', 'WarningOutlined'],
  system: ['SettingOutlined', 'ControlOutlined', 'HddOutlined', 'FireOutlined', 'CheckCircleOutlined', 'FormOutlined', 'HighlightOutlined', 'SoundOutlined', 'EnvironmentOutlined'],
}
const iconRegistry = AntIcons as unknown as Record<string, IconComponent>
/**
 * Ant Design 已随项目安装，直接从其导出项生成完整图标目录。
 * 手工分类仅用于快速浏览；“全部图标”始终包含库中新增的全部三种图标样式。
 */
const ALL_ICONS = Object.entries(iconRegistry)
  .filter(([name, component]) => /(?:Outlined|Filled|TwoTone)$/.test(name) && component != null)
  .map(([name]) => name)
  .sort((left, right) => left.localeCompare(right))
const iconOf = (name?: string) => name ? iconRegistry[name] : undefined

export const SystemIcon: React.FC<{ name?: string; fallback?: React.ReactNode }> = ({ name, fallback }) => {
  const Icon = iconOf(name)
  const DefaultIcon = AntIcons.AppstoreOutlined
  return Icon ? <Icon /> : <>{fallback || <DefaultIcon />}</>
}

interface SystemIconPickerProps {
  value?: string;
  onChange?: (value?: string) => void;
}

/** 平台统一图标库：存储稳定的 Ant Design 图标名，而非不受控的外链地址。 */
const SystemIconPicker: React.FC<SystemIconPickerProps> = ({ value, onChange }) => {
  const [keyword, setKeyword] = useState('')
  const [group, setGroup] = useState('all')
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const visibleIcons = useMemo(() => {
    const names = keyword.trim() || group === 'all' ? ALL_ICONS : ICON_GROUPS[group]
    return names.filter((name) => name.toLowerCase().includes(keyword.trim().toLowerCase()))
  }, [group, keyword])
  const content = (
    <div style={{ width: 360 }}>
      <Input size="small" allowClear placeholder={format('components.systemIconPicker.searchPlaceholder')} value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ marginBottom: 8 }} />
      {!keyword && <Space wrap size={4} style={{ marginBottom: 8 }}><Button size="small" type={group === 'all' ? 'primary' : 'text'} onClick={() => setGroup('all')}>{format('components.systemIconPicker.all', { count: ALL_ICONS.length })}</Button>{Object.keys(ICON_GROUPS).map((item) => <Button key={item} size="small" type={group === item ? 'primary' : 'text'} onClick={() => setGroup(item)}>{format(`components.systemIconPicker.group.${item}`)}</Button>)}</Space>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
      {visibleIcons.map((name) => {
        const Icon = iconOf(name)
        if (!Icon) return null
        return (
        <Tooltip key={name} title={format('components.systemIconPicker.iconTooltip', { name })}>
          <Button
            type={value === name ? 'primary' : 'text'}
            icon={<Icon />}
            aria-label={name}
            onClick={() => onChange?.(name)}
          />
        </Tooltip>
        )
      })}
      </div>
    </div>
  )
  return (
    <Space>
      <Popover title={format('components.systemIconPicker.title')} content={content} trigger="click">
        <Button icon={<SystemIcon name={value} />}>
          {value || format('components.systemIconPicker.select')}
        </Button>
      </Popover>
      {value && <Button type="link" onClick={() => onChange?.(undefined)}>{format('components.systemIconPicker.clear')}</Button>}
    </Space>
  )
}

export default SystemIconPicker
