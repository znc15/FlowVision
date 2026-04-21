import { GraphData, DiagramType } from '../../types/graph';

export interface DiagramTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  diagramType: DiagramType;
  thumbnail?: string;
  graph: GraphData;
}

const ER_TEMPLATE: GraphData = {
  nodes: [
    { id: 'er-user', type: 'entity', position: { x: 100, y: 100 }, data: { label: '用户', attributes: ['id: INT', 'name: VARCHAR', 'email: VARCHAR'] } },
    { id: 'er-order', type: 'entity', position: { x: 400, y: 100 }, data: { label: '订单', attributes: ['id: INT', 'user_id: INT', 'total: DECIMAL', 'status: VARCHAR'] } },
    { id: 'er-product', type: 'entity', position: { x: 700, y: 100 }, data: { label: '商品', attributes: ['id: INT', 'name: VARCHAR', 'price: DECIMAL', 'stock: INT'] } },
    { id: 'er-order-item', type: 'entity', position: { x: 550, y: 300 }, data: { label: '订单项', attributes: ['id: INT', 'order_id: INT', 'product_id: INT', 'quantity: INT'] } },
  ],
  edges: [
    { id: 'e1', source: 'er-user', target: 'er-order', label: '下单', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e2', source: 'er-order', target: 'er-order-item', label: '包含', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e3', source: 'er-product', target: 'er-order-item', label: '关联', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
  ],
  meta: { title: '电商订单 ER 模型', diagramType: 'er' },
};

const FUNCTIONAL_TEMPLATE: GraphData = {
  nodes: [
    { id: 'f1', type: 'function_block', position: { x: 300, y: 50 }, data: { label: '订单处理系统' } },
    { id: 'f2', type: 'function_block', position: { x: 100, y: 200 }, data: { label: '订单创建' } },
    { id: 'f3', type: 'function_block', position: { x: 300, y: 200 }, data: { label: '订单支付' } },
    { id: 'f4', type: 'function_block', position: { x: 500, y: 200 }, data: { label: '订单发货' } },
    { id: 'f5', type: 'input_output', position: { x: 50, y: 350 }, data: { label: '用户输入' } },
    { id: 'f6', type: 'control', position: { x: 300, y: 350 }, data: { label: '支付网关' } },
    { id: 'f7', type: 'mechanism', position: { x: 550, y: 350 }, data: { label: '物流系统' } },
  ],
  edges: [
    { id: 'e1', source: 'f1', target: 'f2' },
    { id: 'e2', source: 'f1', target: 'f3' },
    { id: 'e3', source: 'f1', target: 'f4' },
    { id: 'e4', source: 'f5', target: 'f2' },
    { id: 'e5', source: 'f6', target: 'f3' },
    { id: 'e6', source: 'f7', target: 'f4' },
  ],
  meta: { title: '订单处理功能分解', diagramType: 'functional' },
};

const USECASE_TEMPLATE: GraphData = {
  nodes: [
    { id: 'uc1', type: 'actor', position: { x: 50, y: 150 }, data: { label: '用户' } },
    { id: 'uc2', type: 'actor', position: { x: 50, y: 350 }, data: { label: '管理员' } },
    { id: 'uc3', type: 'system_boundary', position: { x: 250, y: 50 }, data: { label: '电商系统' }, width: 400, height: 400 },
    { id: 'uc4', type: 'usecase_item', position: { x: 300, y: 120 }, data: { label: '浏览商品' } },
    { id: 'uc5', type: 'usecase_item', position: { x: 300, y: 200 }, data: { label: '下单购买' } },
    { id: 'uc6', type: 'usecase_item', position: { x: 300, y: 280 }, data: { label: '在线支付' } },
    { id: 'uc7', type: 'usecase_item', position: { x: 300, y: 360 }, data: { label: '管理商品' } },
    { id: 'uc8', type: 'usecase_item', position: { x: 500, y: 200 }, data: { label: '查看订单' } },
  ],
  edges: [
    { id: 'e1', source: 'uc1', target: 'uc4' },
    { id: 'e2', source: 'uc1', target: 'uc5' },
    { id: 'e3', source: 'uc1', target: 'uc8' },
    { id: 'e4', source: 'uc5', target: 'uc6', data: { relation: 'include' } },
    { id: 'e5', source: 'uc2', target: 'uc7' },
    { id: 'e6', source: 'uc2', target: 'uc8' },
  ],
  meta: { title: '电商系统用例图', diagramType: 'usecase' },
};

const SEQUENCE_TEMPLATE: GraphData = {
  nodes: [
    { id: 'seq1', type: 'lifeline', position: { x: 100, y: 50 }, data: { label: '用户' } },
    { id: 'seq2', type: 'lifeline', position: { x: 300, y: 50 }, data: { label: '前端' } },
    { id: 'seq3', type: 'lifeline', position: { x: 500, y: 50 }, data: { label: '后端' } },
    { id: 'seq4', type: 'lifeline', position: { x: 700, y: 50 }, data: { label: '数据库' } },
    { id: 'seq5', type: 'activation', position: { x: 115, y: 150 }, data: { label: '' } },
    { id: 'seq6', type: 'activation', position: { x: 315, y: 180 }, data: { label: '' } },
    { id: 'seq7', type: 'activation', position: { x: 515, y: 220 }, data: { label: '' } },
    { id: 'seq8', type: 'activation', position: { x: 715, y: 280 }, data: { label: '' } },
  ],
  edges: [
    { id: 'e1', source: 'seq1', target: 'seq2', label: '登录请求', data: { relation: 'message', sequenceOrder: 1 } },
    { id: 'e2', source: 'seq2', target: 'seq3', label: '验证用户', data: { relation: 'message', sequenceOrder: 2 } },
    { id: 'e3', source: 'seq3', target: 'seq4', label: '查询用户', data: { relation: 'message', sequenceOrder: 3 } },
    { id: 'e4', source: 'seq4', target: 'seq3', label: '用户数据', data: { relation: 'return', sequenceOrder: 4 } },
    { id: 'e5', source: 'seq3', target: 'seq2', label: 'Token', data: { relation: 'return', sequenceOrder: 5 } },
    { id: 'e6', source: 'seq2', target: 'seq1', label: '登录成功', data: { relation: 'return', sequenceOrder: 6 } },
  ],
  meta: { title: '用户登录时序图', diagramType: 'sequence' },
};

const UML_CLASS_TEMPLATE: GraphData = {
  nodes: [
    { id: 'c1', type: 'class', position: { x: 100, y: 100 }, data: { label: 'User', attributes: ['-id: int', '-name: string', '-email: string'], methods: ['+login()', '+logout()'] } },
    { id: 'c2', type: 'class', position: { x: 400, y: 100 }, data: { label: 'Order', attributes: ['-id: int', '-userId: int', '-total: decimal'], methods: ['+create()', '+cancel()'] } },
    { id: 'c3', type: 'class', position: { x: 700, y: 100 }, data: { label: 'Product', attributes: ['-id: int', '-name: string', '-price: decimal'], methods: ['+updateStock()'] } },
    { id: 'c4', type: 'interface', position: { x: 100, y: 350 }, data: { label: 'IPayable', methods: ['+pay()', '+refund()'] } },
    { id: 'c5', type: 'enum_node', position: { x: 400, y: 350 }, data: { label: 'OrderStatus', attributes: ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'] } },
  ],
  edges: [
    { id: 'e1', source: 'c1', target: 'c2', label: 'places', data: { relation: 'association', cardinalitySource: '1', cardinalityTarget: '*' } },
    { id: 'e2', source: 'c2', target: 'c3', label: 'contains', data: { relation: 'aggregation', cardinalitySource: '1', cardinalityTarget: '*' } },
    { id: 'e3', source: 'c2', target: 'c4', data: { relation: 'inheritance' } },
    { id: 'e4', source: 'c2', target: 'c5', data: { relation: 'dependency' } },
  ],
  meta: { title: '电商系统类图', diagramType: 'uml_class' },
};

const UML_STATE_TEMPLATE: GraphData = {
  nodes: [
    { id: 's1', type: 'initial_state', position: { x: 100, y: 150 }, data: { label: '' } },
    { id: 's2', type: 'state', position: { x: 250, y: 150 }, data: { label: '待支付' } },
    { id: 's3', type: 'state', position: { x: 450, y: 150 }, data: { label: '已支付' } },
    { id: 's4', type: 'state', position: { x: 650, y: 150 }, data: { label: '已发货' } },
    { id: 's5', type: 'state', position: { x: 450, y: 300 }, data: { label: '已完成' } },
    { id: 's6', type: 'final_state', position: { x: 650, y: 300 }, data: { label: '' } },
    { id: 's7', type: 'choice', position: { x: 300, y: 300 }, data: { label: '' } },
  ],
  edges: [
    { id: 'e1', source: 's1', target: 's2', label: '创建订单' },
    { id: 'e2', source: 's2', target: 's3', label: '支付成功' },
    { id: 'e3', source: 's2', target: 's7', label: '超时' },
    { id: 'e4', source: 's7', target: 's6', label: '取消' },
    { id: 'e5', source: 's3', target: 's4', label: '发货' },
    { id: 'e6', source: 's4', target: 's5', label: '确认收货' },
    { id: 'e7', source: 's5', target: 's6', label: '完成' },
  ],
  meta: { title: '订单状态图', diagramType: 'uml_state' },
};

const FLOWCHART_TEMPLATE: GraphData = {
  nodes: [
    { id: 'f1', type: 'start', position: { x: 300, y: 50 }, data: { label: '开始' } },
    { id: 'f2', type: 'process', position: { x: 300, y: 150 }, data: { label: '用户提交订单' } },
    { id: 'f3', type: 'decision', position: { x: 300, y: 280 }, data: { label: '库存检查' } },
    { id: 'f4', type: 'process', position: { x: 100, y: 400 }, data: { label: '通知缺货' } },
    { id: 'f5', type: 'process', position: { x: 500, y: 400 }, data: { label: '创建订单' } },
    { id: 'f6', type: 'decision', position: { x: 500, y: 520 }, data: { label: '支付方式' } },
    { id: 'f7', type: 'process', position: { x: 350, y: 640 }, data: { label: '在线支付' } },
    { id: 'f8', type: 'process', position: { x: 650, y: 640 }, data: { label: '货到付款' } },
    { id: 'f9', type: 'end', position: { x: 500, y: 760 }, data: { label: '结束' } },
  ],
  edges: [
    { id: 'e1', source: 'f1', target: 'f2' },
    { id: 'e2', source: 'f2', target: 'f3' },
    { id: 'e3', source: 'f3', target: 'f4', label: '不足' },
    { id: 'e4', source: 'f3', target: 'f5', label: '充足' },
    { id: 'e5', source: 'f5', target: 'f6' },
    { id: 'e6', source: 'f6', target: 'f7', label: '在线' },
    { id: 'e7', source: 'f6', target: 'f8', label: '货到' },
    { id: 'e8', source: 'f7', target: 'f9' },
    { id: 'e9', source: 'f8', target: 'f9' },
  ],
  meta: { title: '订单处理流程', diagramType: 'flowchart' },
};

export const TEMPLATE_CATALOG: DiagramTemplate[] = [
  { id: 'flowchart-order', name: '订单处理流程', nameEn: 'Order Process Flowchart', description: '展示订单从创建到完成的完整流程', diagramType: 'flowchart', graph: FLOWCHART_TEMPLATE },
  { id: 'er-ecommerce', name: '电商 ER 模型', nameEn: 'E-commerce ER Model', description: '用户、订单、商品之间的关系模型', diagramType: 'er', graph: ER_TEMPLATE },
  { id: 'functional-order', name: '订单处理功能分解', nameEn: 'Order Processing Decomposition', description: '订单处理系统的功能层次结构', diagramType: 'functional', graph: FUNCTIONAL_TEMPLATE },
  { id: 'usecase-ecommerce', name: '电商系统用例', nameEn: 'E-commerce Use Cases', description: '用户和管理员在电商系统中的用例', diagramType: 'usecase', graph: USECASE_TEMPLATE },
  { id: 'sequence-login', name: '用户登录时序', nameEn: 'User Login Sequence', description: '用户登录过程中各组件的交互顺序', diagramType: 'sequence', graph: SEQUENCE_TEMPLATE },
  { id: 'uml-class-ecommerce', name: '电商类图', nameEn: 'E-commerce Class Diagram', description: '电商系统的类结构和关系', diagramType: 'uml_class', graph: UML_CLASS_TEMPLATE },
  { id: 'uml-state-order', name: '订单状态图', nameEn: 'Order State Diagram', description: '订单从创建到完成的状态变迁', diagramType: 'uml_state', graph: UML_STATE_TEMPLATE },
];

export function getTemplatesByType(diagramType: DiagramType): DiagramTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.diagramType === diagramType);
}

export function getTemplateById(id: string): DiagramTemplate | undefined {
  return TEMPLATE_CATALOG.find(t => t.id === id);
}
