#!/usr/bin/env node

import { VueParserServer } from './index.js';
import { config } from './testConfig.js';

/**
 * 直接引入index.js进行测试
 * 测试VueParserServer的核心方法
 */

async function testDirectImport() {
  console.log('🚀 开始直接引入测试...\n');
  
  // 创建VueParserServer实例
  const server = new VueParserServer();
  
  // 测试文件路径
  const testFile = config.testFile;
  const baseDir = config.baseDir;
  const aliasConfig = config.aliasConfig;
  
  console.log(`📋 测试文件: ${testFile}`);
  console.log(`📁 基础目录: ${baseDir}\n`);
  
  try {
    // 测试1: parseVueDependencies方法
    console.log('=== 测试1: parseVueDependencies ===');
    const parseResult = await server.parseVueDependencies({
      filePath: testFile,
      aliasConfig: aliasConfig,
      baseDir: baseDir
    });
    
    console.log('✅ parseVueDependencies 执行成功');
    const parseData = JSON.parse(parseResult.content[0].text);
    
    console.log(`📦 总依赖数: ${parseData.summary.totalFiles}`);
    console.log(`📄 Template依赖: ${parseData.summary.templateFiles}个`);
    console.log(`📄 Script依赖: ${parseData.summary.scriptFiles}个`);
    console.log(`🎨 Style依赖: ${parseData.summary.styleFiles}个`);
    console.log(`🔍 Vuex使用: ${parseData.hasVuex ? '是' : '否'}`);
    
    if (parseData.dependencies.script && parseData.dependencies.script.length > 0) {
      console.log('\n📋 Script依赖示例:');
      parseData.dependencies.script.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    if (parseData.dependencies.template && parseData.dependencies.template.length > 0) {
      console.log('\n📋 Template依赖:');
      parseData.dependencies.template.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    // 测试2: analyzeDependencyTree方法
    console.log('\n=== 测试2: analyzeDependencyTree ===');
    const treeResult = await server.analyzeDependencyTree({
      filePath: testFile,
      aliasConfig: aliasConfig,
      baseDir: baseDir,
      maxDepth: 2
    });
    
    console.log('✅ analyzeDependencyTree 执行成功');
    const treeData = JSON.parse(treeResult.content[0].text);
    console.log(`🌳 依赖树深度: ${treeData.depth || '未定义'}`);
    console.log(`📊 扁平化文件数: ${treeData.flattenedFiles ? treeData.flattenedFiles.length : '未定义'}`);
    console.log(`🔄 循环依赖: ${treeData.circularDependencies ? treeData.circularDependencies.length : '未定义'}个`);
    
    // 测试3: copyVueDependencies方法
    console.log('\n=== 测试3: copyVueDependencies ===');
    const targetDir = config.targetDir;
    const copyResult = await server.copyVueDependencies({
      filePath: testFile,
      targetDir: targetDir,
      aliasConfig: aliasConfig,
      baseDir: baseDir
    });
    
    console.log('✅ copyVueDependencies 执行成功');
    const copyData = JSON.parse(copyResult.content[0].text);
    console.log(`📁 复制的文件数: ${copyData.copiedFiles ? copyData.copiedFiles.length : '未定义'}`);
    console.log(`❌ 跳过的文件数: ${copyData.skippedFiles ? copyData.skippedFiles.length : '未定义'}`);
    console.log(`📂 目标目录: ${copyData.targetDirectory || '未定义'}`);
    
    if (copyData.copiedFiles && copyData.copiedFiles.length > 0) {
      console.log('\n📋 复制的文件示例:');
      copyData.copiedFiles.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📊 === 测试总结 ===');
    console.log(`✅ parseVueDependencies: 成功 (${parseData.summary.totalFiles}个依赖)`);
    console.log(`✅ analyzeDependencyTree: 成功 (深度${treeData.depth || '未知'})`);
    console.log(`✅ copyVueDependencies: 成功 (${copyData.copiedFiles ? copyData.copiedFiles.length : '未知'}个文件)`);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.stack) {
      console.error('堆栈信息:', error.stack);
    }
  }
}

// 运行测试
testDirectImport().catch(console.error);