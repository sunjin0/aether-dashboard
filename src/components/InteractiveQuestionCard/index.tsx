import React, { useState, useMemo, useCallback } from 'react';
import { Button, Checkbox, Input, Radio, Tabs, Typography } from 'antd';
import { useIntl } from '@umijs/max';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  AskUserAnswer,
  ChoiceQuestionConfig,
  ConfirmQuestionConfig,
  GroupQuestionConfig,
  QuestionAnswer,
  QuestionConfig,
  QuestionItemConfig,
} from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

// ─── 工具函数 ─────────────────────────────────────────────────────────────

function parseQuestionConfig(input: string | QuestionConfig): QuestionConfig {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return { type: 'confirm', question: input } as ConfirmQuestionConfig;
    }
  }
  return input;
}

/** 从 group config 或 question item 上读取历史答案 */
function getQuestionAnswer(
  questionId: string,
  question: QuestionItemConfig,
  groupConfig?: GroupQuestionConfig,
): QuestionAnswer | undefined {
  // 优先读问题自身的 answer
  if (question.answer) return question.answer;
  // 兼容读 group 顶层 answer.answers
  return groupConfig?.answer?.answers?.[questionId];
}

/** choice 答案展示文本 */
function getChoiceAnswerText(
  answer: QuestionAnswer | undefined,
  config: ChoiceQuestionConfig,
): string {
  if (!answer) return '';
  // 优先读 selectedOptions（带 label）
  if (answer.selectedOptions?.length) {
    return answer.selectedOptions.map((o) => o.label).join('、');
  }
  // 回退到 selected + options 查找 label
  const selected = answer.selected;
  if (!selected) return '';
  const values = Array.isArray(selected) ? selected : [selected];
  return values.map((val) => config.options.find((o) => o.value === val)?.label || val).join('、');
}

/** confirm 答案展示文本 */
function getConfirmAnswerText(
  answer: QuestionAnswer | undefined,
  confirmLabel: string,
  cancelLabel: string,
): string {
  if (!answer) return '';
  if (answer.label) return answer.label;
  return answer.confirmed ? confirmLabel : cancelLabel;
}

/** 判断答案是否已填写 */
function isAnswerFilled(answer: AskUserAnswer | undefined): boolean {
  if (!answer) return false;
  if ('selected' in answer) {
    const s = answer.selected;
    if (Array.isArray(s)) return s.length > 0;
    return !!s;
  }
  if ('confirmed' in answer) return true;
  return false;
}

function getChoiceAnswer(
  value: string | string[],
  customValue: string,
  multiple?: boolean,
): AskUserAnswer {
  const custom = customValue.trim();
  if (multiple) {
    return { selected: custom ? [...(value as string[]), custom] : value };
  }
  return { selected: custom || value };
}

/** QuestionAnswer → AskUserAnswer */
function toAskUserAnswer(a: QuestionAnswer): AskUserAnswer | undefined {
  if (a.selected !== undefined) return { selected: a.selected };
  if (a.confirmed !== undefined) return { confirmed: a.confirmed };
  return undefined;
}

// ─── 导出类型 ─────────────────────────────────────────────────────────────

export type InteractiveQuestionCardStatus =
  | 'pending'
  | 'answered'
  | 'cancelled'
  | 'expired'
  | 'submitting';

export interface InteractiveQuestionCardProps {
  questionConfig: QuestionConfig | string;
  content?: string;
  status?: InteractiveQuestionCardStatus;
  answer?: Record<string, AskUserAnswer>;
  onSubmit?: (answers: Record<string, AskUserAnswer>) => void;
}

// ─── 选项组件（交互态）─────────────────────────────────────────────────────

interface SingleChoiceQuestionProps {
  config: ChoiceQuestionConfig;
  disabled: boolean;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  customInputPlaceholder: string;
}

