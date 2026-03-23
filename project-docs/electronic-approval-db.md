# Electronic Approval DB

## Added account fields

- `department`: department or team name
- `position`: organization position label
- `job_title`: display title for approval documents
- `manager_id`: self-reference to the direct manager account
- `can_approve`: whether the account can appear in an approval step
- `approval_limit`: optional amount limit for future approval rules

## Added document fields

- `approval_title`: title shown in approval inboxes
- `approval_status`: one of `draft`, `pending`, `in_review`, `approved`, `rejected`, `cancelled`
- `approval_requested_at`: submission timestamp
- `approval_completed_at`: final approval timestamp
- `approval_current_step`: current approval order

## New tables

### `approvals`

Common approval request header table. Uses `target_type` and `target_id` so any menu can connect to the same approval engine.

### `approval_steps`

Ordered approval line rows. Stores approver snapshot, step type, result status, action timestamp, and comment.

### `approval_events`

Common timeline/audit log for submit, approve, reject, recall, cancel, comment, skip, and resubmit events.

## Target model

- `target_type`: which feature owns the approval item, for example `document`, `expense`, `leave`, `purchase`
- `target_id`: the row id from that feature table, stored as text for cross-module compatibility

`documents` remains the first connected module, but the approval engine is no longer tied only to documents.

## Apply order

### Existing database

Run:

```sql
\i project-docs/sql/sql_history/20260324_electronic_approval_base.sql
\i project-docs/sql/91_approval_policies.sql
```

### Fresh database setup

Run the existing setup files, then additionally run:

```sql
\i project-docs/sql/06_approvals.sql
\i project-docs/sql/91_approval_policies.sql
```

## Notes

- This schema intentionally separates document business status from approval workflow status.
- Only one active approval request is allowed per `(target_type, target_id)` at a time.
- The current RLS policy remains open to `anon` to match the rest of the project; tighten this before production rollout.
