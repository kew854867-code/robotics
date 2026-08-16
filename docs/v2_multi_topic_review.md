# V2 Multi-Topic Workflow Review

## Current behavior

The generation trigger runs eight YouTube search groups, merges and de-duplicates results by `video_id`, reads YouTube statistics, and applies these hard gates: `published_at >= 2026-08-01T00:00:00Z`, `view_count >= 1000000`, and `like_count >= 10000`.

The publishing scan is a separate hourly trigger. It queries only `content_items` with `status=approved`. A manual run of this trigger can legitimately return zero items when no row is approved; it does not generate new content.

## Why the second line appeared stuck

The second trigger is a publisher, not a discovery pipeline. Its first HTTP node reads approved rows. When that query returns an empty array, n8n has no item to pass to the approval gate, image download, OAuth1 media upload, or X post nodes. The execution is successful with zero items rather than an error.

## Safety rules

The workflow keeps generation and publishing independent so a new generation run cannot reset an approved row to draft. X publishing still requires the same `content_id` to be approved. Credentials and secret values are intentionally omitted from this review export.