const SingleChoiceQuestion: React.FC<SingleChoiceQuestionProps> = ({
  config,
  disabled,
  value,
  onChange,
  customValue,
  onCustomChange,
  customInputPlaceholder,
}) => {
  if (config.multiple) {
    return (
      <div className="iq-card-choices">
        <div className="iq-card-choice-list">
          {config.options.map((option) => {
            const checked = (value as string[]).includes(option.value);
            return (
              <label
                key={option.id}
                className={`iq-card-choice-item ${checked ? 'iq-card-choice-item-active' : ''}`}
              >
                <Checkbox
                  value={option.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => {
                    const c = e.target.checked;
                    const newVal = c
                      ? [...(value as string[]), option.value]
                      : (value as string[]).filter((v) => v !== option.value);
                    onChange(newVal);
                  }}
                >
                  {option.label}
                </Checkbox>
                {checked && <CheckOutlined className="iq-card-choice-check" />}
              </label>
            );
          })}
        </div>
        {config.allowCustomInput && (
          <Input
            style={{
              marginTop: 10,
              height: 50,
            }}
            value={customValue}
            onChange={(event) => onCustomChange(event.target.value)}
            placeholder={config.customInputPlaceholder || customInputPlaceholder}
            maxLength={200}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  return (
    <div className="iq-card-choices">
      <div className="iq-card-choice-list">
        {config.options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.id}
              className={`iq-card-choice-item ${checked ? 'iq-card-choice-item-active' : ''}`}
            >
              <Radio
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              >
                {option.label}
              </Radio>
              {checked && <CheckOutlined className="iq-card-choice-check" />}
            </label>
          );
        })}
      </div>
      {config.allowCustomInput && (
        <Input
          style={{
            marginTop: 10,
            height: 50,
          }}
          value={customValue}
          onChange={(event) => onCustomChange(event.target.value)}
          placeholder={config.customInputPlaceholder || customInputPlaceholder}
          maxLength={200}
          disabled={disabled}
        />
      )}
    </div>
  );
};

interface SingleConfirmQuestionProps {
  config: ConfirmQuestionConfig;
  disabled: boolean;
  value: boolean | null;
  onChange: (value: boolean) => void;
  confirmLabel: string;
  cancelLabel: string;
}

const SingleConfirmQuestion: React.FC<SingleConfirmQuestionProps> = ({
  config,
  disabled,
  value,
  onChange,
  confirmLabel,
  cancelLabel,
}) => {
  return (
    <div className="iq-card-confirm">
      <Button
        type={value === true ? 'primary' : 'default'}
        icon={<CheckCircleOutlined />}
        onClick={() => onChange(true)}
        disabled={disabled}
        size="large"
        className="iq-card-confirm-btn"
      >
        {config.confirmText || confirmLabel}
      </Button>
      <Button
        danger={value === false}
        type={value === false ? 'primary' : 'default'}
        icon={<CloseCircleOutlined />}
        onClick={() => onChange(false)}
        disabled={disabled}
        size="large"
        className="iq-card-confirm-btn"
      >
        {config.cancelText || cancelLabel}
      </Button>
    </div>
  );
};

// ─── 历史答案摘要（只读）──────────────────────────────────────────────────

const AnswerSummary: React.FC<{
  question: QuestionItemConfig;
  groupConfig?: GroupQuestionConfig;
}> = ({ question, groupConfig }) => {
  const intl = useIntl();
  const answer = getQuestionAnswer(question.id, question, groupConfig);
  if (!answer) return null;

  let text = '';
  if (question.type === 'choice') {
    text = getChoiceAnswerText(answer, question);
  } else {
    text = getConfirmAnswerText(
      answer,
      intl.formatMessage({ id: 'components.interactiveQuestionCard.confirm' }),
      intl.formatMessage({ id: 'components.interactiveQuestionCard.cancel' }),
    );
  }

  if (!text) return null;

  return (
    <div className="iq-card-answer-summary">
      <CheckOutlined style={{ color: '#52c41a', marginRight: 8, fontSize: 14 }} />
      <Text type="secondary" className="iq-card-answer-text">
        {text}
      </Text>
    </div>
  );
};

// ─── 主组件 ────────────────────────────────────────────────────────────────

