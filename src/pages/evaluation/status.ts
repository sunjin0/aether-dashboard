const statusMessageIds: Record<string, string> = {
  QUEUED: 'pages.agentEvaluation.status.queued',
  CANCELLING: 'pages.agentEvaluation.status.cancelling',
  CANCELLED: 'pages.agentEvaluation.status.cancelled',
  COMPLETED: 'pages.agentEvaluation.status.completed',
  PENDING: 'pages.agentEvaluation.status.pending',
  RUNNING: 'pages.agentEvaluation.status.running',
  SUCCEEDED: 'pages.agentEvaluation.status.succeeded',
  FAILED: 'pages.agentEvaluation.status.failed',
  BLOCKED: 'pages.agentEvaluation.status.blocked',
  TIMED_OUT: 'pages.agentEvaluation.status.timedOut',
  UNKNOWN: 'pages.agentEvaluation.status.unknown',
  NOT_STARTED: 'pages.agentEvaluation.status.notStarted',
  SKIPPED: 'pages.agentEvaluation.status.skipped',
  NOT_REQUIRED: 'pages.agentEvaluation.status.notRequired',
  APPROVED: 'pages.agentEvaluation.status.approved',
  REJECTED: 'pages.agentEvaluation.status.rejected',
  PASS: 'pages.agentEvaluation.status.pass',
  PASSED: 'pages.agentEvaluation.status.pass',
  FAIL: 'pages.agentEvaluation.status.fail',
  INCOMPLETE: 'pages.agentEvaluation.status.incomplete',
};

export const evaluationStatusMessageId = (status?: string) =>
  status ? statusMessageIds[status] || 'pages.agentEvaluation.status.unknown' : 'pages.agentEvaluation.status.unknown';

const errorMessageIds: Record<string, string> = {
  DISPATCH_FAILED: 'pages.agentEvaluation.error.dispatchFailed',
  SNAPSHOT_EXECUTION_UNSUPPORTED: 'pages.agentEvaluation.error.snapshotUnsupported',
  RESULT_NOT_FOUND: 'pages.agentEvaluation.error.resultNotFound',
  CASE_VERSION_NOT_FOUND: 'pages.agentEvaluation.error.caseVersionNotFound',
  NO_BINDINGS: 'pages.agentEvaluation.error.noBindings',
  INVALID_BINDINGS: 'pages.agentEvaluation.error.invalidBindings',
  GRADER_FAILED: 'pages.agentEvaluation.error.graderFailed',
  EVALUATION_TIMEOUT: 'pages.agentEvaluation.error.timeout',
  RULE_PASSED: 'pages.agentEvaluation.score.rulePassed',
  RULE_FAILED: 'pages.agentEvaluation.score.ruleFailed',
  GRADER_ARGUMENT_REQUIRED: 'pages.agentEvaluation.error.graderArgumentRequired',
  GRADER_OPERATOR_UNSUPPORTED: 'pages.agentEvaluation.error.graderOperatorUnsupported',
  GRADER_EXPRESSION_INVALID: 'pages.agentEvaluation.error.graderExpressionInvalid',
  GRADER_JSON_PATH_NOT_FOUND: 'pages.agentEvaluation.error.graderJsonPathNotFound',
  GRADER_SCHEMA_INVALID: 'pages.agentEvaluation.error.graderSchemaInvalid',
  ASSERTION_FAILED: 'pages.agentEvaluation.error.assertionFailed',
  ASSERTION_INVALID: 'pages.agentEvaluation.error.assertionInvalid',
  ASSERTION_EVIDENCE_MISSING: 'pages.agentEvaluation.error.assertionEvidenceMissing',
  GRADER_CONFIG_INVALID: 'pages.agentEvaluation.error.graderConfigInvalid',
  GRADER_MODEL_UNAVAILABLE: 'pages.agentEvaluation.error.graderModelUnavailable',
  GRADER_INPUT_TOO_LARGE: 'pages.agentEvaluation.error.graderInputTooLarge',
  GRADER_RESPONSE_INVALID: 'pages.agentEvaluation.error.graderResponseInvalid',
  GRADER_CALL_FAILED: 'pages.agentEvaluation.error.graderCallFailed',
  GRADER_INTERRUPTED: 'pages.agentEvaluation.error.graderInterrupted',
  EVALUATOR_VERSION_NOT_FOUND: 'pages.agentEvaluation.error.evaluatorVersionNotFound',
  EVALUATOR_KIND_INVALID: 'pages.agentEvaluation.error.evaluatorKindInvalid',
  STANDARD_EVALUATION_UNSUPPORTED: 'pages.agentEvaluation.error.standardAgentUnsupported',
  WORKFLOW_INPUT_INVALID: 'pages.agentEvaluation.error.workflowInputInvalid',
  EXECUTION_UNKNOWN: 'pages.agentEvaluation.error.executionUnknown',
};

export const evaluationErrorMessageId = (code?: string) =>
  code ? errorMessageIds[code] || 'pages.agentEvaluation.error.unknown' : 'pages.agentEvaluation.error.none';

const importErrorMessageIds: Record<string, string> = {
  INVALID_ITEM: 'pages.agentEvaluation.datasets.importError.invalidItem',
  CASE_KEY_OR_INPUT_REQUIRED: 'pages.agentEvaluation.datasets.importError.caseKeyOrInputRequired',
  CASE_KEY_DUPLICATE: 'pages.agentEvaluation.datasets.importError.caseKeyDuplicate',
  PASS_THRESHOLD_INVALID: 'pages.agentEvaluation.datasets.importError.passThresholdInvalid',
};

export const evaluationImportErrorMessageId = (code?: string) =>
  code ? importErrorMessageIds[code] || 'pages.agentEvaluation.datasets.importError.unknown' : 'pages.agentEvaluation.datasets.importError.unknown';
