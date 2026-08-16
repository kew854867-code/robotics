---
name: robot-content-intelligence-n8n
description: Build, debug, extend, and hand off the robot-content intelligence n8n workflow. Use for YouTube/API collection, videos.list engagement enrichment, DeepSeek scoring and business-value analysis, Code-node merging, content routing, and Supabase schema mapping.
---

# Robot Content Intelligence n8n

Use this skill when working on the robot-content discovery pipeline. The product priority is hotspot discovery and decision quality before media production.

## Core pipeline

Maintain this order unless the user explicitly changes it:

```text
Source APIs → YouTube Search → YouTube videos.list → DeepSeek评分 → Code合并 → DeepSeek热点总结 → 解析 → 热点筛选与内容路由 → Supabase
```

Do not place video generation before hotspot screening. The pipeline must first decide whether an item is relevant, valuable, safe, and worth producing.

## Reusable resources

- Read `scripts/test_code_merge.js` when testing or changing the merge Code node. Run it with `node` before applying equivalent changes to n8n.
- Read `templates/deepseek_business_prompt.md` when writing or improving the DeepSeek analysis node. Preserve strict JSON output and evidence-vs-inference separation.
- Read `references/supabase_schema.sql` when creating or updating Supabase tables. The `content_items` table mirrors the current auto-map payload; the other tables support production, publication, events, and feedback.

## Workflow procedure

1. Read the current n8n workflow and identify node names, IDs, credentials, and connections. Never guess a node name.
2. Confirm YouTube Search returns `items[].id.videoId` and `items[].snippet`.
3. Add or verify `YouTube视频统计` as a GET request to `https://www.googleapis.com/youtube/v3/videos` with `part=snippet,statistics` and a comma-separated `id` expression from Search.
4. Ensure DeepSeek评分 returns one score object per `video_id`, not only one score for the first result.
5. Run the merge Code test fixture. The merge must preserve one output row per Search result even when statistics or scores are missing.
6. Ensure the merged row contains stable identifiers, source metadata, engagement metrics, score fields, and raw JSON payloads.
7. Run DeepSeek热点总结 after merge. Use the business-value prompt template and keep the response as strict JSON.
8. Parse the model response defensively: remove code fences, handle malformed JSON, and mark `analysis_status=parse_failed` instead of crashing.
9. Route only after analysis. Use `keep`, `is_robotics`, relevance threshold, and priority to decide `discard`, `video_remake`, `video_adapt`, `image_remake`, or `text_rewrite`.
10. Map the final item into Supabase `content_items`. Use JSONB columns for arrays, nested engagement, and raw source payloads. Use service-role credentials only on the server-side n8n connection.

## Code merge contract

The merge Code node must output one row per YouTube Search item and include at least:

`content_id`, `platform`, `source`, `source_url`, `video_id`, `title`, `description`, `author`, `channel_id`, `published_at`, `thumbnail`, `language`, `content_type`, `view_count`, `like_count`, `comment_count`, `favorite_count`, `engagement`, `viral_score`, `ai_summary`, `score_source`, `status`, `raw_search_item`, `raw_statistics_item`, and `raw_deepseek_item`.

Use `video_id` as the join key. Do not join by title, URL text, or array position.

## DeepSeek business-value contract

The analysis node must distinguish:

- `content_signal`: likely attention and shareability;
- `market_signal`: evidence of market timing or category movement;
- `customer_signal`: evidence of a buyer problem or demand;
- `product_signal`: product or use-case implications;
- `technology_signal`: technical capability or bottleneck;
- `competitive_signal`: competitor, positioning, or ecosystem implications.

For each dimension require a score, evidence, and implication. Require `who_may_pay`, `value_chain_impact`, `business_questions`, `next_action`, `confidence`, `risk_flags`, and `uncertainty`. Never infer revenue, funding, customers, or market share without evidence.

## Supabase mapping

Use `content_items` as the first persistence target because the current n8n Supabase node uses auto-map input data. Keep `content_events`, `content_production_tasks`, `content_publications`, and `content_metrics` separate so future workflow branches do not overwrite the discovery record.

Before changing the schema, check whether the table already exists. Prefer additive migrations. Do not drop production data. Enable RLS and create explicit policies before browser access; the n8n server-side credential may use service role access.

## Handoff checklist

Before declaring the workflow complete, report:

1. Which source nodes are connected.
2. Whether videos.list returns view, like, and comment counts.
3. Whether Code outputs one row per search result.
4. Whether DeepSeek returns valid JSON and business-value fields.
5. Which routing values are produced.
6. Which Supabase tables and fields receive the output.
7. Which credentials the user must select after importing or cloning the workflow.