const ConfirmLayout: React.FC<{
  config: GroupQuestionConfig;
  disabled: boolean;
  status: InteractiveQuestionCardStatus;
  onSubmit?: (answers: Record<string, AskUserAnswer>) => void;
}> = ({ config, disabled, status, onSubmit }) => {
  const intl = useIntl();
  const statusLabelMap: Record<string, { text: string; className: string }> = {
    answered: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.answered' }),
      className: 'iq-card-status-answered',
    },
    cancelled: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.cancelled' }),
      className: 'iq-card-status-cancelled',
    },
    expired: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.expired' }),
      className: 'iq-card-status-expired',
    },
  };
  const riskLabelMap: Record<string, string> = {
    low: intl.formatMessage({ id: 'components.interactiveQuestionCard.risk.low' }),
    medium: intl.formatMessage({ id: 'components.interactiveQuestionCard.risk.medium' }),
    high: intl.formatMessage({ id: 'components.interactiveQuestionCard.risk.high' }),
  };
  const [selected, setSelected] = useState<string | string[]>('');
  const [customValue, setCustomValue] = useState('');
  const approvalQuestion = config.questions[0];
  const statusInfo = statusLabelMap[status];
  const isPlanApproval = config.approvalType === 'deep_plan_approval';

  if (!isPlanApproval && !approvalQuestion) return null;

  const submit = (answer: AskUserAnswer) => {
    if (isPlanApproval) {
      onSubmit?.({ plan_approved: answer })
      return
    }
    onSubmit?.({ [approvalQuestion.id]: answer })
  }

  return (
    <div className={`iq-card iq-card-confirm-layout ${disabled ? `iq-card-${status}` : ''}`}>
      <div className="iq-card-confirm-layout-header">
        <SafetyCertificateOutlined />
        <div>
          <Text strong>
            {intl.formatMessage({
              id: isPlanApproval
                ? 'components.interactiveQuestionCard.planApprovalTitle'
                : 'components.interactiveQuestionCard.toolCallConfirmation',
            })}
          </Text>
          <div className="iq-card-confirm-layout-question">{config.question}</div>
        </div>
      </div>
      {isPlanApproval ? (
        <div className="iq-card-confirm-layout-plan">
          {(config.plan || []).map((step: any, index: number) => (
            <div key={step.id || step.stepKey || `plan-${index}`} className="iq-card-plan-step">
              <Checkbox checked={step.status === 'completed'} disabled />
              <span>{step.title || `步骤 ${index + 1}`}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="iq-card-confirm-layout-description">{approvalQuestion.question}</div>
          <div className="iq-card-confirm-layout-details">
            <div>
              <Text type="secondary">
                {intl.formatMessage({ id: 'components.interactiveQuestionCard.tool' })}
              </Text>
              <Text code>{config.toolName || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">
                {intl.formatMessage({ id: 'components.interactiveQuestionCard.riskLevel' })}
              </Text>
              <span className={`iq-card-risk iq-card-risk-${config.riskLevel || 'low'}`}>
                {riskLabelMap[config.riskLevel || 'low'] || config.riskLevel}
              </span>
            </div>
            {config.riskReason && (
              <div>
                <Text type="secondary">
                  {intl.formatMessage({ id: 'components.interactiveQuestionCard.riskReason' })}
                </Text>
                <Text>{config.riskReason}</Text>
              </div>
            )}
          </div>
          <div className="iq-card-confirm-layout-arguments">
            <Text type="secondary">
              {intl.formatMessage({ id: 'components.interactiveQuestionCard.arguments' })}
            </Text>
            <pre>{JSON.stringify(config.arguments || {}, null, 2)}</pre>
          </div>
        </>
      )}
      {!disabled && isPlanApproval && (
        <div className="iq-card-confirm">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => submit({ confirmed: true })}
            className="iq-card-confirm-btn"
          >
            {intl.formatMessage({ id: 'components.interactiveQuestionCard.planApprove' })}
          </Button>
        </div>
      )}
      {!disabled && !isPlanApproval &&
        (approvalQuestion.type === 'confirm' ? (
          <div className="iq-card-confirm">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => submit({ confirmed: true })}
              className="iq-card-confirm-btn"
            >
              {approvalQuestion.confirmText ||
                intl.formatMessage({ id: 'components.interactiveQuestionCard.confirm' })}
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => submit({ confirmed: false })}
              className="iq-card-confirm-btn"
            >
              {approvalQuestion.cancelText ||
                intl.formatMessage({ id: 'components.interactiveQuestionCard.cancel' })}
            </Button>
          </div>
        ) : (
          <>
            <SingleChoiceQuestion
              config={approvalQuestion}
              customInputPlaceholder={intl.formatMessage({
                id: 'components.interactiveQuestionCard.customInputPlaceholder',
              })}
              disabled={disabled}
              value={selected}
              onChange={(value) => {
                setSelected(value);
                setCustomValue('');
              }}
              customValue={customValue}
              onCustomChange={(value) => {
                setCustomValue(value);
                if (value) setSelected(approvalQuestion.multiple ? [] : '');
              }}
            />
            <Button
              type="primary"
              className="iq-card-submit-btn"
              disabled={
                !isAnswerFilled(getChoiceAnswer(selected, customValue, approvalQuestion.multiple))
              }
              onClick={() =>
                submit(getChoiceAnswer(selected, customValue, approvalQuestion.multiple))
              }
            >
              {intl.formatMessage({ id: 'components.interactiveQuestionCard.confirm' })}
            </Button>
          </>
        ))}
      {statusInfo && (
        <Text className={`iq-card-status ${statusInfo.className}`}>{statusInfo.text}</Text>
      )}
    </div>
  );
};

