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
import { useIntl } from '@umijs/max'
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
  const intl = useIntl()

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
      <Card title={intl.formatMessage({ id: 'pages.knowledge.base.form.basicInfo' })} size="small" className="knowledge-base-form-card">
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="scope"
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.scope' })}
              initialValue="PLATFORM"
              rules={[{ required: true }]}
              options={[
                { label: intl.formatMessage({ id: 'pages.knowledge.base.form.scope.platform' }), value: 'PLATFORM' },
                { label: intl.formatMessage({ id: 'pages.knowledge.base.form.scope.agentOnly' }), value: 'AGENT' },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="visibility"
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.visibility' })}
              initialValue="platform"
              options={[
                { label: intl.formatMessage({ id: 'pages.knowledge.base.form.visibility.platform' }), value: 'platform' },
                { label: intl.formatMessage({ id: 'pages.knowledge.base.form.visibility.private' }), value: 'private' },
                { label: intl.formatMessage({ id: 'pages.knowledge.base.form.visibility.shared' }), value: 'shared' },
              ]}
            />
          </Col>
        </Row>
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.name' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.knowledge.base.form.enterName' }) }]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.description' })}
          fieldProps={{ rows: 2, maxLength: 1000, showCount: true }}
        />
      </Card>

      <Card title={intl.formatMessage({ id: 'pages.knowledge.base.form.retrievalConfig' })} size="small" className="knowledge-base-form-card">
        <ProFormSelect
          name="embeddingProviderId"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.embeddingProvider' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.knowledge.base.form.selectEmbeddingProvider' }) }]}
          request={async () => (await getEmbeddingProviderOptions()).data || []}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <ProFormTextArea
          name="retrievalConfig"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.retrievalConfig' })}
          tooltip={intl.formatMessage({ id: 'pages.knowledge.base.form.retrievalConfigTooltip' })}
          fieldProps={{ rows: 3, placeholder: '{ }' }}
        />
      </Card>

      <Card title={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewPolicy' })} size="small" className="knowledge-base-form-card">
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'autoAiReview']}
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.autoAiReview' })}
              initialValue
            />
          </Col>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'aiReviewRequired']}
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.aiReviewRequired' })}
              initialValue
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'blockOnCriticalIssues']}
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.blockOnCriticalIssues' })}
              initialValue
            />
          </Col>
          <Col span={12}>
            <ProFormSwitch
              name={['reviewConfig', 'requireDifferentApprover']}
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.requireDifferentApprover' })}
              initialValue
            />
          </Col>
        </Row>
        <ProFormSelect
          name={['reviewConfig', 'reviewModelProviderId']}
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewModelProvider' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.knowledge.base.form.selectReviewModelProvider' }) }]}
          request={getReviewModelProviderOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <ProFormText
          name={['reviewConfig', 'reviewModel']}
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewModel' })}
          placeholder={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewModelPlaceholder' })}
        />
      </Card>

      <Card title={intl.formatMessage({ id: 'pages.knowledge.base.form.status' })} size="small" className="knowledge-base-form-card">
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.status' })}
          initialValue={1}
          rules={[{ required: true }]}
          options={[
            { label: intl.formatMessage({ id: 'pages.knowledge.base.form.status.enabled' }), value: 1 },
            { label: intl.formatMessage({ id: 'pages.knowledge.base.form.status.disabled' }), value: 0 },
          ]}
        />
      </Card>
    </DrawerForm>
  )
}

export default KnowledgeBaseForm
