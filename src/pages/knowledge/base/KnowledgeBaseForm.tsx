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
  ProCard,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormDependency,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max'
import { Col, Form, Row } from 'antd'
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
      drawerProps={{ width: 920, className: 'knowledge-base-form-drawer' }}
      onSuccess={async (values) => {
        const payload = {
          ...values,
          status: Number(values.status),
          reviewConfig: JSON.stringify(values.reviewConfig),
          retrievalConfig: JSON.stringify(values.retrievalConfig || {}),
        }
        if (id) await updateKnowledgeBase({ ...payload, id })
        else await addKnowledgeBase(payload)
        onSuccess()
        return true
      }}
    >
      <ProCard
        title={intl.formatMessage({ id: 'pages.knowledge.base.form.basicInfo' })}
        className="knowledge-base-form-card"
      >
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="scope"
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.scope' })}
              initialValue="PLATFORM"
              rules={[{ required: true }]}
              options={[
                {
                  label: intl.formatMessage({ id: 'pages.knowledge.base.form.scope.platform' }),
                  value: 'PLATFORM',
                },
                {
                  label: intl.formatMessage({ id: 'pages.knowledge.base.form.scope.agentOnly' }),
                  value: 'AGENT',
                },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="visibility"
              label={intl.formatMessage({ id: 'pages.knowledge.base.form.visibility' })}
              initialValue="platform"
              options={[
                {
                  label: intl.formatMessage({
                    id: 'pages.knowledge.base.form.visibility.platform',
                  }),
                  value: 'platform',
                },
                {
                  label: intl.formatMessage({ id: 'pages.knowledge.base.form.visibility.private' }),
                  value: 'private',
                },
                {
                  label: intl.formatMessage({ id: 'pages.knowledge.base.form.visibility.shared' }),
                  value: 'shared',
                },
              ]}
            />
          </Col>
        </Row>
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.name' })}
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'pages.knowledge.base.form.enterName' }),
            },
          ]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.description' })}
          fieldProps={{ rows: 2, maxLength: 1000, showCount: true }}
        />
      </ProCard>

      <ProCard
        title={intl.formatMessage({ id: 'pages.knowledge.base.form.retrievalConfig' })}
        style={{ marginTop: 16 }}
        className="knowledge-base-form-card"
      >
        <ProFormSelect
          name="embeddingProviderId"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.embeddingProvider' })}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.knowledge.base.form.selectEmbeddingProvider',
              }),
            },
          ]}
          request={async () => (await getEmbeddingProviderOptions()).data || []}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <div className="knowledge-base-form-section-title">召回设置</div>
        <Row gutter={16}>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'topK']} label="最终片段数" initialValue={5} min={1} max={20} /></Col>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'minSimilarity']} label="向量相似度阈值" initialValue={0.3} min={-1} max={1} fieldProps={{ step: 0.05 }} /></Col>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'maxChunksPerDocument']} label="每文档最多片段" initialValue={2} min={1} max={10} /></Col>
        </Row>
        <Row gutter={16} className="knowledge-base-form-switches">
          <Col xs={24} md={12}><ProFormSwitch name={['retrievalConfig', 'hybridEnabled']} label="启用混合检索" initialValue /></Col>
          <Col xs={24} md={12}><ProFormSwitch name={['retrievalConfig', 'strictGrounding']} label="仅基于知识库资料回答" initialValue={false} /></Col>
        </Row>
        <ProFormDependency name={['retrievalConfig', 'hybridEnabled']}>
          {({ retrievalConfig }) => retrievalConfig?.hybridEnabled ? (
            <Row gutter={16}>
              <Col xs={24} md={12}><ProFormDigit name={['retrievalConfig', 'vectorWeight']} label="向量权重" initialValue={0.7} min={0} max={1} fieldProps={{ step: 0.1 }} /></Col>
              <Col xs={24} md={12}><ProFormDigit name={['retrievalConfig', 'minLexicalScore']} label="全文检索阈值" initialValue={0.05} min={0} max={1} fieldProps={{ step: 0.01 }} /></Col>
            </Row>
          ) : null}
        </ProFormDependency>
        <div className="knowledge-base-form-section-title">排序设置</div>
        <Row gutter={16}>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'authorityScore']} label="知识库权威度" initialValue={0} min={0} max={1} fieldProps={{ step: 0.1 }} /></Col>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'authorityWeight']} label="权威度排序权重" initialValue={0} min={0} max={1} fieldProps={{ step: 0.1 }} /></Col>
          <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'freshnessWeight']} label="新鲜度排序权重" initialValue={0} min={0} max={1} fieldProps={{ step: 0.1 }} /></Col>
        </Row>
        <ProFormSwitch name={['retrievalConfig', 'rerankEnabled']} label="启用重排序（Reranker）" initialValue={false} />
        <ProFormDependency name={['retrievalConfig', 'rerankEnabled']}>
          {({ retrievalConfig }) => retrievalConfig?.rerankEnabled ? (
            <Row gutter={16}>
              <Col xs={24} md={8}><ProFormSelect name={['retrievalConfig', 'rerankProviderId']} label="重排序模型供应商" request={getReviewModelProviderOptions} rules={[{ required: true }]} /></Col>
              <Col xs={24} md={8}><ProFormText name={['retrievalConfig', 'rerankModel']} label="重排序模型名称" /></Col>
              <Col xs={24} md={8}><ProFormDigit name={['retrievalConfig', 'rerankTopN']} label="重排序保留数" initialValue={5} min={1} max={20} /></Col>
            </Row>
          ) : null}
        </ProFormDependency>
      </ProCard>

      <ProCard
        title={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewPolicy' })}

        style={{ marginTop: 16 }}
        className="knowledge-base-form-card"
      >
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
              label={intl.formatMessage({
                id: 'pages.knowledge.base.form.requireDifferentApprover',
              })}
              initialValue
            />
          </Col>
        </Row>
        <ProFormSelect
          name={['reviewConfig', 'reviewModelProviderId']}
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewModelProvider' })}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.knowledge.base.form.selectReviewModelProvider',
              }),
            },
          ]}
          request={getReviewModelProviderOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        />
        <ProFormText
          name={['reviewConfig', 'reviewModel']}
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.reviewModel' })}
          placeholder={intl.formatMessage({
            id: 'pages.knowledge.base.form.reviewModelPlaceholder',
          })}
        />
      </ProCard>

      <ProCard
        title={intl.formatMessage({ id: 'pages.knowledge.base.form.status' })}

        style={{ marginTop: 16 }}
        className="knowledge-base-form-card"
      >
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'pages.knowledge.base.form.status' })}
          initialValue={1}
          rules={[{ required: true }]}
          options={[
            {
              label: intl.formatMessage({ id: 'pages.knowledge.base.form.status.enabled' }),
              value: 1,
            },
            {
              label: intl.formatMessage({ id: 'pages.knowledge.base.form.status.disabled' }),
              value: 0,
            },
          ]}
        />
      </ProCard>
    </DrawerForm>
  )
}

export default KnowledgeBaseForm
