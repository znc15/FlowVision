import type { AnalyzeMode, CollectedFile } from '../types.js';

/** 构建代码分析的系统提示词 */
export function buildSystemPrompt(mode: AnalyzeMode): string {
  const modeInstructions = MODE_INSTRUCTIONS[mode];

  return `你是一个专业的代码结构分析器。你的任务是分析提供的源代码文件，提取${modeInstructions.description}，并输出标准化的流程图节点和边数据。

## 分析模式：${mode}

${modeInstructions.detail}

## 输出规则

1. 只返回合法 JSON，不包含任何解释文字或 markdown 代码块
2. 格式严格符合以下 GraphData 结构
3. 节点 position 统一为 { "x": 0, "y": 0 }（由前端自动布局）
4. label 使用简洁名称，不超过 30 个字符
5. 每个节点 id 必须唯一
6. 边的 source 和 target 必须引用已有的节点 id

## 节点类型说明

- process: 普通模块/函数/方法（圆角矩形）
- data: 数据文件、配置文件、类型定义（平行四边形）
- group: 目录/命名空间分组容器（虚线边框）
- start: 入口文件/主函数（椭圆）
- end: 终端节点（椭圆）
- decision: 条件分支逻辑（菱形）

## 输出格式

{
  "nodes": [
    {
      "id": "唯一标识",
      "type": "process",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "显示名称",
        "description": "详细说明（可选）",
        "filePath": "相对文件路径（可选）",
        "lineStart": 0,
        "tags": ["标签"]
      }
    }
  ],
  "edges": [
    {
      "id": "边ID",
      "source": "源节点ID",
      "target": "目标节点ID",
      "label": "关系说明（可选）",
      "type": "smoothstep"
    }
  ],
  "meta": {
    "title": "项目名称",
    "description": "分析摘要",
    "analyzeMode": "${mode}"
  }
}`;
}

const MODE_INSTRUCTIONS: Record<AnalyzeMode, { description: string; detail: string }> = {
  module: {
    description: '文件/模块间的依赖关系',
    detail: `分析每个文件的 import/require/from 语句，提取模块之间的依赖关系。

规则：
- 每个源文件对应一个节点（type: "process"）
- 入口文件用 type: "start" 标识
- 配置文件和类型定义文件用 type: "data" 标识
- 同一目录下的文件可用 type: "group" 分组
- import/require 关系对应一条边，source 为导入方，target 为被导入方
- label 使用文件名（不含路径），filePath 填完整相对路径
- 忽略对第三方包（node_modules）的导入，只保留项目内部依赖`,
  },
  function: {
    description: '函数间的调用关系',
    detail: `分析代码中的函数定义与调用关系，提取函数调用图。

规则：
- 每个函数/方法定义对应一个节点（type: "process"）
- 主入口函数用 type: "start" 标识
- 回调/事件处理函数用 type: "data" 标识
- 包含条件分支的关键函数可用 type: "decision" 标识
- 函数 A 调用函数 B，生成一条 A→B 的边
- label 使用函数名，filePath 和 lineStart 填实际位置
- 对于类方法，label 格式为 "ClassName.methodName"
- 忽略标准库函数，只保留项目内定义的函数`,
  },
  class: {
    description: '类/接口的继承与组合关系',
    detail: `分析代码中的类、接口、抽象类定义及其关系。

规则：
- 每个类/接口定义对应一个节点（type: "process"）
- 抽象类/接口用 type: "data" 标识
- 继承关系（extends）生成边，label 为 "extends"
- 实现关系（implements）生成边，label 为 "implements"
- 组合关系（成员变量引用其他类）生成边，label 为 "has"
- 依赖关系（方法参数/返回值引用其他类）生成边，label 为 "uses"
- label 使用类名，filePath 和 lineStart 填实际位置`,
  },
};

/** 构建包含文件内容的用户消息 */
export function buildUserMessage(
  files: CollectedFile[],
  mode: AnalyzeMode,
  projectPath: string,
): string {
  const fileList = files
    .map((f) => `### ${f.path} (${f.language})\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
    .join('\n\n');

  return `请分析以下项目的代码结构，使用 ${mode} 模式提取关系图。

项目路径：${projectPath}
文件数量：${files.length}

${fileList}`;
}
