import DrawerForm from '@/components/DrawerForm'
import {
  addKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
} from '@/services/knowledge/KnowledgeBaseController'
import {
  getEmbeddingProviderOptions,
  getReviewModelProviderOptions,
} from '@/services/agent/ModelProviderController'
import {
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import { Card, Col, Form, Row } from 'antd'
import './KnowledgeBaseForm.less'

interface KnowledgeBaseFormProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({ id, open, setOpen, onSuccess }) => {
  const [form] = Form.useForm()

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getKnowledgeBase}
      onSuccess={async (values) => {
        const payload = {
          ...values,
          status: Number(values.status),
          reviewConfig: JSON.stringify(values.reviewConfig),
        }
        if (id) await updateKnowledgeBase({ ...payload, id })
        else await addKnowledgeBase(payload)
        onSuccess()
        return true
      }}
    >
      <Card title="基础信息" size="small" className="knowledge-base-form-card">
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="scope"
              label="知识库范围"
              initialValue="PLATFORM"
              rules={[{ required: true }]}
              options={[
                { label: '平台级', value: 'PLATFORM' },
                { label: 'Agent 专属', value: 'AGENT' },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="visibility"
              label="可见范围"
              initialValue="platform"
              options={[
                { label: '平台可见', value: 'platform' },
                { label: '仅本人', value: 'private' },
                { label: '共享', value: 'shared' },
              ]}
            />
          </Col>
        </Row>
        <ProFormText
          name="name"
          label="知识库名称"
          rules={[{ required: true, message: '请输入知识库名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          fieldProps={{ rows: 2, maxLength: 1000, showCount: true }}
        />
      </Card>

      <Card title="检索配置" size="small" className="knowledge-base-form-card">
        <ProFormSelect
          name="embeddingProviderId"
          label="Embedding 供应商"
          rules={[{ required: true, message: '请选择 Embedding 供应商' }]}
          request={async () => (await getEmbeddingProviderOptions()).data || []}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <ProFormTextArea
          name="retrievalConfig"
          label="检索配置"
          tooltip="保留现有后端配置格式"
          fieldProps={{ rows: 3, placeholder: '{ }' }}
        />
      </Card>

      <Card title="审查策略" size="small" className="knowledge-base-form-card">
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'autoAiReview']}
              label="创建后自动发起 AI 审查"
              initialValue
            />
          </Col>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'aiReviewRequired']}
              label="提交前必须完成 AI 审查"
              initialValue
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'blockOnCriticalIssues']}
              label="严重问题阻止提交"
              initialValue
            />
          </Col>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'requireDifferentApprover']}
              label="提交人与审批人必须不同"
              initialValue
            />
          </Col>
        </Row>
        <ProFormSelect
          name={['reviewConfig', 'reviewModelProviderId']}
          label="AI 审查模型供应商"
          rules={[{ required: true, message: '请选择非 Embedding 模型供应商' }]}
          request={getReviewModelProviderOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <ProFormText
          name={['reviewConfig', 'reviewModel']}
          label="审查模型"
          placeholder="留空时使用供应商默认模型"
        />
      </Card>

      <Card title="状态" size="small" className="knowledge-base-form-card">
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
      </Card>
    </DrawerForm>
  )
}

export default KnowledgeBaseForm
