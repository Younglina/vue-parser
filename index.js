#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { parse } from '@vue/compiler-sfc';
import fs from 'fs';
import path from 'path';

/**
 * Vue文件解析MCP服务器
 * 提供parse_vue_dependencies工具来解析Vue文件的依赖关系
 */
class VueParserServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vue-parser-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * 设置工具处理器
   */
  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'parse_vue_dependencies',
            description: '解析Vue文件的依赖关系，提取template、script、style部分的所有文件引用',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Vue文件的绝对路径或相对路径',
                },
                aliasConfig: {
                  type: 'object',
                  description: '路径别名配置，如 {"@": "./src"}',
                  default: {},
                },
                baseDir: {
                  type: 'string',
                  description: '项目根目录，用于解析相对路径',
                  default: process.cwd(),
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'analyze_dependency_tree',
            description: '递归分析Vue文件的完整依赖树，包括依赖文件的依赖',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Vue文件的绝对路径或相对路径',
                },
                aliasConfig: {
                  type: 'object',
                  description: '路径别名配置，如 {"@": "./src"}',
                  default: {},
                },
                baseDir: {
                  type: 'string',
                  description: '项目根目录，用于解析相对路径',
                  default: process.cwd(),
                },
                maxDepth: {
                  type: 'number',
                  description: '最大递归深度，防止无限递归',
                  default: 10,
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'copy_vue_dependencies',
            description: '复制Vue文件及其所有依赖文件到指定目录，保持目录结构',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Vue文件的绝对路径或相对路径',
                },
                targetDir: {
                  type: 'string',
                  description: '目标目录路径',
                },
                aliasConfig: {
                  type: 'object',
                  description: '路径别名配置，如 {"@": "./src"}',
                  default: {},
                },
                baseDir: {
                  type: 'string',
                  description: '项目根目录，用于解析相对路径',
                  default: process.cwd(),
                },
                includeNodeModules: {
                  type: 'boolean',
                  description: '是否包含node_modules依赖',
                  default: false,
                },
              },
              required: ['filePath', 'targetDir'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'parse_vue_dependencies') {
        return await this.parseVueDependencies(args);
      } else if (name === 'analyze_dependency_tree') {
        return await this.analyzeDependencyTree(args);
      } else if (name === 'copy_vue_dependencies') {
        return await this.copyVueDependencies(args);
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `未知工具: ${name}`
      );
    });
  }

  /**
   * 解析Vue文件依赖
   */
  async parseVueDependencies(args) {
    try {
      const { filePath, aliasConfig = {}, baseDir = process.cwd() } = args;

      // 验证输入参数
      if (!filePath) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'filePath参数是必需的'
        );
      }

      // 解析文件路径
      const resolvedPath = this.resolvePath(filePath, baseDir);
      
      // 检查文件是否存在
      if (!fs.existsSync(resolvedPath)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `文件不存在: ${resolvedPath}`
        );
      }

      // 读取Vue文件内容
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      
      // 使用@vue/compiler-sfc解析Vue文件
      const { descriptor, errors } = parse(content, {
        filename: resolvedPath,
      });

      if (errors.length > 0) {
        throw new McpError(
          ErrorCode.InternalError,
          `Vue文件解析错误: ${errors.map(e => e.message).join(', ')}`
        );
      }

      // 提取依赖
      const dependencies = {
        template: [],
        script: [],
        style: [],
      };
      console.log(dependencies)

      // 解析template部分的依赖
      if (descriptor.template) {
        dependencies.template = this.extractTemplateDependencies(
          descriptor.template.content,
          aliasConfig,
          baseDir
        );
      }

      // 解析script部分的依赖
      if (descriptor.script) {
        dependencies.script = this.extractScriptDependencies(
          descriptor.script.content,
          aliasConfig,
          baseDir
        );
      }

      // 解析script setup部分的依赖
      if (descriptor.scriptSetup) {
        const setupDeps = this.extractScriptDependencies(
          descriptor.scriptSetup.content,
          aliasConfig,
          baseDir
        );
        dependencies.script = [...dependencies.script, ...setupDeps];
      }

      // 解析style部分的依赖
      if (descriptor.styles && descriptor.styles.length > 0) {
        descriptor.styles.forEach(style => {
          const styleDeps = this.extractStyleDependencies(
            style.content,
            aliasConfig,
            baseDir
          );
          dependencies.style = [...dependencies.style, ...styleDeps];
        });
      }

      // 去重
      Object.keys(dependencies).forEach(key => {
        dependencies[key] = [...new Set(dependencies[key])];
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              filePath: resolvedPath,
              dependencies,
              summary: {
                totalFiles: dependencies.template.length + dependencies.script.length + dependencies.style.length,
                templateFiles: dependencies.template.length,
                scriptFiles: dependencies.script.length,
                styleFiles: dependencies.style.length,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `解析Vue文件时发生错误: ${error.message}`
      );
    }
  }

  /**
   * 解析路径（优化版）
   */
  resolvePath(filePath, baseDir) {
    if (!filePath) {
      throw new Error('文件路径不能为空');
    }

    // 规范化路径
    const normalizedPath = path.normalize(filePath);
    
    if (path.isAbsolute(normalizedPath)) {
      return normalizedPath;
    }
    
    const resolved = path.resolve(baseDir, normalizedPath);
    return path.normalize(resolved);
  }

  /**
   * 解析别名路径（优化版）
   */
  resolveAlias(importPath, aliasConfig, baseDir) {
    if (!importPath) {
      return importPath;
    }

    // 规范化导入路径
    const normalizedImport = path.normalize(importPath);
    
    // 按别名长度排序，确保最长匹配优先
    const sortedAliases = Object.entries(aliasConfig)
      .sort(([a], [b]) => b.length - a.length);
    
    for (const [alias, realPath] of sortedAliases) {
      if (normalizedImport.startsWith(alias)) {
        // 确保别名匹配是完整的（避免部分匹配）
        const nextChar = normalizedImport[alias.length];
        if (nextChar === undefined || nextChar === '/' || nextChar === '\\') {
          const relativePath = normalizedImport.slice(alias.length);
          const resolvedPath = path.join(realPath, relativePath);
          return this.resolvePath(resolvedPath, baseDir);
        }
      }
    }
    
    return normalizedImport;
  }

  /**
   * 检查文件是否存在并返回详细信息
   */
  checkFileExists(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * 尝试解析文件路径（支持多种扩展名）
   */
  resolveFileWithExtensions(filePath, extensions = ['.vue', '.js', '.ts', '.jsx', '.tsx']) {
    // 如果文件已有扩展名且存在，直接返回
    if (path.extname(filePath) && fs.existsSync(filePath)) {
      return filePath;
    }

    // 尝试添加不同扩展名
    for (const ext of extensions) {
      const fileWithExt = filePath + ext;
      if (fs.existsSync(fileWithExt)) {
        return fileWithExt;
      }
    }

    // 如果是目录，尝试查找index文件
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      for (const ext of extensions) {
        const indexFile = path.join(filePath, 'index' + ext);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }

  /**
   * 提取template部分的依赖
   */
  extractTemplateDependencies(templateContent, aliasConfig, baseDir) {
    const dependencies = [];
    
    // 匹配src属性中的文件引用
    const srcRegex = /src=["']([^"']+)["']/g;
    let match;
    
    while ((match = srcRegex.exec(templateContent)) !== null) {
      const srcPath = match[1];
      if (this.isLocalFile(srcPath)) {
        const resolvedPath = this.resolveAlias(srcPath, aliasConfig, baseDir);
        dependencies.push(resolvedPath);
      }
    }

    return dependencies;
  }

  /**
   * 提取script部分的依赖
   */
  extractScriptDependencies(scriptContent, aliasConfig, baseDir) {
    const dependencies = [];
    
    // 匹配各种形式的import语句
    const importPatterns = [
      // import 'module'
      /import\s+["']([^"']+)["']/g,
      // import something from 'module'
      /import\s+[^\s]+\s+from\s+["']([^"']+)["']/g,
      // import { something } from 'module'
      /import\s+\{[^}]*\}\s+from\s+["']([^"']+)["']/g,
      // import * as something from 'module'
      /import\s+\*\s+as\s+[^\s]+\s+from\s+["']([^"']+)["']/g,
      // import something, { other } from 'module'
      /import\s+[^,]+,\s*\{[^}]*\}\s+from\s+["']([^"']+)["']/g
    ];
    
    for (const regex of importPatterns) {
      let match;
      while ((match = regex.exec(scriptContent)) !== null) {
        const importPath = match[1];
        if (this.isLocalFile(importPath)) {
          const resolvedPath = this.resolveAlias(importPath, aliasConfig, baseDir);
          dependencies.push(resolvedPath);
        }
      }
    }

    // 匹配require语句
    const requireRegex = /require\(["']([^"']+)["']\)/g;
    let requireMatch;
    while ((requireMatch = requireRegex.exec(scriptContent)) !== null) {
      const requirePath = requireMatch[1];
      if (this.isLocalFile(requirePath)) {
        const resolvedPath = this.resolveAlias(requirePath, aliasConfig, baseDir);
        dependencies.push(resolvedPath);
      }
    }

    return dependencies;
  }

  /**
   * 提取style部分的依赖
   */
  extractStyleDependencies(styleContent, aliasConfig, baseDir) {
    const dependencies = [];
    
    // 匹配@import语句
    const importRegex = /@import\s+["']([^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(styleContent)) !== null) {
      const importPath = match[1];
      if (this.isLocalFile(importPath)) {
        const resolvedPath = this.resolveAlias(importPath, aliasConfig, baseDir);
        dependencies.push(resolvedPath);
      }
    }

    // 匹配url()中的文件引用
    const urlRegex = /url\(["']?([^"')]+)["']?\)/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(styleContent)) !== null) {
      const urlPath = urlMatch[1];
      if (this.isLocalFile(urlPath)) {
        const resolvedPath = this.resolveAlias(urlPath, aliasConfig, baseDir);
        dependencies.push(resolvedPath);
      }
    }

    return dependencies;
  }

  /**
   * 判断是否为本地文件
   */
  isLocalFile(filePath) {
    // 排除HTTP URL、node_modules包、绝对URL等
    return !filePath.startsWith('http') && 
           !filePath.startsWith('//') && 
           !filePath.startsWith('data:') && 
           !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(filePath) &&
           !filePath.includes('node_modules');
  }

  /**
   * 递归分析依赖树
   */
  async analyzeDependencyTree(args) {
    try {
      const { filePath, aliasConfig = {}, baseDir = process.cwd(), maxDepth = 10 } = args;

      if (!filePath) {
        throw new McpError(ErrorCode.InvalidParams, 'filePath参数是必需的');
      }

      const visited = new Set();
      const circularDeps = new Set();
      const dependencyTree = await this.buildDependencyTree(
        filePath, aliasConfig, baseDir, visited, circularDeps, 0, maxDepth
      );

      // 收集所有依赖文件
      const allDependencies = this.flattenDependencyTree(dependencyTree);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              entryFile: this.resolvePath(filePath, baseDir),
              dependencyTree,
              allFiles: [...allDependencies],
              summary: {
                totalFiles: allDependencies.size,
                maxDepth: this.getTreeDepth(dependencyTree),
                circularDependencies: [...circularDeps],
                hasCircularDeps: circularDeps.size > 0,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `分析依赖树时发生错误: ${error.message}`
      );
    }
  }

  /**
   * 复制Vue文件及其依赖
   */
  async copyVueDependencies(args) {
    try {
      const { 
        filePath, 
        targetDir = 'output', // 默认复制到output目录
        aliasConfig = {}, 
        baseDir = process.cwd(), 
        includeNodeModules = false 
      } = args;

      if (!filePath) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          'filePath参数是必需的'
        );
      }

      // 确保目标目录存在（支持相对路径和绝对路径）
      const resolvedTargetDir = path.isAbsolute(targetDir) ? targetDir : path.resolve(baseDir, targetDir);
      if (!fs.existsSync(resolvedTargetDir)) {
        fs.mkdirSync(resolvedTargetDir, { recursive: true });
      }

      // 分析依赖树
      const visited = new Set();
      const circularDeps = new Set();
      const dependencyTree = await this.buildDependencyTree(
        filePath, aliasConfig, baseDir, visited, circularDeps, 0, 10
      );

      // 收集所有需要复制的文件
      const allFiles = this.flattenDependencyTree(dependencyTree);
      const copiedFiles = [];
      const errors = [];

      // 复制主文件
      const mainFile = this.resolvePath(filePath, baseDir);
      if (fs.existsSync(mainFile)) {
        const relativePath = path.relative(baseDir, mainFile);
        const targetPath = path.join(resolvedTargetDir, relativePath);
        await this.copyFileWithDir(mainFile, targetPath);
        copiedFiles.push({ source: mainFile, target: targetPath });
      }

      // 复制所有依赖文件
      for (const depFile of allFiles) {
        try {
          if (!includeNodeModules && depFile.includes('node_modules')) {
            continue;
          }

          // 使用优化的文件检查
          const fileInfo = this.checkFileExists(depFile);
          
          if (fileInfo.exists && fileInfo.isFile) {
            const relativePath = path.relative(baseDir, depFile);
            const targetPath = path.join(resolvedTargetDir, relativePath);
            await this.copyFileWithDir(depFile, targetPath);
            copiedFiles.push({ 
              source: depFile, 
              target: targetPath,
              relativePath,
              size: fileInfo.size,
              mtime: fileInfo.mtime
            });
          } else {
            errors.push({ 
              file: depFile, 
              error: fileInfo.exists ? '不是文件' : '文件不存在',
              details: fileInfo.error
            });
          }
        } catch (copyError) {
          errors.push({ file: depFile, error: copyError.message });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              sourceFile: mainFile,
              targetDir: resolvedTargetDir,
              copiedFiles,
              skippedFiles: errors,
              summary: {
                copiedCount: copiedFiles.length,
                skippedCount: errors.length,
                totalSize: copiedFiles.reduce((sum, file) => sum + (file.size || 0), 0),
                includeNodeModules,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `复制依赖文件时发生错误: ${error.message}`
      );
    }
  }

  /**
   * 构建依赖树
   */
  async buildDependencyTree(filePath, aliasConfig, baseDir, visited, circularDeps, depth, maxDepth) {
    const resolvedPath = this.resolvePath(filePath, baseDir);
    
    // 检查循环依赖
    if (visited.has(resolvedPath)) {
      circularDeps.add(resolvedPath);
      return { file: resolvedPath, dependencies: [], circular: true, depth };
    }

    // 检查最大深度
    if (depth >= maxDepth) {
      return { file: resolvedPath, dependencies: [], maxDepthReached: true, depth };
    }

    // 检查文件是否存在
    if (!fs.existsSync(resolvedPath)) {
      return { file: resolvedPath, dependencies: [], notFound: true, depth };
    }

    visited.add(resolvedPath);

    try {
      // 解析当前文件的依赖
      const deps = await this.parseVueDependencies({
        filePath: resolvedPath,
        aliasConfig,
        baseDir
      });

      const parsedDeps = JSON.parse(deps.content[0].text);
      const allFileDeps = [
        ...parsedDeps.dependencies.template,
        ...parsedDeps.dependencies.script,
        ...parsedDeps.dependencies.style
      ];

      const dependencies = [];
      
      // 递归处理每个依赖
       for (const depPath of allFileDeps) {
         try {
           const resolvedDepPath = this.resolveAlias(depPath, aliasConfig, baseDir);
           let fullDepPath;
           
           if (path.isAbsolute(resolvedDepPath)) {
             fullDepPath = resolvedDepPath;
           } else {
             fullDepPath = path.resolve(path.dirname(resolvedPath), resolvedDepPath);
           }

           // 尝试解析文件（支持多种扩展名）
           const actualFilePath = this.resolveFileWithExtensions(fullDepPath);
           
           if (actualFilePath) {
             // 检查文件信息
             const fileInfo = this.checkFileExists(actualFilePath);
             
             if (fileInfo.exists && fileInfo.isFile && this.isSupportedFile(actualFilePath)) {
               const childTree = await this.buildDependencyTree(
                 actualFilePath, aliasConfig, baseDir, new Set(visited), circularDeps, depth + 1, maxDepth
               );
               dependencies.push(childTree);
             } else {
               dependencies.push({ 
                 file: actualFilePath, 
                 dependencies: [], 
                 leaf: true, 
                 depth: depth + 1,
                 fileInfo 
               });
             }
           } else {
             dependencies.push({ 
               file: fullDepPath, 
               dependencies: [], 
               notFound: true, 
               depth: depth + 1,
               originalPath: depPath
             });
           }
         } catch (error) {
           dependencies.push({ 
             file: depPath, 
             dependencies: [], 
             error: error.message, 
             depth: depth + 1 
           });
         }
       }

      visited.delete(resolvedPath);
      return { file: resolvedPath, dependencies, depth };
    } catch (error) {
      visited.delete(resolvedPath);
      return { file: resolvedPath, dependencies: [], error: error.message, depth };
    }
  }

  /**
   * 扁平化依赖树，收集所有文件路径
   */
  flattenDependencyTree(tree) {
    const files = new Set();
    
    const traverse = (node) => {
      if (node.file) {
        files.add(node.file);
      }
      if (node.dependencies && Array.isArray(node.dependencies)) {
        node.dependencies.forEach(traverse);
      }
    };
    
    traverse(tree);
    return files;
  }

  /**
   * 获取依赖树的最大深度
   */
  getTreeDepth(tree) {
    if (!tree.dependencies || tree.dependencies.length === 0) {
      return tree.depth || 0;
    }
    
    return Math.max(...tree.dependencies.map(dep => this.getTreeDepth(dep)));
  }

  /**
   * 复制文件并创建必要的目录
   */
  async copyFileWithDir(sourcePath, targetPath) {
    const targetDir = path.dirname(targetPath);
    
    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 复制文件
    fs.copyFileSync(sourcePath, targetPath);
  }

  /**
   * 判断是否为支持的文件类型
   */
  isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.vue', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.sass', '.less'].includes(ext);
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * 启动服务器
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vue Parser MCP Server started');
  }
}

// 启动服务器
const server = new VueParserServer();
server.start().catch(console.error);