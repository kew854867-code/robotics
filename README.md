# Robot Content Intelligence & Repurposing Platform

This repository contains a sanitized handoff of the robotics content automation workflow. It includes the n8n workflow logic, DeepSeek prompts, Supabase schema, JavaScript parsing tests, and read-only audit reports.

## Security

All API keys, OAuth tokens, service-role secrets, and credential values are intentionally excluded. Configure credentials inside n8n; do not place them in workflow exports or source files.

## Current workflow scope

The active workflow discovers YouTube robotics topics, merges metrics, performs DeepSeek analysis, verifies official sources, selects official visual assets, writes to Supabase, applies the manual approval gate, and prepares the X image-post payload. The final X publishing node must only run after explicit approval.

## Review entry points

- `n8n/current_active_workflow_sanitized.json`: current workflow logic and connections without secret values.
- `docs/current_main_workflow_regression_audit.md`: latest read-only regression audit.
- `docs/n8n_webhook_audit_report.md`: historical Webhook #180/#181 audit; historical executions were not modified.
- `prompts/`: DeepSeek prompt material.
- `supabase/`: schema reference.
- `tests/`: local parser and merge tests.
