---
name: robot-content-x-canonical-route
description: Execute the single canonical robotics-content-to-X workflow. Use when discovering a robotics hotspot, collecting YouTube metrics, analyzing with DeepSeek, verifying official assets, writing Supabase, generating an English image-post preview, obtaining human confirmation, and publishing through n8n.
---

# Robot Content → English X Post: Canonical Route

Use this skill for the one standard route only. Do not create temporary Webhooks, side workflows, direct posting scripts, or alternate branches. The workflow must automatically generate the complete English post and image preview first; human confirmation controls only the final X publishing action.

## Canonical sequence

```text
Every-hour trigger
→ YouTube Search API
→ YouTube videos.list metrics API
→ Code: merge by video_id
→ DeepSeek business/hotspot analysis
→ Code: parse and validate JSON
→ Hotspot selection
→ Official website/news verification
→ Official subject-matched image selection
→ English X copy generation
→ English image-title overlay/rendering
→ Immutable text-image binding
→ Supabase draft + preview write
→ User reviews the complete preview
→ User confirms exactly one content_id
→ Set that record to status=approved
→ Main workflow approved scan
→ Prepare X publish payload
→ Download official image
→ X OAuth 1.0a media upload
→ X post creation
→ Read back tweet_id and media_id
```

If any step fails, stop and report the exact node, input shape, output shape, and error. Do not silently switch to another route.

## Interface and credential map

| Stage | Interface/source | n8n node or action | Main input | Main output |
|---|---|---|---|---|
| Discovery | Google YouTube Data API v3 `GET https://www.googleapis.com/youtube/v3/search` | `搜索YouTube` | `part=snippet`, `q`, `type=video`, `maxResults`, `order`, API key | `items[].id.videoId`, `items[].snippet.title`, description, channel, publish time, thumbnails |
| Engagement | Google YouTube Data API v3 `GET https://www.googleapis.com/youtube/v3/videos` | `YouTube视频统计` | `part=snippet,statistics`, comma-separated `id` from search results | `items[].id`, `statistics.viewCount`, `likeCount`, `commentCount`, optional favorite count |
| AI analysis | DeepSeek OpenAI-compatible API `POST https://api.deepseek.com/chat/completions` | `DeepSeek商业分析` and/or `DeepSeek热点总结` | system prompt plus normalized video row; `Authorization: Bearer <DEEPSEEK_API_KEY>` | `choices[0].message.content`, strict JSON with business value, confidence, risks, route, and English fields |
| Official verification | Official company website, newsroom, official video page, or official press release | `搜索官网与新闻来源`, `解析官网与新闻候选` | title, company/product, subject, source URL | official source URL/title, candidate image URLs, evidence boundary, rights/source metadata |
| Asset selection | Image URL from the official page; use direct high-resolution image or official video poster | `解析官方图片资产` | official candidates plus subject/title | `official_image_url`, binding fields, subject-match result, overlay metadata |
| Persistence | Supabase PostgREST/Data API through the existing n8n Supabase credential | `写入Supabase`, `准备内容最终回写` | normalized content row and preview metadata | `content_items` row with stable `content_id` and preview fields |
| Preview | Existing n8n code/image preparation path | `准备X发布内容` before final gate | approved-ready draft, English copy, official image, binding key | final preview payload; must pass validation before user confirmation |
| Media upload | X legacy media endpoint `POST https://upload.twitter.com/1.1/media/upload.json` | `上传官方图片` | binary image plus OAuth 1.0a credential | `media_id_string` / media ID |
| Post creation | X API posts endpoint, using the current text-post credential | `X发布图片帖子` | exact `x_text_en` plus `media_ids` | `data.id` tweet ID and publish response |
| Audit | X response plus Supabase publication metadata | final readback/logging | content_id, tweet ID, media ID | auditable publication record |

Never place real keys in exported workflow JSON. Select credentials inside n8n after importing the sanitized workflow.

## Step 1 — discover videos

Call YouTube Search with `part=snippet`, `type=video`, a robotics query, `maxResults` no greater than 50, and an appropriate `order` such as `date`, `relevance`, or `viewCount`. Keep the complete search item in `raw_search_item`. Construct a stable identifier as `youtube_<video_id>`.

Do not treat a thumbnail, search rank, or view count as proof of quality. Search results identify candidates; they do not provide the complete engagement record.

## Step 2 — enrich engagement metrics

Pass the search video IDs as a comma-separated `id` parameter to `videos.list`. Request `part=snippet,statistics`. Join the response back to search rows by `video_id`, never by array position, title, or URL text. Preserve missing statistics as null or zero according to the current schema and retain `raw_statistics_item`.

The required normalized metric fields are:

```text
video_id
view_count
like_count
comment_count
favorite_count
published_at
channel_id
thumbnail
```

## Step 3 — analyze with DeepSeek

