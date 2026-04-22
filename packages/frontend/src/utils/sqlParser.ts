/**
 * SQL 解析器 - 将 CREATE TABLE 语句解析为 ER 图结构
 */

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
  comment?: string;
}

export interface ParsedColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: { table: string; column: string };
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface ParsedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: '1:1' | '1:N' | 'N:M';
}

export interface ParsedSchema {
  tables: ParsedTable[];
  relationships: ParsedRelationship[];
}

/**
 * 解析 SQL DDL 语句，提取表结构和关系
 */
export function parseSQL(sql: string): ParsedSchema {
  const tables: ParsedTable[] = [];
  const relationships: ParsedRelationship[] = [];

  // 标准化 SQL：移除注释、合并多行
  const normalized = sql
    .replace(/--.*$/gm, '') // 移除单行注释
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
    .replace(/\s+/g, ' ')
    .trim();

  // 匹配 CREATE TABLE 语句
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*\w+)?\s*;?/gi;

  let match;
  while ((match = createTableRegex.exec(normalized)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const table = parseTableBody(tableName, body);
    tables.push(table);
  }

  // 提取外键关系
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isForeignKey && col.foreignKeyRef) {
        relationships.push({
          fromTable: table.name,
          fromColumn: col.name,
          toTable: col.foreignKeyRef.table,
          toColumn: col.foreignKeyRef.column,
          type: '1:N', // 默认假设 1:N 关系
        });
      }
    }
  }

  return { tables, relationships };
}

/**
 * 解析 CREATE TABLE 的主体部分
 */
