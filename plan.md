# 移除速度参考表格

- 状态：实现与静态验证完成，待统一人工验收。
- 规模：小型。移除一块独立页面内容及其专用生成逻辑、样式和页面断言，不改变计算器核心行为。
- 旧合同终态：根目录静态首页迁移已完成，待统一人工验收；本合同承接用户新授权的页面内容变更。
- 目标：删除“Audiobook speed calculator reference tables”区块，并清理仅由该区块使用的代码。

## 范围与决定

- 允许修改：`plan.md`、`index.html`、`app.mjs`、`styles.css`、`site/tests/page-defaults.test.mjs`。
- 禁止修改：`calculator.mjs`、计算规则及比较卡片的行为、部署配置和其他页面内容。
- `app.mjs` 的 `renderReferenceTables` 只服务该 HTML 区块，应删除其函数、调用和对应导入。
- `REFERENCE_SPEEDS` 与 `buildComparison` 仍用于计算结果的速度比较，继续保留。
- 删除页面测试中仅断言参考表格存在的旧检查，不新增测试；本次不运行测试套件。

## 验收矩阵

| 场景 | 通过标准 | 证明方式 |
| --- | --- | --- |
| 页面内容 | 页面不再包含参考表格区块 | 源码搜索与 diff 检查 |
| 页面启动 | 专用渲染逻辑已删除，模块语法有效 | `node --check app.mjs` |
| 范围 | 速度比较计算与其他页面内容保留 | 源码搜索与 diff 检查 |
| 提交发布 | 本轮修改单独提交并推送至 `origin/main` | Git 状态与推送结果 |

## 执行与验证

1. 删除 `index.html` 中完整参考表格区块；移除 `app.mjs` 的专用渲染逻辑、调用和导入；清理 `styles.css` 的专用选择器及移动端规则；删除页面测试中对此区块存在性的断言。
2. 执行 `node --check app.mjs`、`git diff --check` 和源码搜索，审阅最终差异后提交并推送本轮文件。

- 最终验证：`node --check app.mjs`、`node --check site/tests/page-defaults.test.mjs`、`git diff --check` 均通过；参考表格专用标记、渲染逻辑和样式搜索无命中。未运行测试套件。
- 人工验收：待统一人工验收；未执行浏览器视觉检查。
- 风险：未运行测试套件或浏览器检查，本轮结论基于静态验证。