Use the DeepSeek endpoint `https://api.deepseek.com/chat/completions` with a server-side credential. Prefer `response_format: {"type":"json_object"}` and explicitly instruct the model to output JSON. Parse `choices[0].message.content` defensively: remove Markdown fences, parse JSON, validate required fields, and set `analysis_status=parse_failed` instead of crashing when malformed.

The analysis must separate facts from interpretation and return at least:

```text
content_signal
market_signal
customer_signal
product_signal
technology_signal
competitive_signal
commercial_value
value_chain_impact
summary_en
recommended_route
priority
confidence
risk_flags
uncertainty
```

Do not invent benchmark performance, pricing, customer adoption, ROS compatibility, funding, revenue, or market share.

## Step 4 — verify the official source and choose the image

Use the normalized title, company, model, and subject to locate an official website/newsroom/press-release page. Prefer a direct high-resolution image showing the actual robot or product. Reject generic `og:image` backgrounds, abstract artwork, low-resolution thumbnails, unrelated stock images, and images whose subject cannot be matched.

The selected asset must carry these fields together with the draft:

```text
official_image_url
official_source_url
content_visual_binding_key
image_title_overlay_language
image_title_overlay_status
asset_kind
asset_selection_reason
asset_subject
asset_match_status
```

For an approved visual style such as the confirmed Gemini Robotics 2 image, preserve the exact user-confirmed visual version. Do not substitute another image merely because it is easier to download.

## Step 5 — generate the English X post and preview

The standard English post format is:

1. A direct hook explaining what changed in robotics.
2. Three concrete capabilities or observations.
3. Commercial implications and affected value-chain layers.
4. A clear evidence boundary and caveat.
5. Source link and observed engagement metrics, when available.
6. One closing question and relevant hashtags.

Keep the user's confirmed English copy unchanged when the user says to reuse it. Do not replace it with a Chinese summary. Generate or preserve `x_text_en` and render the English image title before asking for confirmation.

The preview checkpoint must show the exact English text, the exact rendered image, the official source URL, the official image URL, the subject-match result, and the binding key. The preview is generated automatically; no approval is needed to reach it.

Validate before pausing:

```text
x_text_en is non-empty
x_text_en contains no accidental Chinese replacement
official_image_url is non-empty and downloadable
official_source_url is non-empty
content_visual_binding_key is non-empty
asset_match_status == subject_matched
image_title_overlay_language == en
image_title_overlay_status == complete
```

If validation fails, stop before confirmation and repair the producing node.

## Step 6 — confirmation and publication gate

After the preview is ready, ask the user to confirm that exact text-image pair. Only after confirmation update exactly that `content_id` to `status=approved`. Do not approve all rows, infer approval for other content, or use a nonexistent `approval_status` column.

The approved scan must read the same `content_id` and require:

```javascript
row.status === 'approved'
&& !['published', 'posted', 'success'].includes(String(row.x_publish_status || ''))
```

The final gate must not re-generate or replace the copy/image. It must pass through the existing bound values and stop with `content_visual_binding_missing` if the binding key, official image, or official source is absent.

## Step 7 — publish with X

Use the existing n8n X credentials. Upload the official image through the legacy media endpoint with OAuth 1.0a. Use the returned media ID in the X post creation request. Publish exactly `x_text_en`; do not append an unapproved translation, alternate title, or unrelated image.

After success, record and report:

```text
content_id
tweet_id
media_id
official_image_url
official_source_url
x_publish_status
published_at
```

Do not report a successful n8n execution as a successful X post unless the X node returned a tweet ID.

## Data-shape and writeback rules

Ordinary main-chain items use `$json.field`. Only a real Webhook payload may use `$json.body.field`. Do not add a fallback that hides a wrong node shape. For each asset field, preserve the first valid non-empty value from upstream asset data and the existing row; never overwrite valid values with `undefined`, `null`, empty strings, empty arrays, or empty objects.

Use `content_id` as the immutable join key. The minimal writeback asset set is:

```text
content_visual_binding_key
image_title_overlay_language
image_title_overlay_status
asset_kind
asset_selection_reason
asset_subject
asset_match_status
official_image_url
official_source_url
```

## Single-route handoff report

Report only the canonical path: trigger time, selected content_id, interface/node used at each stage, nine asset fields, preview validation, user confirmation, final gate state, media upload response, tweet response, and one exact failing node if applicable. Never include credentials, tokens, or secret values.

## Official references

- [YouTube Search.list](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube Videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [DeepSeek API overview](https://api-docs.deepseek.com/)
- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)
- [Supabase JavaScript update/reference](https://supabase.com/docs/reference/javascript/update)
- [X Developer Platform](https://developer.x.com/en/docs/x-api)
- [X media upload documentation](https://developer.x.com/en/docs/x-api/v1/media/upload-media)
- [X posts API reference](https://developer.x.com/en/docs/x-api/posts)
