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
   
## 🚀 使用方式

### 1. 配置MCP
```javascript
{
  "mcpServers": {
    "vue-dependency-parser": {
      "command": "npx",
      "args": [
        "vue-dependency-parser-mcp"
      ],
      "env": {}
    }
  }
}
```
如果出现报错，清除一下npm和npx的缓存
```bash
npm cache clean --force
npx clear-npx-cache --force
```
### 2. 调用MCP服务
在对应的开发工具中引用MCP即可。
在Tare中，可以创建一个智能体，勾选对应的MCP，提示词可以使用`你的作用是根据用户提供的文件，调用给你的mcp工具分析文件并复制到output目录`

### 3. 使用案例
以A分支需要迁移代码到B分支为例

- 找到A分支需要迁移功能的入口文件，比如`\src\views\assets\unitManagement\index.vue`
- 把它拖入对话框中，并输入提示语句：分析并复制到output目录
- 复制出来的文件就是对应的src目录下的文件，文件目录层级和原文件是一致的
- 最后可以直接复制output内的所有文件到B分支src目录下

### 本地测试
- clone项目后，先在项目根目录下执行`npm install`安装依赖
- 创建`testConfig.js`文件，配置测试参数
```javascript
export const config = {
    testFile: 入口文件路径,如：'/src/views/home.vue',
    baseDir: 项目根目录,如：'e:/myrepo/项目名称',
    aliasConfig: {
        '@': './src',
        '~': './src'
    },
    targetDir: 'e:/myrepo/项目名称/output'
}
```
- 执行`node testMcp.js`进行测试

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

## 🎉 总结

这个Vue依赖解析MCP服务器是一个功能强大且实用的工具，它能够帮助开发者更好地理解和管理Vue项目中的文件依赖关系。通过标准化的MCP协议接口，它可以轻松集成到各种开发工具和工作流中，为Vue项目的开发、维护和重构提供有力支持。

无论你是想要迁移代码模块、分析项目结构，还是进行代码重构，这个工具都能为你提供准确、详细的依赖信息，让复杂的依赖关系变得清晰可见。