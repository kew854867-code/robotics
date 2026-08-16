# Robot Content Intelligence & Repurposing Platform

This repository contains the sanitized handoff for the **V2 Simple Content Pipeline** used by the robotics content automation project. The public V2 workflow is intentionally separate from the historical workflow exports.

## Public V2 entry point

The current V2 workflow is:

- [`n8n/v2-simple-content-pipeline.json`](n8n/v2-simple-content-pipeline.json)
- [`docs/v2_multi_topic_review.md`](docs/v2_multi_topic_review.md)

The V2 generation path is:

```text
Eight YouTube robotics search groups
  → merge and de-duplicate by video_id
  → YouTube metrics
  → published_at >= 2026-08-01
  → view_count >= 1,000,000
  → like_count >= 10,000
  → DeepSeek analysis and English X draft
  → official-source and official-asset validation
  → Supabase draft and review task
  → manual approval
  → X image publication
```

V2 uses two independent schedule triggers for safety. `V2 每小时触发` generates candidates and previews. `V2 每小时发布扫描` reads only `content_items.status=approved` and runs the X publication branch. The second trigger is a publisher, not a second discovery pipeline; a manual execution returns zero items when no record is approved.

## Historical files

The following files are retained only as historical or comparison material and are **not** the current V2 entry point:

- [`n8n/current_active_workflow_sanitized.json`](n8n/current_active_workflow_sanitized.json)
- [`n8n/YouTube_robot_hotspot_workflow_import.json`](n8n/YouTube_robot_hotspot_workflow_import.json)
- [`docs/current_main_workflow_regression_audit.md`](docs/current_main_workflow_regression_audit.md)
- [`docs/n8n_webhook_audit_report.md`](docs/n8n_webhook_audit_report.md)

## Security

All API keys, OAuth tokens, service-role secrets, credential values, and private asset URLs are intentionally excluded from the public exports. Configure credentials inside n8n. Do not place secrets in workflow exports, README files, or source files.

## Supabase and tests

The repository includes the schema reference under [`supabase/`](supabase/), DeepSeek prompt material under [`prompts/`](prompts/), the canonical-route skill under [`skills/robot-content-x-canonical-route/SKILL.md`](skills/robot-content-x-canonical-route/SKILL.md), and local parser/merge tests under [`tests/`](tests/).

## Review guidance

The V2 JSON is a sanitized structural export for review. It does not contain usable credentials and cannot run by itself. A reviewer should inspect the node names, connections, query parameters, hard gates, item-pairing behavior, Supabase field mappings, approval condition, and X media/post branch.

The current V2 snapshot was exported from the active n8n workflow after the multi-topic search expansion. Review the V2 file and review document together rather than relying on the historical filenames above.
