# n8n Webhook 节点中断审计报告

> 本报告只审计 n8n Webhook 执行，不包含网站预览或网站项目内容。

## 结论

Webhook 共有两次相关执行。执行 **#180** 在 `下载官方图片二进制` 节点立即中断，直接错误是 `URL parameter must be a string, got undefined`。前一个 `准备X发布内容` 节点虽然执行了，但由于 Webhook 数据体位于 `$json.body` 而节点代码读取根对象 `$json`，输出中的 `official_image_url`、`official_source_url`、`x_text_en` 等字段全部缺失，随后图片下载节点收到 undefined URL。

执行 **#181** 是修复 Webhook body 展开后的成功重试：Webhook → 审批闸门 → 准备 X 发布内容 → 下载图片 → X OAuth1 图片上传 → X 发帖，全部成功。它不是截图中的每小时主链执行，而是历史上临时 Webhook 入口的执行；该入口之后已从当前主工作流移除。

## Webhook 节点现状

当前保存的主工作流已经没有 `用户确认Gemini Robotics 2发布入口` Webhook 节点。历史 Webhook 执行 #180/#181 仍保留在 n8n 执行记录中，可作为故障证据。

## Execution #180

- **Status:** `error`\n- **Finished:** `False`\n- **Mode:** `webhook`\n- **Started:** `2026-08-16T00:46:03.890Z`\n- **Stopped:** `2026-08-16T00:46:04.026Z`

### Node execution order and output counts

| Order | Node | Output items | Error |
|---:|---|---:|---|
| 1 | `用户确认Gemini Robotics 2发布入口` | 1 | no |
| 2 | `用户确认发布审批闸门` | 1 | no |
| 3 | `准备X发布内容` | 1 | no |
| 4 | `下载官方图片二进制` | 0 | yes |

### Node input/output detail

#### `用户确认Gemini Robotics 2发布入口`

- Branch `0`: **1 item(s)**

#### `用户确认发布审批闸门`

- Branch `0`: **1 item(s)**
- Branch `1`: **0 item(s)**

#### `准备X发布内容`

- Branch `0`: **1 item(s)**
  - JSON summary:
    ```json
    {
      "x_publish_status": "blocked_validation",
      "x_text_en": "",
      "x_validation_errors": [
        "official_image_url_missing",
        "english_image_title_overlay_missing",
        "content_visual_binding_missing",
        "official_source_url_missing",
        "x_text_missing"
      ]
    }
    ```

#### `下载官方图片二进制`

**Error object:**

```json
{
  "level": "warning",
  "shouldReport": true,
  "tags": {},
  "timestamp": 1786841164025,
  "context": {},
  "functionality": "regular",
  "name": "NodeOperationError",
  "node": {
    "parameters": {
      "curlImport": "",
      "method": "GET",
      "url": "={{$json.official_image_url}}",
      "authentication": "none",
      "provideSslCertificates": false,
      "sendQuery": false,
      "sendHeaders": false,
      "sendBody": false,
      "options": {
        "response": {
          "response": {
            "fullResponse": false,
            "neverError": false,
            "responseFormat": "file",
            "outputPropertyName": "data"
          }
        }
      },
      "infoMessage": ""
    },
    "id": "下载官方图片二进制-id",
    "name": "下载官方图片二进制",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.5,
    "position": [
      2448,
      176
    ]
  },
  "messages": [],
  "message": "URL parameter must be a string, got undefined",
  "stack": "NodeOperationError: URL parameter must be a string, got undefined\n    at ExecuteContext.execute (/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@file+packages+nodes-base_@opentelemetry+api@1.9.1_@opentelemetry+exporte_d7370ff31f51897830d9dde4f732945e/node_modules/n8n-nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts:235:12)\n    at WorkflowExecute.executeNode (/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_@opentelemetry+api@1.9.1_@opentelemetry+exporter-trace-otlp_5fb55fe16e47a8b43ddf1e6f25750496/node_modules/n8n-core/src/execution-engine/workflow-execute.ts:1082:31)\n    at WorkflowExecute.runNode (/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_@opentelemetry+api@1.9.1_@opentelemetry+exporter-trace-otlp_5fb55fe16e47a8b43ddf1e6f25750496/node_modules/n8n-core/src/execution-engine/workflow-execute.ts:1382:22)\n    at /usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_@opentelemetry+api@1.9.1_@opentelemetry+exporter-trace-otlp_5fb55fe16e47a8b43ddf1e6f25750496/node_modules/n8n-core/src/execution-engine/workflow-execute.ts:1855:38\n    at processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at /usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_@opentelemetry+api@1.9.1_@opentelemetry+exporter-trace-otlp_5fb55fe16e47a8b43ddf1e6f25750496/node_modules/n8n-core/src/execution-engine/workflow-execute.ts:2549:11"
}
```



