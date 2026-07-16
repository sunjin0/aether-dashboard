# Model Provider Text Inputs Design

## Scope

Update `src/pages/agent/model-provider/ModelProviderForm.tsx` so provider names and default model names are entered freely rather than selected from dictionary-backed lists.

## Form Changes

- Replace the `name` (`供应商名称`) `ProFormSelect` with a required `ProFormText`.
- Replace the `defaultModel` (`默认模型`) `ProFormSelect` with a required `ProFormText`.
- Preserve field names, labels, required validation, and submitted payload structure.
- Apply the change consistently for both create and edit flows.

## Removed Behavior

- Remove the supplier-name watcher and all default-model option/loading state.
- Remove dictionary option requests for provider names and provider-specific default models.
- Remove the clearing and disabled-state behavior that existed for the dependent default-model select.

## Non-Goals

- Do not change the provider type or status dropdowns.
- Do not change the model-provider list page, including its existing provider-name filter.
- Do not change service APIs or entity definitions.

## Verification

Run TypeScript checking and any focused tests relevant to the form or model-provider service. Confirm the resulting diff only affects the intended form behavior and specification.
