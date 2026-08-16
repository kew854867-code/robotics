const assert = require('node:assert/strict');

function mergeData({ searchResponse, statsResponse, deepseekResponse }) {
  const searchItems = Array.isArray(searchResponse?.items) ? searchResponse.items : [];
  const statsItems = Array.isArray(statsResponse?.items) ? statsResponse.items : [];
  const statsByVideoId = new Map(statsItems.map(item => [item.id, item]));

  function parseDeepSeekScores(response) {
    const raw = response?.choices?.[0]?.message?.content ?? response?.content ?? response?.text ?? '';
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    if (typeof raw !== 'string' || !raw.trim()) return [];
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try { return JSON.parse(match[0]); } catch (_) { return []; }
    }
  }

  const scores = parseDeepSeekScores(deepseekResponse);
  const scoreByVideoId = new Map(scores.filter(x => x?.video_id).map(x => [x.video_id, x]));

  return searchItems.map(item => {
    const videoId = item.id?.videoId || item.id || '';
    const snippet = item.snippet || {};
    const stats = statsByVideoId.get(videoId) || {};
    const statistics = stats.statistics || {};
    const score = scoreByVideoId.get(videoId) || {};
    return {
      content_id: `youtube_${videoId}`,
      platform: 'YouTube',
      source: 'YouTube Data API',
      source_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
      video_id: videoId,
      title: snippet.title || stats.snippet?.title || '无标题',
      description: snippet.description || stats.snippet?.description || '',
      author: snippet.channelTitle || stats.snippet?.channelTitle || '未知作者',
      channel_id: snippet.channelId || stats.snippet?.channelId || '',
      published_at: snippet.publishedAt || stats.snippet?.publishedAt || null,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || stats.snippet?.thumbnails?.high?.url || '',
      language: 'en',
      content_type: 'video',
      robotics_topic: 'robotics',
      view_count: Number(statistics.viewCount || 0),
      like_count: Number(statistics.likeCount || 0),
      comment_count: Number(statistics.commentCount || 0),
      favorite_count: Number(statistics.favoriteCount || 0),
      engagement: { views: Number(statistics.viewCount || 0), likes: Number(statistics.likeCount || 0), comments: Number(statistics.commentCount || 0), favorites: Number(statistics.favoriteCount || 0) },
      viral_score: score.score ?? null,
      ai_summary: score.reason || '暂无评分理由',
      score_source: 'DeepSeek',
      status: 'discovered',
      raw_search_item: item,
      raw_statistics_item: stats,
      raw_deepseek_item: score,
    };
  });
}

const search = { items: [
  { id: { videoId: 'abc' }, snippet: { title: 'Robot demo', description: 'A humanoid robot demo', channelTitle: 'Lab', channelId: 'ch1', publishedAt: '2026-08-14T00:00:00Z', thumbnails: { high: { url: 'https://img/abc' } } } },
  { id: { videoId: 'def' }, snippet: { title: 'Second robot', description: 'Factory robot', channelTitle: 'Factory', channelId: 'ch2', publishedAt: '2026-08-13T00:00:00Z', thumbnails: { default: { url: 'https://img/def' } } } },
]};
const stats = { items: [
  { id: 'abc', statistics: { viewCount: '1200', likeCount: '85', commentCount: '9', favoriteCount: '0' } },
]};
const deepseek = { choices: [{ message: { content: '```json\n[{"video_id":"abc","score":91,"reason":"清晰演示且有高传播价值"},{"video_id":"def","score":68,"reason":"相关但传播信号较弱"}]\n```' } }] };
const result = mergeData({ searchResponse: search, statsResponse: stats, deepseekResponse: deepseek });
assert.equal(result.length, 2);
assert.equal(result[0].view_count, 1200);
assert.equal(result[0].like_count, 85);
assert.equal(result[0].viral_score, 91);
assert.equal(result[1].comment_count, 0);
assert.equal(result[1].viral_score, 68);
assert.equal(result[1].source_url, 'https://www.youtube.com/watch?v=def');
console.log(JSON.stringify({ passed: true, rows: result.length, fields: Object.keys(result[0]) }, null, 2));
