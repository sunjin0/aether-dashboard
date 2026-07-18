import DrawerForm from '@/components/DrawerForm'
import {
  addAdminPreference,
  getAdminPreference,
  updateAdminPreference,
} from '@/services/sys/AdminPreferenceController'
import {
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { getAdminList } from '@/services/sys/AdminController'

const CATEGORY_OPTIONS = [
  { label: '语言', value: 'language' },
  { label: '表达风格', value: 'style' },
  { label: '输出格式', value: 'format' },
  { label: '技术栈', value: 'tech_stack' },
  { label: '工具策略', value: 'tool_strategy' },
]

const SCOPE_OPTIONS = [
  { label: '全局', value: 'global' },
  { label: '会话', value: 'session' },
  { label: '任务类型', value: 'task_type' },
]

interface PreferenceFormProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({ id, open, setOpen, onSuccess }) => {
  const [form] = Form.useForm()

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getAdminPreference}
      onSuccess={async (values) => {
        const payload = {
          ...values,
          status: Number(values.status),
          priority: Number(values.priority),
          decayRate: Number(values.decayRate),
          expiresAt: values.expiresAt ? dayjs(values.expiresAt).valueOf() : null,
          scopeDetail: values.scope === 'task_type' ? values.scopeDetail : null,
        }
        if (id) await updateAdminPreference({ ...payload, id })
        else await addAdminPreference(payload)
        onSuccess()
        return true
      }}
    >
      <ProFormSelect
        name="adminId"
        label="管理员"
        rules={[{ required: true, message: '请选择管理员' }]}
        request={async () => {
          const res = await getAdminList({ current: 1, pageSize: 100 })
          if (res.code === 200 && res.data) {
            return res.data.map((a) => ({ label: a.username || String(a.id), value: String(a.id) }))
          }
          return []
        }}
        fieldProps={{ showSearch: true }}
      />

      <ProFormSelect
        name="category"
        label="分类"
        rules={[{ required: true, message: '请选择分类' }]}
        options={CATEGORY_OPTIONS}
        fieldProps={{ showSearch: true }}
      />
      <ProFormText
        name="keyName"
        label="键名"
        rules={[{ required: true, message: '请输入键名' }]}
        placeholder="如 output_length"
      />
      <ProFormText
        name="value"
        label="偏好值"
        rules={[{ required: true, message: '请输入偏好值' }]}
        placeholder="如 简洁"
      />
      <ProFormTextArea
        name="description"
        label="描述"
        fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
      />
      <ProFormSelect
        name="scope"
        label="作用域"
        initialValue="global"
        options={SCOPE_OPTIONS}
      />
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
        {({ getFieldValue }) =>
          getFieldValue('scope') === 'task_type' && (
            <ProFormText
              name="scopeDetail"
              label="任务类型"
              placeholder="如 code_review、document_generation"
            />
          )
        }
      </Form.Item>
      <ProFormDigit
        name="priority"
        label="优先级"
        initialValue={50}
        min={0}
        max={100}
        fieldProps={{ precision: 0 }}
      />
      <ProFormDatePicker
        name="expiresAt"
        label="过期时间"
        placeholder="留空表示永不过期"
        fieldProps={{
          showTime: true,
          format: 'YYYY-MM-DD HH:mm:ss',
        }}
      />
      <ProFormDigit
        name="decayRate"
        label="衰减率"
        initialValue={0}
        min={0}
        max={0.1}
        fieldProps={{ precision: 3, step: 0.001 }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue={1}
        rules={[{ required: true }]}
        options={[
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ]}
      />
    </DrawerForm>
  )
}

export default PreferenceForm
