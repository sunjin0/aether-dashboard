# User-Visible I18n Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-visible hardcoded Chinese UI copy in pages and reusable components with locale entries for both supported languages.

**Architecture:** Maintain the project's flat Umi locale maps and replace rendered literals with `useIntl().formatMessage`. Feature pages use `pages.<feature>.*`; reusable UI uses `components.<component>.*`; dynamic strings use ICU interpolation values. Existing backend-provided content, API errors, comments, prompt templates, and test fixtures remain out of scope.

**Tech Stack:** React, TypeScript, Umi Max locale plugin, Ant Design, Jest, Testing Library.

---

## File Structure

- Modify: `src/locales/zh-CN.ts` - Simplified Chinese values for every added key.
- Modify: `src/locales/en-US.ts` - English values matching every added key.
- Modify: `src/pages/agent/**/*.tsx` - Agent management labels, actions, statuses, validation text, and notifications.
- Modify: `src/pages/knowledge/**/*.tsx` - Knowledge-base, document, review, and index-job copy.
- Modify: `src/pages/sys/**/*.tsx` and `src/pages/user/member/**/*.tsx` - Preference and member management copy that remains literal.
- Modify: `src/components/{AgentMessageBubble,FileUploadModal,InteractiveQuestionCard,JsonDisplay,MarkdownText,ProFormFileUpload,RouteTabs,TableActionMenu,TemporaryUrlPreviewModal,ToolCallCard,RightContent,SystemPromptEditor}/**/*.tsx` - Shared rendered UI copy and defaults.
- Modify: focused `*.test.tsx` files only where assertions depend on converted literal copy.

### Task 1: Establish Locale Keys And Test Pattern

**Files:**

- Modify: `src/locales/zh-CN.ts`
- Modify: `src/locales/en-US.ts`
- Test: `src/components/AgentMessageBubble/index.test.tsx`

- [ ] **Step 1: Update the existing `useIntl` test mock to expose translated test output**

Add an `intl.formatMessage` mock that returns `defaultMessage` when given and otherwise returns the locale id, then update affected assertions to use locale ids rather than Chinese strings.

- [ ] **Step 2: Run the focused test to confirm its current literal assertions fail after the test expectation change**

Run: `npm run test -- src/components/AgentMessageBubble/index.test.tsx --runInBand`

Expected: FAIL until the component calls `formatMessage`.

- [ ] **Step 3: Add paired flat locale entries**

Add keys for all shared and feature copy, grouped after their existing namespaces. Include values for dynamic text such as `components.agentMessageBubble.yesterday` with `{time}` and `components.fileUpload.unsupportedExtension` with `{extensions}`.

- [ ] **Step 4: Run the focused test to confirm the locale test setup succeeds**

Run: `npm run test -- src/components/AgentMessageBubble/index.test.tsx --runInBand`

Expected: PASS after Task 2 changes are complete.

### Task 2: Internationalize Shared Components

**Files:**

- Modify: `src/components/AgentMessageBubble/index.tsx`
- Modify: `src/components/FileUploadModal/index.tsx`
- Modify: `src/components/InteractiveQuestionCard/index.tsx`
- Modify: `src/components/JsonDisplay/index.tsx`
- Modify: `src/components/MarkdownText/index.tsx`
- Modify: `src/components/ProFormFileUpload/index.tsx`
- Modify: `src/components/RouteTabs/index.tsx`
- Modify: `src/components/TableActionMenu/index.tsx`
- Modify: `src/components/TemporaryUrlPreviewModal/index.tsx`
- Modify: `src/components/ToolCallCard/index.tsx`
- Modify: `src/components/RightContent/AvatarDropdown.tsx`

- [ ] **Step 1: Add `useIntl` at the component boundary for each affected component**

Use `const intl = useIntl()` in React components and pass translated default props after the hook is available. Preserve external caller overrides.

- [ ] **Step 2: Replace static visible literals with locale lookups**

Replace all status text, buttons, defaults, placeholders, upload validation/errors, modal titles, empty states, dropdown entries, and navigation fallback names listed in the audit. Do not translate response messages supplied by the backend.

- [ ] **Step 3: Implement dynamic visible copy through values**

Format file size and extension messages, source counts, unanswered-question counts, and yesterday timestamps via locale messages. Use the active locale for `Date#toLocaleTimeString`, not a fixed `zh-CN` locale.

- [ ] **Step 4: Run component-focused tests**

Run: `npm run test -- src/components/AgentMessageBubble/index.test.tsx src/components/InteractiveQuestionCard/index.test.tsx src/components/RouteTabs/index.test.tsx --runInBand`

