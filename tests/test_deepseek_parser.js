const fs = require('node:fs');
const assert = require('node:assert/strict');

const live = JSON.parse(fs.readFileSync('/home/ubuntu/live_deepseek_business_prompt_output.json', 'utf8')).output;
const base = { content_id: 'youtube_business_test_001', title: 'Humanoid robots begin warehouse pilot', view_count: 125000, viral_score: 88 };

function parseDeepSeekObject(response) {
  const raw = response?.choices?.[0]?.message?.content ?? response?.content ?? response?.text ?? '';
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch (_) { return {}; }
}

function normalize(response) {
  const a = parseDeepSeekObject(response);
  return {
    ...base,
    is_robotics: a.is_robotics ?? null,
    robotics_relevance: a.robotics_relevance ?? null,
    category: a.category ?? null,
    summary_zh: a.summary_zh ?? null,
    summary_en: a.summary_en ?? null,
    commercial_value: a.commercial_value ?? {},
    recommended_route: a.recommended_route ?? 'discard',
    priority: a.priority ?? 'C',
    keep: a.keep ?? false,
    risk_flags: a.risk_flags ?? [],
    uncertainty: a.uncertainty ?? [],
    analysis_status: Object.keys(a).length ? 'analyzed' : 'parse_failed',
  };
}

const liveResult = normalize({ choices: [{ message: { content: JSON.stringify(live) } }] });
assert.equal(liveResult.analysis_status, 'analyzed');
assert.equal(liveResult.commercial_value.market_signal.score, 8);
assert.equal(liveResult.recommended_route, 'video_remake');

const fenced = normalize({ choices: [{ message: { content: '```json\n' + JSON.stringify(live) + '\n```' } }] });
assert.equal(fenced.analysis_status, 'analyzed');
assert.equal(fenced.priority, 'A');

const prose = normalize({ choices: [{ message: { content: '模型说明：' + JSON.stringify(live) } }] });
assert.equal(prose.analysis_status, 'analyzed');

const malformed = normalize({ choices: [{ message: { content: '不是JSON' } }] });
assert.equal(malformed.analysis_status, 'parse_failed');
assert.deepEqual(malformed.risk_flags, []);

const missingFields = normalize({ choices: [{ message: { content: JSON.stringify({ is_robotics: true, keep: true }) } }] });
assert.equal(missingFields.analysis_status, 'analyzed');
assert.equal(missingFields.priority, 'C');
assert.equal(missingFields.recommended_route, 'discard');

console.log(JSON.stringify({ passed: true, cases: ['live_json', 'markdown_fenced_json', 'prose_wrapped_json', 'malformed_non_json', 'missing_fields'], live_fields: Object.keys(liveResult) }, null, 2));
