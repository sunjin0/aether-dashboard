# Admin Preference Service Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the AdminPreference service layer to support structured preference fields and add feedback/override API functions.

**Architecture:** Replace the simple `category+content` model with structured fields (keyName, value, description, priority, scope, decay) and add three new API endpoints for feedback and override operations.

**Tech Stack:** TypeScript, React, Ant Design Pro, @umijs/max

---

### Task 1: Update Service Layer Types and API Functions

**Files:**

- Modify: `src/services/sys/AdminPreferenceController.ts:1-51`

- [ ] **Step 1: Update the AdminPreference interface**

Replace the entire interface block (lines 4-15) with the new structured fields:

```typescript
export interface AdminPreference {
  id?: string;
  adminId?: string;
  category?: string;
  keyName?: string;
  value?: string;
  description?: string;
  priority?: number;
  scope?: string;
  scopeDetail?: string;
  source?: string;
  confidence?: number;
  usageCount?: number;
  lastUsedAt?: number;
  expiresAt?: number;
  decayRate?: number;
  effectiveScore?: number;
  status?: number;
  createdAt?: number;
  updatedAt?: number;
}
```

- [ ] **Step 2: Update AdminPreferenceSearchParams**

Replace the search params interface (lines 17-20):

```typescript
export interface AdminPreferenceSearchParams {
  current?: number;
  pageSize?: number;
  category?: string;
  keyName?: string;
  value?: string;
  status?: number;
}
```

- [ ] **Step 3: Add new API functions for feedback and override**

Append after the `updateAdminPreferenceStatus` function (after line 51):

```typescript
export const confirmAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/feedback`, { method: 'POST' });

export const rejectAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/feedback`, { method: 'DELETE' });

export const overrideAdminPreference = async (
  id: string,
  params: { value: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/override`, { method: 'PUT', data: params });
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit src/services/sys/AdminPreferenceController.ts` Expected: No errors

## Self-Review Checklist

- [ ] Did I replace the AdminPreference interface with all new fields?
- [ ] Did I replace AdminPreferenceSearchParams with a standalone interface (not extending AdminPreference)?
- [ ] Did I add the 3 new API functions (confirm, reject, override)?
- [ ] Are the API function signatures correct (POST for confirm, DELETE for reject, PUT for override)?
- [ ] Does the file still compile?
