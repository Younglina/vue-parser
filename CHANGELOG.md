# MCP Vue Parser 更新记录

## [1.3.4] - 2025-09-12

### 🐛 Features
1. 增强路径解析逻辑以支持webpack别名和require调用
- 处理样式文件中的~别名并规范化路径
- 添加对require()调用的依赖收集
- 为isLocalFile方法添加webpack别名路径支持
- 返回依赖列表时进行去重

## [1.3.2] - 2025-09-11

### ✨ Features

#### 支持非Vue文件的依赖解析

**新增功能：**
- 扩展依赖解析能力，支持解析普通JavaScript/TypeScript文件中的require和import语句
- 支持解析CSS/SCSS/SASS/LESS样式文件中的依赖
- 移除文件类型限制，`isSupportedFile`方法现在支持所有文件类型
- 改进`parseVueDependencies`方法，能够处理.js、.ts、.css等非Vue文件

**技术实现：**
- 修改`parseVueDependencies`方法，根据文件扩展名选择合适的解析策略
- 对于JavaScript/TypeScript文件，直接使用`extractScriptDependencies`解析require和import语句
- 对于样式文件，使用`extractStyleDependencies`解析@import等依赖
- 保持向后兼容，Vue文件解析逻辑不变

**使用场景：**
- 解析config.js等配置文件中的静态资源依赖（如SVG图标）
- 分析JavaScript模块的依赖关系
- 处理样式文件的导入依赖
- 支持混合项目中多种文件类型的依赖分析

## [1.2.0] - 2025-09-10

### ✨ Features

#### 简单添加自动查找和保存路由信息功能

**新增功能：**
- 自动识别和解析Vue项目中的路由配置文件

## [1.1.1] - 2025-09-10

### 🐛 Bug Fixes

#### 改进Vue解析错误处理和文件扩展名支持

**问题描述：**
- Vue文件解析错误时缺少具体文件路径信息，难以定位问题
- `resolveFileWithExtensions` 方法支持的样式文件扩展名不够全面
- 错误处理机制不够完善，影响调试效率

**解决方案：**
1. **改进错误信息**：在Vue文件解析错误时包含具体文件路径
2. **扩展文件支持**：`resolveFileWithExtensions` 方法新增支持  `.css`、`.scss`、`.sass`、`.less` 等样式文件扩展名
3. **优化错误处理**：提供更详细的错误信息，便于MCP客户端工具定位问题
4. **测试完善**：添加错误处理测试用例，确保错误情况被正确处理

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