// 合并三类来源：YouTube Search、YouTube videos.list statistics、DeepSeek评分。
// 输出：每个视频一条完整标准化记录，适合后续 Supabase 入库。
const searchResponse = $('搜索YouTube').first()?.json || {};
const statsResponse = $('YouTube视频统计').first()?.json || {};
const deepseekResponse = $('HTTP Request').first()?.json || {};

const searchItems = Array.isArray(searchResponse.items) ? searchResponse.items : [];
const statsItems = Array.isArray(statsResponse.items) ? statsResponse.items : [];

const statsByVideoId = new Map(
  statsItems.map(item => [item.id, item])
);

function parseDeepSeekScores(response) {
  const raw = response.choices?.[0]?.message?.content ?? response.content ?? response.text ?? '';
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return [raw];
  if (typeof raw !== 'string' || !raw.trim()) return [];

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) {}
    }
    return [];
  }
}

const scoreItems = parseDeepSeekScores(deepseekResponse);
const scoreByVideoId = new Map(
  scoreItems
    .filter(item => item && item.video_id)
    .map(item => [item.video_id, item])
);

return searchItems.map(item => {
  const videoId = item.id?.videoId || item.id || '';
  const snippet = item.snippet || {};
  const stats = statsByVideoId.get(videoId) || {};
  const statistics = stats.statistics || {};
  const score = scoreByVideoId.get(videoId) || {};

  return {
    json: {
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
      engagement: {
        views: Number(statistics.viewCount || 0),
        likes: Number(statistics.likeCount || 0),
        comments: Number(statistics.commentCount || 0),
        favorites: Number(statistics.favoriteCount || 0),
      },
      viral_score: score.score ?? null,
      ai_summary: score.reason || '暂无评分理由',
      score_source: 'DeepSeek',
      status: 'discovered',
      raw_search_item: item,
      raw_statistics_item: stats,
      raw_deepseek_item: score,
      collected_at: new Date().toISOString(),
    }
  };
});
