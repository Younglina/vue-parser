# MCP Vue Parser 更新记录

## [1.1.0] - 2025-09-04

### 🐛 Bug Fixes

#### 修复parseStoreEntry方法中modules解析问题

**问题描述：**
- `parseStoreEntry` 方法无法正确解析 `store.js` 中使用ES6对象属性简写语法的模块
- 原有正则表达式 `/(\w+):\s*(\w+)/g` 只能匹配 `key: value` 格式，忽略了 `currentUser,` 等简写形式
- 导致部分store模块在依赖分析时被遗漏

**影响范围：**
- `parseVueDependencies` 方法的store模块识别不完整
- `copyVueDependencies` 方法可能遗漏某些store文件的复制
- Vue项目迁移工具的准确性和完整性受影响

**解决方案：**
1. **保留原有功能**：继续支持完整的 `key: value` 格式模块解析
2. **新增简写语法支持**：
   - 添加正则表达式 `/\b(\w+)(?=\s*[,}])/g` 识别简写模块
   - 在处理完 `key: value` 格式后，从剩余内容中提取简写模块
   - 对于简写语法，key和value相同（如 `currentUser: currentUser`）
3. **智能过滤**：排除JavaScript关键字和已处理的模块，避免误匹配
---

## [1.0.0] - 2025-08-20

### ✨ Features

#### 初始版本发布

**核心功能：**
- Vue单文件组件依赖分析 (`parseVueDependencies`)
- Vue项目文件复制功能 (`copyVueDependencies`)
- 支持多种导入语法识别
- 递归依赖树构建

**支持的文件类型：**
- `.vue` 单文件组件
- `.js` JavaScript文件
- `.ts` TypeScript文件

**主要方法：**
- `parseVueDependencies(filePath)` - 解析Vue文件依赖
- `copyVueDependencies(filePath, targetDir)` - 复制Vue文件及其依赖
- `buildDependencyTree(filePath, visited)` - 构建依赖树

---