# Current n8n Main Workflow — Read-Only End-to-End Regression Audit

> 本审计仅读取当前已保存并实际启用的主工作流配置与既有主触发执行记录；没有修改历史 Webhook #180/#181，没有重新添加 Webhook，没有触发测试 X 帖子、邮件或生产数据写入。

## Executive conclusion

当前主工作流**不能判定为安全闭环运行**。主链的触发、采集、统计合并、热点筛选、官网核验、DeepSeek 商业分析、双语生产、Supabase 回写和审批闸门都能进入执行；但在当前主链中，`content_visual_binding_key` 在 `准备内容最终回写` 节点被丢弃。它在 `解析官方图片资产` 中已经生成，进入 `准备商业分析请求`、`解析商业分析JSON` 和 `解析双语图文JSON` 时仍然存在，但到 `准备内容最终回写` 后变成空值，之后 `断言Supabase更新命中` 也无法恢复它。若某条记录随后被批准，`准备X发布内容` 的硬校验会因为 `content_visual_binding_missing` 阻止发布。

因此，当前唯一需要修复的具体节点是：**`准备内容最终回写`**。它需要把官方资产绑定字段从上游原样带到回写对象，至少包括 `content_visual_binding_key`、`image_title_overlay_language`、`image_title_overlay_status`、`asset_kind`、`asset_selection_reason`、`asset_subject` 和 `asset_match_status`。本次审计没有修改该节点。

## 1. Current trigger and workflow state

| Check | Result |
|---|---|
| Workflow | `YouTube机器人视频采集｜官网核验｜X图片发布` |
| Active | `true` |
| Active version | `bbefa6dd-29f6-440c-9f2b-3a74ea56cfe6` |
| Trigger | `每小时触发` — `scheduleTrigger` |
| Schedule | `hours` interval，即每小时 |
| Webhook nodes in current workflow | **None** |
| Current node count | 32 |

当前启用版本没有 Webhook 节点，历史 Webhook #180/#181 没有被修改。

## 2. Main-chain connection audit

主链当前连接顺序为：

```text
每小时触发
→ 搜索YouTube
→ HTTP Request + YouTube视频统计
→ 等待YouTube数据汇合
→ Code in JavaScript
→ 存入Supabase / 筛选热点并排序
→ 检索官网与新闻来源
→ 解析官网与新闻候选
→ 是否存在官方来源
→ 获取官方来源页面 / 标记无官方来源
→ 解析官方图片资产
→ 准备商业分析请求
→ DeepSeek商业分析
→ 解析商业分析JSON
→ 准备双语图文请求
→ DeepSeek双语图文生产
→ 解析双语图文JSON
→ 准备内容最终回写
→ 更新Supabase完整内容
→ 断言Supabase更新命中
→ X发布审批闸门
→ 准备X发布内容
→ 下载官方图片二进制
→ X上传官方图片
→ X发布图片帖子
```

另外，每小时触发器还连接到“扫描Supabase已批准待发布内容 → 筛选已批准待发布内容 → X发布审批闸门”分支，用于处理已经人工批准但尚未发布的记录。该分支没有 Webhook，也没有自动批准逻辑。

## 3. Field propagation audit from existing main execution #184

以下是既有主触发执行 #184 的只读结果，未重新执行工作流。

| Node | Items | `official_image_url` | `official_source_url` | `content_visual_binding_key` | `approval_status` | `x_text_en` |
|---|---:|---:|---:|---:|---:|---:|
| `解析官方图片资产` | 1 | 1/1 | 1/1 | 1/1 | 0/1 | 0/1 |
| `准备商业分析请求` | 10 | 1/10 | 1/10 | 1/10 | 0/10 | 0/10 |
| `解析商业分析JSON` | 10 | 1/10 | 1/10 | 1/10 | 0/10 | 0/10 |
| `解析双语图文JSON` | 10 | 1/10 | 1/10 | 1/10 | 0/10 | 0/10 |
| `准备内容最终回写` | 10 | 1/10 | 1/10 | **0/10** | 10/10 | 0/10 |
| `断言Supabase更新命中` | 10 | 1/10 | 1/10 | **0/10** | 10/10 | 0/10 |
| `X发布审批闸门` | 10 | 1/10 | 1/10 | **0/10** | 10/10 | 0/10 |
| `准备X发布内容` | 0 | — | — | — | — | — |

`x_text_en` 在当前主链不是提前存储的独立字段；它是在 `准备X发布内容` 节点由 `english.body`、`summary_en` 或其他英文候选生成的。因此 `x_text_en` 在前面的双语节点为空本身不是结构错误。但 `content_visual_binding_key` 应当在官方资产节点生成后一直保留，当前却在回写节点丢失。

## 4. Approval gate audit

