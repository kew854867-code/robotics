# n8n 工作流查看与测试报告

## 一、Supabase SQL 与 n8n 输出映射

当前 SQL 的第一落点是 `public.content_items`。n8n 的 Supabase 节点使用 `autoMapInputData`，因此 Code 节点输出的标量字段直接映射到同名列，数组和嵌套对象映射到 `jsonb` 列。

| n8n 输出字段 | Supabase 列 | 类型 |
| --- | --- | --- |
| `content_id` | `content_id` | text，主键 |
| `title`、`description`、`author` | 同名列 | text |
| `video_id` | `video_id` | text，部分唯一索引 |
| `published_at`、`collected_at`、`analyzed_at` | 同名列 | timestamptz |
| `view_count`、`like_count`、`comment_count`、`favorite_count` | 同名列 | bigint |
| `viral_score`、`robotics_relevance` | 同名列 | numeric |
| `engagement`、`key_facts`、`target_audience`、`risk_flags`、`uncertainty` | 同名列 | jsonb |
| `raw_search_item`、`raw_statistics_item`、`raw_deepseek_item` | 同名列 | jsonb |
| `final_route`、`next_module`、`recommended_route` | 同名列 | text |

`content_events`、`content_production_tasks`、`content_publications` 和 `content_metrics` 不是当前发现链路的必需表，而是为后续生产、发布和反馈模块准备的扩展表。当前只建 `content_items` 也可以先跑通采集到热点路由的闭环。

## 二、商业价值 Prompt 测试

本轮完成的是**JSON 合同测试**，不是伪装成真实 DeepSeek API 返回的结果。测试验证了优化后的结构包含所有顶层字段，并且六个商业价值维度都包含 `score`、`evidence` 和 `implication`。测试结果为通过。

测试输出示例的核心结构如下：

```json
{
  "is_robotics": true,
  "robotics_relevance": 94,
  "priority": "A",
  "keep": true,
  "commercial_value": {
    "overall_score": 82,
    "market_signal": {"score": 78, "evidence": "内容明确指向仓储搬运场景", "implication": "仓储自动化可能仍是机器人商业化的重要落点"},
    "customer_signal": {"score": 81, "evidence": "任务对应拣选、搬运等可识别工作流", "implication": "仓储运营商和系统集成商可能是潜在关注方"},
    "product_signal": {"score": 86, "evidence": "展示双臂协同和具体任务执行", "implication": "可关注抓取可靠性、部署成本与系统集成能力"},
    "technology_signal": {"score": 80, "evidence": "演示体现多关节动作与任务规划", "implication": "需要进一步验证复杂环境稳定性"},
    "competitive_signal": {"score": 72, "evidence": "视频本身未提供竞品对比", "implication": "应补充同类方案的速度、成本和部署信息"},
    "content_signal": {"score": 90, "evidence": "演示画面直观且有明确结果", "implication": "适合做短视频解读和场景化图文"},
    "who_may_pay": ["仓储运营商", "物流自动化集成商"],
    "value_chain_impact": ["机器人本体", "末端执行器", "仓储软件", "系统集成"],
    "business_questions": ["实际客户是谁？", "单台部署成本是多少？", "是否已经在真实仓库运行？"]
  },
  "recommended_route": "video_adapt",
  "next_action": "进入视频适配分支，并补充真实部署与成本信息",
  "confidence": 0.84,
  "risk_flags": ["视频可能是营销演示，不能将演示效果等同于规模化部署能力"],
  "uncertainty": ["缺少真实客户、部署数量和成本数据"]
}
```

这个结构的关键是把“传播价值”和“商业价值”拆开。高播放量只能支持 `content_signal`，不能自动推导客户需求、收入、融资或市场份额。

## 三、当前 Code 节点结论

当前实际节点名称为 `Code in JavaScript`，类型为 `n8n-nodes-base.code`，代码长度为 3353 字符。它按 `video_id` 建立 videos.list 统计索引，再将 Search、统计和 DeepSeek 评分合并为一条视频记录。完整源码见附件 `current_n8n_code_node.js`。

代码已验证的核心能力包括：一条 Search 结果对应一条输出、统计缺失时使用 0、DeepSeek 返回 Markdown 代码块时仍能解析、原始三路数据保留在 JSON 字段中。

当前需要留意：`language`、`content_type` 和 `robotics_topic` 目前是 YouTube MVP 默认值。如果后续接入 RSS、图片和中文内容，应改为来源字段优先、模型分类作为补充，而不是永久硬编码。

## 四、真实 DeepSeek API 测试与解析验证

第一次调用显示模型有时会把六个商业信号放在顶层、遗漏部分业务字段。随后将 Prompt 改为要求“必须保留全部键、不得扁平化 commercial_value、缺证据使用 null 或空数组”，第二次真实调用通过了字段校验。

真实输出的关键结果为：`priority=A`、`recommended_route=video_remake`、`commercial_value.overall_score=7`，并完整返回六类商业信号、潜在付费方、产业链影响、业务问题、风险和不确定性。

解析等价测试也已通过五种场景：真实 JSON、Markdown 代码块包裹 JSON、前后带说明文字的 JSON、完全非 JSON 返回、缺少字段的 JSON。规则是：先读取 `choices[0].message.content`，去除代码块标记，尝试完整 JSON 解析；失败时提取最外层对象；仍失败则输出 `analysis_status=parse_failed`，并将路由降级为 `discard`、优先级降级为 `C`、风险和不确定性使用空数组，避免工作流中断。
