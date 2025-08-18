# Vue依赖解析MCP服务器 - 技术文档

基于 **Model Context Protocol (MCP)** 的Vue文件依赖解析服务器，专门用于分析Vue项目中的文件依赖关系。

## 🚀 功能特性

- **智能依赖分析**：自动识别Vue文件中的所有import、require、@import等依赖关系
- **递归依赖树**：支持深度递归分析，获取完整的依赖链
- **路径别名支持**：完美支持Webpack路径别名配置（如@、~等）
- **文件复制功能**：一键复制Vue文件及其所有依赖到指定目录，保持目录结构
- **TypeScript支持**：内置TypeScript文件处理
- **可视化调试**：支持MCP Inspector可视化调试
- **零配置使用**：在Trae中直接引入即可使用

## 🎯 项目作用

### 简单理解
想象你有一个Vue项目，里面有很多文件互相引用（比如组件引用其他组件、导入CSS文件、引用图片等）。这个工具能够：

1. **找出所有关系** - 分析一个Vue文件用到了哪些其他文件
2. **画出依赖地图** - 递归分析，找出文件的文件的文件...形成完整的依赖树
3. **打包搬家** - 把一个Vue文件和它需要的所有文件一起复制到新地方

### 实际应用场景
- 📦 **项目迁移**：把某个功能模块从一个项目复制到另一个项目
- 🔍 **依赖分析**：了解项目文件之间的复杂关系
- 🧹 **代码清理**：找出哪些文件是真正被使用的
- 📊 **项目重构**：分析模块依赖，优化项目结构

## 🛠️ 核心功能

### 1. parse_vue_dependencies - Vue文件依赖解析

**功能说明**：分析单个Vue文件的直接依赖

**输入参数**：
- `filePath`：Vue文件路径（必需）
- `aliasConfig`：路径别名配置，如 `{"@": "./src"}`
- `baseDir`：项目根目录

**解析内容**：
- **Template部分**：`<img src="...">`等标签中的文件引用
- **Script部分**：`import`和`require`语句中的模块引用
- **Style部分**：`@import`和`url()`中的样式文件引用

**输出结果**：
```json
{
  "success": true,
  "filePath": "/path/to/file.vue",
  "dependencies": {
    "template": ["./images/logo.png"],
    "script": ["./components/Header.vue", "./utils/helper.js"],
    "style": ["./styles/common.css"]
  },
  "summary": {
    "totalFiles": 4,
    "templateFiles": 1,
    "scriptFiles": 2,
    "styleFiles": 1
  }
}
```

### 2. analyze_dependency_tree - 递归依赖树分析

**功能说明**：深度分析文件的完整依赖关系，包括依赖的依赖

**额外参数**：
- `maxDepth`：最大递归深度（默认10层，防止无限循环）

**特殊处理**：
- ✅ **循环依赖检测**：A引用B，B又引用A的情况
- ✅ **深度限制**：避免分析过深导致性能问题
- ✅ **文件存在性检查**：标记不存在的文件

**输出结果**：
```json
{
  "success": true,
  "entryFile": "/path/to/main.vue",
  "dependencyTree": {
    "file": "/path/to/main.vue",
    "dependencies": [
      {
        "file": "/path/to/Header.vue",
        "dependencies": [...]
      }
    ]
  },
  "allFiles": ["/path/to/main.vue", "/path/to/Header.vue", ...],
  "summary": {
    "totalFiles": 15,
    "maxDepth": 3,
    "circularDependencies": [],
    "hasCircularDeps": false
  }
}
```

### 3. copy_vue_dependencies - 依赖文件复制

**功能说明**：将Vue文件及其所有依赖文件复制到指定目录，保持原有的目录结构

**输入参数**：
- `filePath`：源Vue文件路径（必需）
- `targetDir`：目标目录（必需，默认为"output"）
- `includeNodeModules`：是否包含node_modules依赖（默认false）

**复制策略**：
- 🏗️ **保持目录结构**：复制时维持原有的文件夹层级
- 📁 **自动创建目录**：目标目录不存在时自动创建
- 🚫 **智能过滤**：默认跳过node_modules文件
- 📊 **详细报告**：提供复制成功和失败的详细信息

## 🔧 技术实现详解

### 核心技术栈

1. **@modelcontextprotocol/sdk** - MCP协议实现
   - 提供标准化的工具接口
   - 支持JSON Schema参数验证
   - 统一的错误处理机制

2. **@vue/compiler-sfc** - Vue单文件组件解析
   - 官方Vue编译器
   - 准确解析template、script、style三个部分
   - 支持Vue2和Vue3语法

3. **Node.js内置模块**
   - `fs` - 文件系统操作
   - `path` - 路径处理和规范化

### 关键算法实现

#### 1. 路径解析算法