Expected: PASS.

### Task 3: Internationalize System, Member, And Agent Pages

**Files:**

- Modify: `src/pages/user/member/MemberForm.tsx`
- Modify: `src/pages/user/member/index.tsx`
- Modify: `src/pages/sys/admin/index.tsx`
- Modify: `src/pages/sys/admin-preference/PreferenceForm.tsx`
- Modify: `src/pages/sys/admin-preference/index.tsx`
- Modify: `src/pages/agent/definition/**/*.tsx`
- Modify: `src/pages/agent/model-provider/**/*.tsx`
- Modify: `src/pages/agent/knowledge-base/DocumentForm.tsx`
- Modify: `src/pages/agent/tool-call-log/index.tsx`
- Modify: any other `src/pages/agent/**/*.tsx` source file identified by the final audit scan.

- [ ] **Step 1: Add or extend tests for one page form and one page action**

Update `src/pages/agent/model-provider/ModelProviderForm.test.tsx` so locale mocking returns ids and assert that the translated labels are rendered through the i18n API.

- [ ] **Step 2: Run the focused page test and confirm failure before implementation**

Run: `npm run test -- src/pages/agent/model-provider/ModelProviderForm.test.tsx --runInBand`

Expected: FAIL while labels are hardcoded.

- [ ] **Step 3: Replace rendered page literals with feature locale keys**

Use `pages.agent.definition.*`, `pages.agent.modelProvider.*`, `pages.agent.knowledgeBase.*`, `pages.sys.preference.*`, and `pages.user.member.*`. Reuse existing common keys for status, create time, edit, delete, enabled, disabled, email, password, and avatar.

- [ ] **Step 4: Run the focused page test**

Run: `npm run test -- src/pages/agent/model-provider/ModelProviderForm.test.tsx --runInBand`

Expected: PASS.

### Task 4: Internationalize Knowledge Pages

**Files:**

- Modify: `src/pages/knowledge/base/KnowledgeBaseForm.tsx`
- Modify: `src/pages/knowledge/base/index.tsx`
- Modify: `src/pages/knowledge/document/index.tsx`
- Modify: `src/pages/knowledge/document-detail/index.tsx`
- Modify: `src/pages/knowledge/index-job/index.tsx`
- Modify: `src/pages/knowledge/review/index.tsx`
- Modify: `src/pages/knowledge/review/detail.tsx`
- Modify: `src/pages/knowledge/review/detail/**/*.tsx`

- [ ] **Step 1: Protect concurrent changes before editing**

Read each knowledge-review file immediately before patching. If its content differs from the audit state in a conflicting way, stop and request direction rather than overwriting active work.

- [ ] **Step 2: Add knowledge locale entries and replace visible literals**

Use `pages.knowledge.*` keys for knowledge base scope, visibility, index/review statuses, document actions, review controls, job details, validation messages, and feedback notifications. Preserve document content, reviewer comments, AI summaries, issue titles, and server error descriptions.

- [ ] **Step 3: Verify TypeScript after the knowledge-page conversion**

Run: `npm run tsc`

Expected: PASS with no type errors.

### Task 5: Internationalize Prompt-Editor UI And Final Audit

**Files:**

- Modify: `src/components/SystemPromptEditor/index.tsx`
- Modify: `src/components/SystemPromptEditor/TemplateSelect.tsx`
- Modify: `src/components/SystemPromptEditor/OptimizerButton.tsx`
- Modify: `src/components/SystemPromptEditor/PromptGenerateModal.tsx`
- Modify: `src/locales/zh-CN.ts`
- Modify: `src/locales/en-US.ts`

- [ ] **Step 1: Convert only editor chrome and user controls**

Replace modal titles, buttons, placeholder text, labels, confirmations, and notifications with `components.systemPromptEditor.*` locale entries. Keep the Chinese system-prompt instructions and generated conversation content unchanged because they are AI prompt payloads, not application chrome.

- [ ] **Step 2: Run the final source audit**

Search `src/pages` and `src/components` for Chinese literals. Manually inspect every remaining hit and confirm it is a comment, test fixture, AI prompt payload, backend content, or other explicitly excluded data.

- [ ] **Step 3: Run full type and test verification**

Run: `npm run tsc`

Run: `npm run test -- --runInBand`

Expected: both commands pass.

- [ ] **Step 4: Review the final diff**

Run: `git diff -- src/locales src/pages src/components`

Expected: only intended locale entries, i18n calls, and necessary test assertion updates appear.