const InteractiveQuestionCard: React.FC<InteractiveQuestionCardProps> = ({
  questionConfig,
  content,
  status = 'pending',
  answer: externalAnswer,
  onSubmit,
}) => {
  const intl = useIntl();
  const statusLabelMap: Record<string, { text: string; className: string }> = {
    answered: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.answered' }),
      className: 'iq-card-status-answered',
    },
    cancelled: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.cancelled' }),
      className: 'iq-card-status-cancelled',
    },
    expired: {
      text: intl.formatMessage({ id: 'components.interactiveQuestionCard.status.expired' }),
      className: 'iq-card-status-expired',
    },
  };
  const config = useMemo(() => parseQuestionConfig(questionConfig), [questionConfig]);
  const disabled = status !== 'pending';
  const isGroup = config.type === 'group';
  const groupConfig = isGroup ? (config as GroupQuestionConfig) : undefined;

  // ─── 单问题模式 ───────────────────────────────────────────────────────
  if (!isGroup) {
    const qConfig = config as QuestionItemConfig;
    const historyAnswer = getQuestionAnswer(qConfig.id, qConfig);
    const hasHistory =
      !!historyAnswer && (status === 'answered' || status === 'cancelled' || status === 'expired');

    const [internalAnswers, setInternalAnswers] = useState<Record<string, AskUserAnswer>>({});
    const [customValue, setCustomValue] = useState('');
    const currentAnswers = externalAnswer || internalAnswers;
    const currentAnswer = hasHistory ? toAskUserAnswer(historyAnswer!) : currentAnswers[qConfig.id];
    const choiceValue =
      currentAnswer && 'selected' in currentAnswer
        ? currentAnswer.selected
        : qConfig.type === 'choice' && qConfig.multiple
          ? []
          : '';
    const submittedAnswer =
      qConfig.type === 'choice'
        ? getChoiceAnswer(choiceValue, customValue, qConfig.multiple)
        : currentAnswer;
    const filled = isAnswerFilled(submittedAnswer);

    const className = [
      'iq-card',
      `iq-card-${qConfig.type}`,
      disabled && status !== 'submitting' ? `iq-card-${status}` : undefined,
      status === 'submitting' ? 'iq-card-submitting' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    const statusInfo = statusLabelMap[status];

    const handleSingleSubmit = useCallback(() => {
      if (!filled) return;
      onSubmit?.({ ...currentAnswers, [qConfig.id]: submittedAnswer! });
    }, [onSubmit, currentAnswers, filled, qConfig.id, submittedAnswer]);

    const handleAnswerChange = useCallback(
      (submittedAnswer: AskUserAnswer) => {
        setInternalAnswers((prev) => ({ ...prev, [qConfig.id]: submittedAnswer }));
      },
      [qConfig.id],
    );

    return (
      <div className={className}>
        <div className="iq-card-header">
          <span className="iq-card-type-badge">
            {qConfig.type === 'choice'
              ? intl.formatMessage({ id: 'components.interactiveQuestionCard.choice' })
              : intl.formatMessage({ id: 'components.interactiveQuestionCard.confirm' })}
          </span>
          {!hasHistory && (
            <span className="iq-card-required-tag">
              {intl.formatMessage({ id: 'components.interactiveQuestionCard.required' })}
            </span>
          )}
        </div>
        <div className="iq-card-question">{qConfig.question}</div>

        {hasHistory ? (
          <AnswerSummary question={qConfig} groupConfig={groupConfig} />
        ) : (
          <>
            {qConfig.type === 'choice' ? (
              <SingleChoiceQuestion
                config={qConfig}
                customInputPlaceholder={intl.formatMessage({
                  id: 'components.interactiveQuestionCard.customInputPlaceholder',
                })}
                disabled={disabled}
                value={choiceValue}
                onChange={(val) => {
                  handleAnswerChange({ selected: val });
                  setCustomValue('');
                }}
                customValue={customValue}
                onCustomChange={(value) => {
                  setCustomValue(value);
                  if (value) handleAnswerChange({ selected: qConfig.multiple ? [] : '' });
                }}
              />
            ) : (
              <SingleConfirmQuestion
                config={qConfig}
                confirmLabel={intl.formatMessage({
                  id: 'components.interactiveQuestionCard.confirm',
                })}
                cancelLabel={intl.formatMessage({
                  id: 'components.interactiveQuestionCard.cancel',
                })}
                disabled={disabled}
                value={
                  currentAnswer && 'confirmed' in currentAnswer ? currentAnswer.confirmed : null
                }
                onChange={(val) => handleAnswerChange({ confirmed: val })}
              />
            )}
            <Button
              type="primary"
              onClick={handleSingleSubmit}
              disabled={!filled}
              className="iq-card-submit-btn"
            >
              {intl.formatMessage({ id: 'components.interactiveQuestionCard.submit' })}
            </Button>
          </>
        )}

        {statusInfo && (
          <Text className={`iq-card-status ${statusInfo.className}`}>{statusInfo.text}</Text>
        )}
      </div>
    );
  }

  if (groupConfig?.layout === 'confirm') {
    return (
      <ConfirmLayout config={groupConfig} disabled={disabled} status={status} onSubmit={onSubmit} />
    );
  }

  // ─── Group（Tabs）模式 ────────────────────────────────────────────────
  const [internalAnswers, setInternalAnswers] = useState<Record<string, AskUserAnswer>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [activeTabKey, setActiveTabKey] = useState<string>(config.questions[0]?.id || '0');

  // 构建每道题的答案：优先 history → external → internal
  const resolvedAnswers = useMemo(() => {
    const map: Record<string, { source: 'history' | 'interactive'; answer: AskUserAnswer }> = {};
    for (const q of config.questions) {
      const historyAnswer = getQuestionAnswer(q.id, q, groupConfig);
      if (
        historyAnswer &&
        (status === 'answered' || status === 'cancelled' || status === 'expired')
      ) {
        const ask = toAskUserAnswer(historyAnswer);
        if (ask) {
          map[q.id] = { source: 'history', answer: ask };
          continue;
        }
      }
      if (externalAnswer?.[q.id]) {
        map[q.id] = { source: 'interactive', answer: externalAnswer[q.id] };
        continue;
      }
      if (internalAnswers[q.id]) {
        map[q.id] = { source: 'interactive', answer: internalAnswers[q.id] };
      }
    }
    return map;
  }, [config.questions, groupConfig, status, externalAnswer, internalAnswers]);

  const handleAnswerChange = useCallback((questionId: string, answer: AskUserAnswer) => {
    setInternalAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleTabChange = useCallback((key: string) => {
    setActiveTabKey(key);
  }, []);

  const allFilled = useMemo(
    () =>
      config.questions.every((q) => {
        const r = resolvedAnswers[q.id];
        if (q.type === 'choice') {
          const value =
            r?.answer && 'selected' in r.answer ? r.answer.selected : q.multiple ? [] : '';
          return isAnswerFilled(getChoiceAnswer(value, customValues[q.id] || '', q.multiple));
        }
        return r && isAnswerFilled(r.answer);
      }),
    [config.questions, customValues, resolvedAnswers],
  );

  const answeredCount = useMemo(
    () =>
      config.questions.filter((q) => {
        const r = resolvedAnswers[q.id];
        if (q.type === 'choice') {
          const value =
            r?.answer && 'selected' in r.answer ? r.answer.selected : q.multiple ? [] : '';
          return isAnswerFilled(getChoiceAnswer(value, customValues[q.id] || '', q.multiple));
        }
        return !!r;
      }).length,
    [config.questions, customValues, resolvedAnswers],
  );

  const handleSubmit = useCallback(() => {
    if (!allFilled) return;
    const result: Record<string, AskUserAnswer> = {};
    for (const q of config.questions) {
      const r = resolvedAnswers[q.id];
      if (q.type === 'choice') {
        const value =
          r?.answer && 'selected' in r.answer ? r.answer.selected : q.multiple ? [] : '';
        result[q.id] = getChoiceAnswer(value, customValues[q.id] || '', q.multiple);
      } else if (r) {
        result[q.id] = r.answer;
      }
    }
    onSubmit?.(result);
  }, [onSubmit, config.questions, customValues, resolvedAnswers, allFilled]);

  const className = [
    'iq-card',
    'iq-card-group',
    disabled && status !== 'submitting' ? `iq-card-${status}` : undefined,
    status === 'submitting' ? 'iq-card-submitting' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const statusInfo = statusLabelMap[status];
  const isAllHistory = status === 'answered' || status === 'cancelled' || status === 'expired';

  const tabItems = config.questions.map((q, index) => {
    const resolved = resolvedAnswers[q.id];
    const filled = !!resolved;
    const isHistory = resolved?.source === 'history';

    const renderControl = () => {
      // 历史已回答 → 只读摘要
      if (isHistory) {
        return <AnswerSummary question={q} groupConfig={groupConfig} />;
      }

      // 交互态
      const askAnswer = resolved?.answer;
      if (q.type === 'choice') {
        const value =
          askAnswer && 'selected' in askAnswer ? askAnswer.selected : q.multiple ? [] : '';
        return (
          <SingleChoiceQuestion
            config={q}
            customInputPlaceholder={intl.formatMessage({
              id: 'components.interactiveQuestionCard.customInputPlaceholder',
            })}
            disabled={disabled}
            value={value}
            onChange={(val) => {
              handleAnswerChange(q.id, { selected: val });
              setCustomValues((prev) => ({ ...prev, [q.id]: '' }));
            }}
            customValue={customValues[q.id] || ''}
            onCustomChange={(value) => {
              setCustomValues((prev) => ({ ...prev, [q.id]: value }));
              if (value) handleAnswerChange(q.id, { selected: q.multiple ? [] : '' });
            }}
          />
        );
      }
      if (q.type === 'confirm') {
        const value = askAnswer && 'confirmed' in askAnswer ? askAnswer.confirmed : null;
        return (
          <SingleConfirmQuestion
            config={q}
            confirmLabel={intl.formatMessage({ id: 'components.interactiveQuestionCard.confirm' })}
            cancelLabel={intl.formatMessage({ id: 'components.interactiveQuestionCard.cancel' })}
            disabled={disabled}
            value={value}
            onChange={(val) => handleAnswerChange(q.id, { confirmed: val })}
          />
        );
      }
      return null;
    };

    return {
      key: q.id || `tab-${index}`,
      label: (
        <span className="iq-card-tab-label">
          <span className={`iq-card-tab-num ${filled ? 'iq-card-tab-num-done' : ''}`}>
            {filled ? <CheckOutlined /> : index + 1}
          </span>
          {intl.formatMessage(
            { id: 'components.interactiveQuestionCard.questionNumber' },
            { count: index + 1 },
          )}
        </span>
      ),
      children: (
        <div className="iq-card-tab-content">
          <div className="iq-card-question">
            <span className="iq-card-question-index">
              {intl.formatMessage(
                { id: 'components.interactiveQuestionCard.questionPrefix' },
                { number: index + 1 },
              )}
            </span>
            {q.question}
          </div>
          {renderControl()}
        </div>
      ),
    };
  });

  return (
    <div className={className}>
      <div className="iq-card-header">
        <span className="iq-card-type-badge iq-card-type-badge-group">
          {intl.formatMessage({ id: 'components.interactiveQuestionCard.multipleQuestions' })}
        </span>
        {!isAllHistory && (
          <span className="iq-card-required-tag">
            {intl.formatMessage({ id: 'components.interactiveQuestionCard.required' })}
          </span>
        )}
      </div>

      <div className="iq-card-progress">
        <div className="iq-card-progress-bar">
          <div
            className="iq-card-progress-fill"
            style={{ width: `${(answeredCount / config.questions.length) * 100}%` }}
          />
        </div>
        <Text className="iq-card-progress-text">
          {answeredCount}/{config.questions.length}
        </Text>
      </div>

      <Tabs
        activeKey={activeTabKey}
        onChange={handleTabChange}
        items={tabItems}
        className="iq-card-tabs"
      />

      {!isAllHistory && (
        <Button
          type="primary"
          onClick={handleSubmit}
          disabled={!allFilled || disabled}
          className="iq-card-submit-btn"
          icon={allFilled ? <CheckOutlined /> : undefined}
        >
          {allFilled
            ? intl.formatMessage({ id: 'components.interactiveQuestionCard.confirmSubmit' })
            : intl.formatMessage(
                { id: 'components.interactiveQuestionCard.remainingQuestions' },
                { count: config.questions.length - answeredCount },
              )}
        </Button>
      )}

      {statusInfo && (
        <Text className={`iq-card-status ${statusInfo.className}`}>{statusInfo.text}</Text>
      )}
    </div>
  );
};

export default InteractiveQuestionCard;