```javascript
// 支持相对路径、绝对路径、别名路径
resolveAlias(importPath, aliasConfig, baseDir) {
  // 按别名长度排序，确保最长匹配优先
  const sortedAliases = Object.entries(aliasConfig)
    .sort(([a], [b]) => b.length - a.length);
  
  // 精确匹配别名（避免部分匹配问题）
  for (const [alias, realPath] of sortedAliases) {
    if (normalizedImport.startsWith(alias)) {
      const nextChar = normalizedImport[alias.length];
      if (nextChar === undefined || nextChar === '/' || nextChar === '\\') {
        // 替换别名为真实路径
        return this.resolvePath(resolvedPath, baseDir);
      }
    }
  }
}
```

#### 2. 依赖提取算法

**Script部分** - 支持多种import语法：
```javascript
const importPatterns = [
  /import\s+["']([^"']+)["']/g,                    // import 'module'
  /import\s+[^\s]+\s+from\s+["']([^"']+)["']/g,    // import something from 'module'
  /import\s+\{[^}]*\}\s+from\s+["']([^"']+)["']/g, // import { something } from 'module'
  /import\s+\*\s+as\s+[^\s]+\s+from\s+["']([^"']+)["']/g // import * as something from 'module'
];
```

**Template部分** - 提取资源引用：
```javascript
const srcRegex = /src=["']([^"']+)["']/g; // <img src="...">
```

**Style部分** - CSS导入和资源：
```javascript
const importRegex = /@import\s+["']([^"']+)["']/g; // @import "..."
const urlRegex = /url\(["']?([^"')]+)["']?\)/g;     // url(...)
```

#### 3. 循环依赖检测

```javascript
async buildDependencyTree(filePath, aliasConfig, baseDir, visited, circularDeps, depth, maxDepth) {
  const resolvedPath = this.resolvePath(filePath, baseDir);
  
  // 检查是否已访问过（循环依赖）
  if (visited.has(resolvedPath)) {
    circularDeps.add(resolvedPath);
    return { file: resolvedPath, dependencies: [], circular: true, depth };
  }
  
  visited.add(resolvedPath);
  // ... 递归处理依赖
  visited.delete(resolvedPath); // 回溯时移除，允许其他路径访问
}
```

### 错误处理机制

1. **参数验证**：检查必需参数是否提供
2. **文件存在性检查**：验证文件是否存在和可读
3. **Vue文件解析错误**：处理语法错误和格式问题
4. **路径解析错误**：处理无效路径和权限问题
5. **统一错误格式**：使用MCP标准错误码和消息

## 🚀 使用方式

### 1. 启动服务器
```bash
node index.js
```

### 2. 通过MCP客户端调用

**解析单个文件依赖**：
```json
{
  "method": "tools/call",
  "params": {
    "name": "parse_vue_dependencies",
    "arguments": {
      "filePath": "./src/components/Header.vue",
      "aliasConfig": { "@": "./src" },
      "baseDir": "/project/root"
    }
  }
}
```

**分析完整依赖树**：
```json
{
  "method": "tools/call",
  "params": {
    "name": "analyze_dependency_tree",
    "arguments": {
      "filePath": "./src/views/HomePage.vue",
      "maxDepth": 5
    }
  }
}
```

**复制文件和依赖**：
```json
{
  "method": "tools/call",
  "params": {
    "name": "copy_vue_dependencies",
    "arguments": {
      "filePath": "./src/components/UserProfile.vue",
      "targetDir": "./backup",
      "includeNodeModules": false
    }
  }
}
```

## 🔍 技术特点

### 优势

1. **准确性高** - 使用Vue官方编译器，支持最新语法
2. **功能完整** - 覆盖template、script、style三个部分
3. **智能处理** - 支持路径别名、多种文件扩展名、循环依赖检测
4. **性能优化** - 深度限制、文件缓存、智能过滤
5. **标准化** - 基于MCP协议，易于集成和扩展

### 局限性

1. **动态导入** - 无法分析运行时动态生成的路径
2. **条件导入** - 不处理基于条件的模块加载
3. **外部依赖** - 默认不处理node_modules中的第三方包
4. **复杂语法** - 对于非标准的import语法可能遗漏

## 📚 扩展建议

### 可能的改进方向

1. **支持更多文件类型** - 添加对TypeScript、JSX等的支持
2. **可视化界面** - 开发Web界面展示依赖关系图
3. **性能优化** - 添加文件变更监听和增量分析
4. **配置文件支持** - 支持从webpack.config.js等读取别名配置
5. **插件系统** - 允许用户自定义依赖提取规则

### 集成建议

1. **IDE插件** - 集成到VSCode等编辑器中
2. **构建工具** - 与webpack、vite等构建工具结合
3. **CI/CD** - 在持续集成中进行依赖分析
4. **文档生成** - 自动生成项目依赖文档

## 🎉 总结

这个Vue依赖解析MCP服务器是一个功能强大且实用的工具，它能够帮助开发者更好地理解和管理Vue项目中的文件依赖关系。通过标准化的MCP协议接口，它可以轻松集成到各种开发工具和工作流中，为Vue项目的开发、维护和重构提供有力支持。

无论你是想要迁移代码模块、分析项目结构，还是进行代码重构，这个工具都能为你提供准确、详细的依赖信息，让复杂的依赖关系变得清晰可见。