## Execution #181

- **Status:** `success`\n- **Finished:** `True`\n- **Mode:** `webhook`\n- **Started:** `2026-08-16T00:46:54.955Z`\n- **Stopped:** `2026-08-16T00:46:57.539Z`

### Node execution order and output counts

| Order | Node | Output items | Error |
|---:|---|---:|---|
| 1 | `用户确认Gemini Robotics 2发布入口` | 1 | no |
| 2 | `用户确认发布审批闸门` | 1 | no |
| 3 | `准备X发布内容` | 1 | no |
| 4 | `下载官方图片二进制` | 1 | no |
| 5 | `X上传官方图片` | 1 | no |
| 6 | `X发布图片帖子` | 1 | no |

### Node input/output detail

#### `用户确认Gemini Robotics 2发布入口`

- Branch `0`: **1 item(s)**

#### `用户确认发布审批闸门`

- Branch `0`: **1 item(s)**
- Branch `1`: **0 item(s)**

#### `准备X发布内容`

- Branch `0`: **1 item(s)**
  - JSON summary:
    ```json
    {
      "content_id": "youtube_4lSQnrMC6nY",
      "video_id": "4lSQnrMC6nY",
      "approval_status": "approved",
      "x_publish_status": "ready_to_publish",
      "official_image_url": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663137102957/eAfqiQhmloRwWhao.png",
      "official_source_url": "https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/",
      "content_visual_binding_key": "youtube_4lSQnrMC6nY|eAfqiQhmloRwWhao.png|gemini-robotics-2",
      "x_text_en": "Google DeepMind’s Gemini Robotics 2 is being positioned as an intelligence layer for more adaptable robots.\n\nThe official video highlights three capabilities:\n\n• whole-body control\n• advanced dexterity\n• multi-robot collaboration\n\nWhy this matters commercially: if these capabilities transfer reliably across robot bodies and real-world tasks, the value chain could expand beyond robot hardware into models, sensors, chips, system integration and deployment.\n\nBut the important caveat is this: the public video description does not establish independent benchmark performance, pricing, customer adoption or ROS compatibility. The video reached 269,120 views, 7,130 likes and 549 comments when collected, which shows attention—not proof of commercial success.\n\nSource video: https://www.youtube.com/watch?v=4lSQnrMC6nY\n\nWhat will determine the next phase of robotics: better models, better bodies, or better hands?\n\n#Robotics #EmbodiedAI #RobotIntelligence #GoogleDeepMind #IndustrialAutomation",
      "x_validation_errors": []
    }
    ```

#### `下载官方图片二进制`

- Branch `0`: **1 item(s)**
  - JSON summary:
    ```json
    {
      "content_id": "youtube_4lSQnrMC6nY",
      "video_id": "4lSQnrMC6nY",
      "approval_status": "approved",
      "x_publish_status": "ready_to_publish",
      "official_image_url": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663137102957/eAfqiQhmloRwWhao.png",
      "official_source_url": "https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/",
      "content_visual_binding_key": "youtube_4lSQnrMC6nY|eAfqiQhmloRwWhao.png|gemini-robotics-2",
      "x_text_en": "Google DeepMind’s Gemini Robotics 2 is being positioned as an intelligence layer for more adaptable robots.\n\nThe official video highlights three capabilities:\n\n• whole-body control\n• advanced dexterity\n• multi-robot collaboration\n\nWhy this matters commercially: if these capabilities transfer reliably across robot bodies and real-world tasks, the value chain could expand beyond robot hardware into models, sensors, chips, system integration and deployment.\n\nBut the important caveat is this: the public video description does not establish independent benchmark performance, pricing, customer adoption or ROS compatibility. The video reached 269,120 views, 7,130 likes and 549 comments when collected, which shows attention—not proof of commercial success.\n\nSource video: https://www.youtube.com/watch?v=4lSQnrMC6nY\n\nWhat will determine the next phase of robotics: better models, better bodies, or better hands?\n\n#Robotics #EmbodiedAI #RobotIntelligence #GoogleDeepMind #IndustrialAutomation",
      "x_validation_errors": []
    }
    ```
  - Binary properties: `data`

#### `X上传官方图片`

- Branch `0`: **1 item(s)**

#### `X发布图片帖子`

- Branch `0`: **1 item(s)**
