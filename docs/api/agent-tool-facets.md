# 工具中心筛选聚合接口

## 目的

工具中心左侧的“工具分类”“集成状态”“来源”不再由前端写死，统一由后端按当前用户可访问的工具数据聚合返回。前端页面加载时请求一次此接口；点击筛选项后，仍通过现有 `POST /api/agent/tool/list` 传递对应筛选条件获取列表。

## 接口定义

- 方法：`GET`
- 地址：`/api/agent/tool/facets`
- 权限：与工具列表查询权限一致
- Content-Type：`application/json`

### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "categories": [
      { "value": "knowledge", "label": "知识库", "count": 12 },
      { "value": "ops", "label": "运维监控", "count": 18 },
      { "value": "dev", "label": "开发协作", "count": 9 }
    ],
    "statuses": [
      { "value": 1, "label": "已集成", "count": 31 },
      { "value": 0, "label": "未集成", "count": 8 }
    ],
    "sources": [
      { "value": "mcp-server-id-1", "label": "Prometheus MCP", "count": 14 },
      { "value": "mcp-server-id-2", "label": "团队自建服务", "count": 11 }
    ]
  }
}
```

## 字段说明

| 字段                 | 类型   | 说明                                                    |
| -------------------- | ------ | ------------------------------------------------------- |
| `categories[].value` | string | 工具的 `toolType`，供列表请求的 `toolType` 使用         |
| `categories[].label` | string | 分类展示名称                                            |
| `categories[].count` | number | 该分类下有权限查看的工具数                              |
| `statuses[].value`   | number | 工具状态；当前约定 `1` 为已集成/启用，`0` 为未集成/禁用 |
| `statuses[].label`   | string | 状态展示名称                                            |
| `statuses[].count`   | number | 对应状态的工具数                                        |
| `sources[].value`    | string | MCP 服务 ID，供列表请求的 `mcpServerId` 使用            |
| `sources[].label`    | string | MCP 服务名称                                            |
| `sources[].count`    | number | 来自该服务的工具数                                      |

## 后端实现要求

1. 按当前登录用户的数据权限过滤工具，再计算三个聚合，避免泄露无权限服务或工具。
2. 分类聚合按 `tool_type` 分组；显示名可从字典或服务端枚举转换。
3. 状态聚合按 `status` 分组，返回数值 `0` / `1`；显示名由后端统一提供。
4. 来源聚合按 `mcp_server_id` 分组并关联 MCP 服务名称；无来源工具可按需要增加 `value: "none"` 项。
5. `count` 必须为数值，空分组返回空数组，不返回 `null`。
6. 响应沿用项目标准 `ResponseStructure`：`code`、`message`、`data`。

## 前端调用关系

```text
GET /api/agent/tool/facets
  ├─ categories -> 左侧工具分类
  ├─ statuses   -> 左侧集成状态
  └─ sources    -> 左侧来源与来源下拉框

POST /api/agent/tool/list
  └─ toolType / status / mcpServerId -> 点击筛选后的列表查询参数
```
