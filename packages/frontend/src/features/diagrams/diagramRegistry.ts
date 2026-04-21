import { DiagramType, NodeType } from '../../types/graph';

export interface DiagramConfig {
  type: DiagramType;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
  nodeTypes: NodeType[];
  edgeRelations: string[];
}

const DIAGRAM_REGISTRY: Record<DiagramType, DiagramConfig> = {
  flowchart: {
    type: 'flowchart',
    label: '流程图',
    labelEn: 'Flowchart',
    icon: 'account_tree',
    description: '标准流程图，展示步骤、判断和流程走向',
    nodeTypes: ['process', 'decision', 'start', 'end', 'data', 'group', 'subprocess', 'delay', 'document', 'manual_input', 'annotation', 'connector'],
    edgeRelations: ['association'],
  },
  er: {
    type: 'er',
    label: 'ER 图',
    labelEn: 'ER Diagram',
    icon: 'schema',
    description: '实体关系图，展示数据模型和实体间的关系',
    nodeTypes: ['entity', 'attribute', 'relationship'],
    edgeRelations: ['association', 'aggregation', 'composition', 'inheritance'],
  },
  functional: {
    type: 'functional',
    label: '功能结构图',
    labelEn: 'Functional Structure',
    icon: 'widgets',
    description: '功能分解图，展示系统功能的层次结构',
    nodeTypes: ['function_block', 'input_output', 'control', 'mechanism'],
    edgeRelations: ['association', 'dependency'],
  },
  usecase: {
    type: 'usecase',
    label: '用例图',
    labelEn: 'Use Case Diagram',
    icon: 'person_play',
    description: 'UML 用例图，展示参与者与系统功能的交互',
    nodeTypes: ['actor', 'usecase_item', 'system_boundary'],
    edgeRelations: ['association', 'include', 'extend', 'inheritance'],
  },
  sequence: {
    type: 'sequence',
    label: '时序图',
    labelEn: 'Sequence Diagram',
    icon: 'timeline',
    description: 'UML 时序图，展示对象间的消息交互顺序',
    nodeTypes: ['lifeline', 'activation', 'combined_fragment'],
    edgeRelations: ['message', 'return'],
  },
  uml_class: {
    type: 'uml_class',
    label: 'UML 类图',
    labelEn: 'UML Class Diagram',
    icon: 'class',
    description: 'UML 类图，展示类、接口和枚举的继承与组合关系',
    nodeTypes: ['class', 'interface', 'enum_node'],
    edgeRelations: ['association', 'inheritance', 'dependency', 'aggregation', 'composition'],
  },
  uml_activity: {
    type: 'uml_activity',
    label: 'UML 活动图',
    labelEn: 'UML Activity Diagram',
    icon: 'play_circle',
    description: 'UML 活动图，展示系统活动的控制流',
    nodeTypes: ['process', 'decision', 'start', 'end', 'data', 'subprocess', 'group'],
    edgeRelations: ['association'],
  },
  uml_state: {
    type: 'uml_state',
    label: 'UML 状态图',
    labelEn: 'UML State Diagram',
    icon: 'swap_horiz',
    description: 'UML 状态图，展示对象的状态变迁',
    nodeTypes: ['state', 'initial_state', 'final_state', 'choice'],
    edgeRelations: ['association'],
  },
};

export function getDiagramConfig(type: DiagramType): DiagramConfig {
  return DIAGRAM_REGISTRY[type];
}

export function getAllDiagramConfigs(): DiagramConfig[] {
  return Object.values(DIAGRAM_REGISTRY);
}

export function getNodeTypeLabel(type: NodeType): string {
  const labels: Partial<Record<NodeType, string>> = {
    process: '流程',
    decision: '判断',
    start: '开始',
    end: '结束',
    data: '数据',
    group: '分组',
    subprocess: '子流程',
    delay: '延迟',
    document: '文档',
    manual_input: '手动输入',
    annotation: '注释',
    connector: '连接器',
    entity: '实体',
    attribute: '属性',
    relationship: '关系',
    function_block: '功能块',
    input_output: '输入/输出',
    control: '控制',
    mechanism: '机制',
    actor: '参与者',
    usecase_item: '用例',
    system_boundary: '系统边界',
    lifeline: '生命线',
    activation: '激活',
    combined_fragment: '组合片段',
    class: '类',
    interface: '接口',
    enum_node: '枚举',
    state: '状态',
    initial_state: '初始状态',
    final_state: '终态',
    choice: '选择',
  };
  return labels[type] ?? '节点';
}

export function getNodeTypeIcon(type: NodeType): string {
  const icons: Partial<Record<NodeType, string>> = {
    process: 'crop_square',
    decision: 'diamond',
    start: 'play_circle',
    end: 'stop_circle',
    data: 'database',
    group: 'folder',
    subprocess: 'account_tree',
    delay: 'hourglass_top',
    document: 'article',
    manual_input: 'touch_app',
    annotation: 'sticky_note_2',
    connector: 'radio_button_checked',
    entity: 'table_chart',
    attribute: 'label',
    relationship: 'link',
    function_block: 'widgets',
    input_output: 'input',
    control: 'tune',
    mechanism: 'settings',
    actor: 'person',
    usecase_item: 'oval',
    system_boundary: 'rectangle',
    lifeline: 'vertical_align_bottom',
    activation: 'radio_button_checked',
    combined_fragment: 'dashboard',
    class: 'class',
    interface: 'extension',
    enum_node: 'list',
    state: 'circle',
    initial_state: 'radio_button_checked',
    final_state: 'stop_circle',
    choice: 'diamond',
  };
  return icons[type] ?? 'crop_square';
}
