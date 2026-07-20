# User-Visible I18n Audit Design

## Goal

Internationalize every hardcoded, user-visible Chinese string in `src/pages` and reusable `src/components` so language switching consistently renders Chinese or English UI copy.

## Scope

Include strings rendered to application users, including page and dialog titles, form labels and validation copy, table column labels, button text, tooltips, placeholders, status text, notifications, empty states, and other visible component copy.

Exclude comments, console/log output, API URLs, technical identifiers, source-code examples, test fixture content, backend-provided values, and service-layer request errors. Existing unrelated knowledge-review changes remain untouched except where a visible literal is converted to i18n as part of this audit.

## Locale Structure

Keep the existing flat, dot-delimited locale objects in `src/locales/zh-CN.ts` and `src/locales/en-US.ts`.

- Add feature-specific keys under the existing `pages.<feature>.*` namespace where available.
- Add new `pages.knowledge.*` keys for knowledge-management UI.
- Add `components.<component-name>.*` keys for copy owned by reusable components.
- Use `pages.common.*` only for messages that are genuinely shared across unrelated pages.
- Add matching keys to both locale files in the same change.
- Use ICU-style parameter placeholders such as `{count}`, `{name}`, and `{status}` for dynamic visible text.

## Component Changes

Use the repository's established Umi locale APIs:

- Add `useIntl()` and call `intl.formatMessage({ id })` for values created in component logic, table-column definitions, notifications, and prop expressions.
- Use `<FormattedMessage id="..." />` for static JSX text when that produces clearer markup.
- Pass interpolation values to `formatMessage` when rendering parameterized copy.
- Replace fixed `zh-CN` time formatting with formatting that follows the active application locale when visible date text is part of the audit.

## Validation

Run a targeted source scan after edits to identify remaining Chinese string literals and manually classify any results that are intentionally excluded. Run TypeScript checking and the focused Jest tests for affected components when available. Do not claim complete coverage for files concurrently being changed unless the final diff is reviewed after the audit.
