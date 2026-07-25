export const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  warning: 4,
  info: 5,
}

export const severityColor: Record<string, string> = {
  critical: 'red',
  high: 'volcano',
  medium: 'orange',
  low: 'blue',
  warning: 'gold',
  info: 'default',
}

export const severityLabelKey: Record<string, string> = {
  critical: 'pages.knowledge.review.severity.critical',
  major: 'pages.knowledge.review.severity.high',
  high: 'pages.knowledge.review.severity.high',
  medium: 'pages.knowledge.review.severity.medium',
  minor: 'pages.knowledge.review.severity.low',
  low: 'pages.knowledge.review.severity.low',
  warning: 'pages.knowledge.review.severity.warning',
  info: 'pages.knowledge.review.severity.info',
}

export const issueTypeLabelKey: Record<string, string> = {
  formatting: 'pages.knowledge.review.issueType.formatting',
  readability: 'pages.knowledge.review.issueType.readability',
  content_quality: 'pages.knowledge.review.issueType.contentQuality',
  clarity: 'pages.knowledge.review.issueType.clarity',
  accuracy: 'pages.knowledge.review.issueType.accuracy',
  consistency: 'pages.knowledge.review.issueType.consistency',
  language_consistency: 'pages.knowledge.review.issueType.languageConsistency',
  style: 'pages.knowledge.review.issueType.style',
  grammar: 'pages.knowledge.review.issueType.grammar',
  spelling: 'pages.knowledge.review.issueType.spelling',
  structure: 'pages.knowledge.review.issueType.structure',
  other: 'pages.knowledge.review.issueType.other',
}

export const issueTypeColor: Record<string, string> = {
  formatting: 'purple',
  readability: 'cyan',
  content_quality: 'geekblue',
  clarity: 'blue',
  accuracy: 'red',
  consistency: 'orange',
  language_consistency: 'purple',
  style: 'pink',
  grammar: 'volcano',
  spelling: 'magenta',
  structure: 'lime',
  other: 'default',
}

export const patchOperationLabelKey: Record<string, string> = {
  replace: 'pages.knowledge.review.patchOperation.replace',
  delete: 'pages.knowledge.review.patchOperation.delete',
  insert_before: 'pages.knowledge.review.patchOperation.insertBefore',
  insert_after: 'pages.knowledge.review.patchOperation.insertAfter',
  set_heading: 'pages.knowledge.review.patchOperation.setHeading',
}