当前 `X发布审批闸门` 的条件是：

```text
$json.status == "approved"
```

闸门实际读取的是 `status` 字段（不是 `approval_status`）。主链写回的 `content_items.status` 默认是 `draft_generated`（内存中的 `approval_status` 为 `pending_approval`，但 `approval_status` 不是 Supabase 列，也不是闸门条件）。审批扫描分支 `筛选已批准待发布内容` 同样以 `row.status === 'approved'` 判定。因此**批准某条记录 = 在 Supabase 把该 `content_id` 的 `content_items.status` 改为 `approved`**。只要没有人工这样改，节点的 true 分支就不会输出到 `准备X发布内容`。这符合严格审批要求，未批准内容不会进入 X。执行 #184 中审批闸门收到 10 条记录，true 分支为 0，false 分支为 9；没有任何 X 发布节点被执行。

## 5. Image and X node configuration

| Node | Current configuration | Regression status |
|---|---|---|
| `下载官方图片二进制` | GET `{{$json.official_image_url}}`，响应格式为 file | 配置正确；当前主链因审批未通过未实际运行 |
| `X上传官方图片` | POST `https://api.x.com/2/media/upload`，`twitterOAuth1Api` credential | 配置正确；当前主链因审批未通过未实际运行 |
| `X发布图片帖子` | POST `https://api.x.com/2/tweets`，`twitterOAuth1Api` credential，正文来自 `x_text_en` | 配置正确；当前主链因审批未通过未实际运行 |

图片下载、OAuth1 上传和 X 发帖在历史 Webhook #181 中曾成功，但那不是当前主链回归测试，因此不能把 #181 当成当前主链 end-to-end 证据。

## 6. `$json.body.xxx` versus `$json.xxx` audit

当前启用主工作流没有 Webhook 节点，因此不存在 Webhook body 输入结构要求。静态代码中发现两处 `$json.body` 访问：

| Node | Access pattern | Finding |
|---|---|---|
| `解析官网与新闻候选` | `$json.data || $json.body || $json.text` | 兼容性回退，不是 `body.xxx` 强制路径 |
| `解析官方图片资产` | `$json.data || $json.body || $json.text` | 兼容性回退，不是 `body.xxx` 强制路径 |
| `准备X发布内容` | `$json.body` object fallback, otherwise `$json` | 当前主链无 Webhook，fallback 不会造成错配 |

没有发现当前主链存在 `$json.body.xxx` 与 `$json.xxx` 的强制结构错配。历史 Webhook #180 的错配已经不属于当前启用主工作流，因为 Webhook 节点已被移除。

## Final safety decision

当前主链**不能安全地判定为可发布闭环**，但原因是一个明确、可定位的字段保留缺陷，而不是触发器、审批闸门或 OAuth1 配置问题。

> **唯一需要修复的节点：`准备内容最终回写`。**
>
> 它必须保留 `content_visual_binding_key` 及相关官方资产元数据，使这些字段能够从 `解析官方图片资产` 传到 `断言Supabase更新命中`、`X发布审批闸门` 和 `准备X发布内容`。本次审计没有修改生产工作流。

修复该节点后，应先让主链生成一条记录，再人工批准同一 `content_id`，等待每小时主触发的 approved 扫描分支，最后用同一 `content_id` 检查图片下载、OAuth1 上传和 X 发帖。审计期间没有发送任何测试 X 帖子、邮件，也没有修改生产数据。

## 修复记录（fix applied）

代码复查后确认：`准备内容最终回写` 的现行版本已经用 `...assetFields` 把官方资产字段带进输出，字段真正丢失的位置在下游写库节点 **`更新Supabase完整内容`**——它塞进 `raw_deepseek_item.official_research` 的对象只写了 `official_source_url / official_source_title / official_image_url / asset_source / rights_status / approval_status / x_publish_status`，漏掉了绑定元数据。因此 `approved` 扫描分支只能用 `${content_id}|${official_image_url}` 合成一个假的 `content_visual_binding_key`，并把 `image_title_overlay_language` 硬默认为 `'en'`，使 `准备X发布内容` 的两项校验形同虚设。

本次修复：在 `更新Supabase完整内容` 的 `official_research` 对象中补齐 `content_visual_binding_key`、`image_title_overlay_language`、`image_title_overlay_status`、`asset_kind`、`asset_selection_reason`、`asset_subject`、`asset_match_status`（主副 `activeVersion` 两份节点同步修改）。修复后 `approved` 扫描分支即可从 DB 还原真实的绑定键与图片标题语言，而非合成/默认值。

> 注意：本仓库是导出快照。以上修改在 re-import 到 n8n 后才对线上主工作流生效。审批闸门条件已更正为 `$json.status == "approved"`；批准记录 = 将 `content_items.status` 置为 `approved`。