function parseTableBody(tableName: string, body: string): ParsedTable {
  const columns: ParsedColumn[] = [];
  let tableComment: string | undefined;

  // 分割列定义（考虑括号嵌套）
  const parts = splitColumnDefinitions(body);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // 检查表级约束
    if (/^PRIMARY\s+KEY/i.test(trimmed)) {
      // 提取主键列并标记
      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
        for (const pkCol of pkCols) {
          const col = columns.find(c => c.name === pkCol);
          if (col) col.isPrimaryKey = true;
        }
      }
      continue;
    }

    if (/^FOREIGN\s+KEY/i.test(trimmed)) {
      // 提取外键约束
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(\s*[`"]?(\w+)[`"]?\s*\)\s*REFERENCES\s*[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i);
      if (fkMatch) {
        const colName = fkMatch[1];
        const refTable = fkMatch[2];
        const refCol = fkMatch[3];
        const col = columns.find(c => c.name === colName);
        if (col) {
          col.isForeignKey = true;
          col.foreignKeyRef = { table: refTable, column: refCol };
        }
      }
      continue;
    }

    if (/^UNIQUE\s*\(/i.test(trimmed) || /^INDEX\s+/i.test(trimmed) || /^KEY\s+/i.test(trimmed)) {
      continue; // 忽略索引定义
    }

    if (/^CHECK\s*\(/i.test(trimmed)) {
      continue; // 忽略检查约束
    }

    // 解析列定义
    const column = parseColumnDefinition(trimmed);
    if (column) {
      columns.push(column);
    }
  }

  return { name: tableName, columns, comment: tableComment };
}

/**
 * 分割列定义，处理括号嵌套
 */
function splitColumnDefinitions(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * 解析单个列定义
 */
function parseColumnDefinition(def: string): ParsedColumn | null {
  // 匹配列名和类型
  const colMatch = def.match(/^[`"]?(\w+)[`"]?\s+(\w+(?:\s*\([^)]*\))?)/i);
  if (!colMatch) return null;

  const name = colMatch[1];
  let type = colMatch[2].toUpperCase();

  // 提取类型参数
  const typeMatch = type.match(/^(\w+)/);
  const baseType = typeMatch ? typeMatch[1] : type;

  // 检查约束
  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(def);
  const isForeignKey = /\bREFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i.test(def);
  const isNullable = !/\bNOT\s+NULL\b/i.test(def);
  const isUnique = /\bUNIQUE\b/i.test(def);

  // 提取外键引用
  let foreignKeyRef: { table: string; column: string } | undefined;
  if (isForeignKey) {
    const refMatch = def.match(/REFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i);
    if (refMatch) {
      foreignKeyRef = { table: refMatch[1], column: refMatch[2] };
    }
  }

  // 提取默认值
  let defaultValue: string | undefined;
  const defaultMatch = def.match(/DEFAULT\s+(?:'([^']*)'|"([^"]*)"|(\S+))/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1] || defaultMatch[2] || defaultMatch[3];
  }

  // 提取注释
  let comment: string | undefined;
  const commentMatch = def.match(/(?:COMMENT\s+)?['"]([^'"]+)['"]/i);
  if (commentMatch) {
    comment = commentMatch[1];
  }

  return {
    name,
    type: baseType,
    isPrimaryKey,
    isForeignKey,
    foreignKeyRef,
    isNullable,
    isUnique,
    defaultValue,
    comment,
  };
}

/**
 * 将解析的 SQL Schema 转换为 ER 图的 GraphDiff
 */
export function schemaToGraphDiff(schema: ParsedSchema): any {
  const nodes: any[] = [];
  const edges: any[] = [];
  let nodeY = 50;
  const nodeSpacing = 180;

  // 创建实体节点
  for (const table of schema.tables) {
    const attributes = table.columns.map(col => {
      let attr = col.name;
      if (col.isPrimaryKey) attr += ' PK';
      else if (col.isForeignKey) attr += ' FK';
      if (col.isNullable && !col.isPrimaryKey) attr += '?';
      return attr;
    });

    nodes.push({
      id: `entity_${table.name}`,
      type: 'entity',
      position: { x: 100, y: nodeY },
      data: {
        label: table.name,
        attributes,
        description: table.comment,
      },
    });

    nodeY += nodeSpacing;
  }

  // 创建关系连线
  for (const rel of schema.relationships) {
    const sourceId = `entity_${rel.fromTable}`;
    const targetId = `entity_${rel.toTable}`;
    const cardinalityTarget = rel.type === '1:1' ? '1' : 'N';

    edges.push({
      id: `rel_${rel.fromTable}_${rel.fromColumn}_${rel.toTable}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      label: rel.fromColumn,
      data: {
        relation: 'association',
        cardinalitySource: '1',
        cardinalityTarget,
      },
    });
  }

  return {
    add: { nodes, edges },
    update: { nodes: [], edges: [] },
    remove: { nodeIds: [], edgeIds: [] },
    meta: { diagramType: 'er' },
  };
}

/**
 * 构建 SQL 导入上下文提示
 */
export function buildSQLImportContext(sql: string, schema: ParsedSchema): string {
  const tableSummaries = schema.tables.map(t => {
    const cols = t.columns.map(c => {
      let flags = [];
      if (c.isPrimaryKey) flags.push('PK');
      if (c.isForeignKey) flags.push('FK');
      if (!c.isNullable) flags.push('NOT NULL');
      return `  - ${c.name}: ${c.type}${flags.length ? ' [' + flags.join(', ') + ']' : ''}`;
    }).join('\n');
    return `表 ${t.name}:\n${cols}`;
  }).join('\n\n');

  const relSummaries = schema.relationships.length > 0
    ? '\n\n关系:\n' + schema.relationships.map(r =>
        `${r.fromTable}.${r.fromColumn} → ${r.toTable}.${r.toColumn} (${r.type})`
      ).join('\n')
    : '';

  return `已导入 SQL Schema，共 ${schema.tables.length} 个表：

${tableSummaries}
${relSummaries}

SQL 源码：
\`\`\`sql
${sql.slice(0, 3000)}${sql.length > 3000 ? '\n... (已截断)' : ''}
\`\`\``;
}
