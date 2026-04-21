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

// 博客系统 ER 模型
const BLOG_ER_TEMPLATE: GraphData = {
  nodes: [
    { id: 'blog-user', type: 'entity', position: { x: 100, y: 100 }, data: { label: '用户', attributes: ['id: INT', 'username: VARCHAR', 'password: VARCHAR', 'role: ENUM'] } },
    { id: 'blog-post', type: 'entity', position: { x: 400, y: 50 }, data: { label: '文章', attributes: ['id: INT', 'title: VARCHAR', 'content: TEXT', 'created_at: DATETIME'] } },
    { id: 'blog-comment', type: 'entity', position: { x: 400, y: 280 }, data: { label: '评论', attributes: ['id: INT', 'content: TEXT', 'created_at: DATETIME'] } },
    { id: 'blog-category', type: 'entity', position: { x: 700, y: 100 }, data: { label: '分类', attributes: ['id: INT', 'name: VARCHAR', 'slug: VARCHAR'] } },
    { id: 'blog-tag', type: 'entity', position: { x: 700, y: 280 }, data: { label: '标签', attributes: ['id: INT', 'name: VARCHAR'] } },
  ],
  edges: [
    { id: 'e1', source: 'blog-user', target: 'blog-post', label: '发布', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e2', source: 'blog-user', target: 'blog-comment', label: '评论', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e3', source: 'blog-post', target: 'blog-comment', label: '包含', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e4', source: 'blog-category', target: 'blog-post', label: '分类', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e5', source: 'blog-tag', target: 'blog-post', label: '标签', data: { cardinalitySource: 'M', cardinalityTarget: 'N' } },
  ],
  meta: { title: '博客系统 ER 模型', diagramType: 'er' },
};

// 权限管理 ER 模型
const RBAC_ER_TEMPLATE: GraphData = {
  nodes: [
    { id: 'rbac-user', type: 'entity', position: { x: 100, y: 150 }, data: { label: '用户', attributes: ['id: INT', 'username: VARCHAR', 'email: VARCHAR'] } },
    { id: 'rbac-role', type: 'entity', position: { x: 400, y: 100 }, data: { label: '角色', attributes: ['id: INT', 'name: VARCHAR', 'description: TEXT'] } },
    { id: 'rbac-permission', type: 'entity', position: { x: 700, y: 100 }, data: { label: '权限', attributes: ['id: INT', 'resource: VARCHAR', 'action: VARCHAR'] } },
    { id: 'rbac-user-role', type: 'entity', position: { x: 250, y: 300 }, data: { label: '用户角色', attributes: ['user_id: INT', 'role_id: INT'] } },
    { id: 'rbac-role-perm', type: 'entity', position: { x: 550, y: 300 }, data: { label: '角色权限', attributes: ['role_id: INT', 'permission_id: INT'] } },
  ],
  edges: [
    { id: 'e1', source: 'rbac-user', target: 'rbac-user-role', label: '分配', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e2', source: 'rbac-role', target: 'rbac-user-role', label: '关联', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e3', source: 'rbac-role', target: 'rbac-role-perm', label: '拥有', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
    { id: 'e4', source: 'rbac-permission', target: 'rbac-role-perm', label: '关联', data: { cardinalitySource: '1', cardinalityTarget: 'N' } },
  ],
  meta: { title: 'RBAC 权限模型', diagramType: 'er' },
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

// 支付流程时序图
const PAYMENT_SEQUENCE: GraphData = {
  nodes: [
    { id: 'pay1', type: 'lifeline', position: { x: 80, y: 50 }, data: { label: '用户' } },
    { id: 'pay2', type: 'lifeline', position: { x: 250, y: 50 }, data: { label: '商城系统' } },
    { id: 'pay3', type: 'lifeline', position: { x: 420, y: 50 }, data: { label: '支付网关' } },
    { id: 'pay4', type: 'lifeline', position: { x: 590, y: 50 }, data: { label: '银行系统' } },
    { id: 'pay5', type: 'lifeline', position: { x: 760, y: 50 }, data: { label: '通知服务' } },
  ],
  edges: [
    { id: 'e1', source: 'pay1', target: 'pay2', label: '发起支付', data: { relation: 'message' } },
    { id: 'e2', source: 'pay2', target: 'pay3', label: '创建支付订单', data: { relation: 'message' } },
    { id: 'e3', source: 'pay3', target: 'pay4', label: '扣款请求', data: { relation: 'message' } },
    { id: 'e4', source: 'pay4', target: 'pay3', label: '扣款结果', data: { relation: 'return' } },
    { id: 'e5', source: 'pay3', target: 'pay2', label: '支付回调', data: { relation: 'message' } },
    { id: 'e6', source: 'pay2', target: 'pay5', label: '发送通知', data: { relation: 'message' } },
    { id: 'e7', source: 'pay5', target: 'pay1', label: '短信/邮件通知', data: { relation: 'message' } },
    { id: 'e8', source: 'pay2', target: 'pay1', label: '支付成功', data: { relation: 'return' } },
  ],
  meta: { title: '支付流程时序图', diagramType: 'sequence' },
};

// JWT 认证时序图
const JWT_AUTH_SEQUENCE: GraphData = {
  nodes: [
    { id: 'jwt1', type: 'lifeline', position: { x: 100, y: 50 }, data: { label: '客户端' } },
    { id: 'jwt2', type: 'lifeline', position: { x: 300, y: 50 }, data: { label: 'API 网关' } },
    { id: 'jwt3', type: 'lifeline', position: { x: 500, y: 50 }, data: { label: '认证服务' } },
    { id: 'jwt4', type: 'lifeline', position: { x: 700, y: 50 }, data: { label: '用户服务' } },
  ],
  edges: [
    { id: 'e1', source: 'jwt1', target: 'jwt2', label: '请求 + Token', data: { relation: 'message' } },
    { id: 'e2', source: 'jwt2', target: 'jwt3', label: '验证 Token', data: { relation: 'message' } },
    { id: 'e3', source: 'jwt3', target: 'jwt2', label: '用户信息', data: { relation: 'return' } },
    { id: 'e4', source: 'jwt2', target: 'jwt4', label: '业务请求', data: { relation: 'message' } },
    { id: 'e5', source: 'jwt4', target: 'jwt2', label: '业务响应', data: { relation: 'return' } },
    { id: 'e6', source: 'jwt2', target: 'jwt1', label: 'API 响应', data: { relation: 'return' } },
  ],
  meta: { title: 'JWT 认证时序图', diagramType: 'sequence' },
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

// MVC 架构类图
const MVC_CLASS_TEMPLATE: GraphData = {
  nodes: [
    { id: 'mvc1', type: 'class', position: { x: 100, y: 100 }, data: { label: 'UserController', attributes: ['-userService: UserService'], methods: ['+getUser()', '+createUser()', '+updateUser()'] } },
    { id: 'mvc2', type: 'class', position: { x: 400, y: 100 }, data: { label: 'UserService', attributes: ['-userRepository: Repository'], methods: ['+findById()', '+save()', '+delete()'] } },
    { id: 'mvc3', type: 'class', position: { x: 700, y: 100 }, data: { label: 'User', attributes: ['-id: Long', '-name: String', '-email: String'], methods: ['+getId()', '+setName()'] } },
    { id: 'mvc4', type: 'interface', position: { x: 400, y: 300 }, data: { label: 'Repository<T>', methods: ['+findById()', '+save()', '+delete()'] } },
    { id: 'mvc5', type: 'class', position: { x: 650, y: 300 }, data: { label: 'UserRepository', attributes: [], methods: ['+findByEmail()'] } },
  ],
  edges: [
    { id: 'e1', source: 'mvc1', target: 'mvc2', label: 'uses', data: { relation: 'dependency' } },
    { id: 'e2', source: 'mvc2', target: 'mvc3', label: 'manages', data: { relation: 'association' } },
    { id: 'e3', source: 'mvc2', target: 'mvc4', label: 'uses', data: { relation: 'dependency' } },
    { id: 'e4', source: 'mvc5', target: 'mvc4', data: { relation: 'inheritance' } },
  ],
  meta: { title: 'MVC 架构类图', diagramType: 'uml_class' },
};

// 观察者模式类图
const OBSERVER_PATTERN_TEMPLATE: GraphData = {
  nodes: [
    { id: 'obs1', type: 'interface', position: { x: 350, y: 50 }, data: { label: 'Observer', methods: ['+update(data)'] } },
    { id: 'obs2', type: 'class', position: { x: 150, y: 200 }, data: { label: 'ConcreteObserverA', attributes: ['-state: any'], methods: ['+update(data)'] } },
    { id: 'obs3', type: 'class', position: { x: 450, y: 200 }, data: { label: 'ConcreteObserverB', attributes: ['-state: any'], methods: ['+update(data)'] } },
    { id: 'obs4', type: 'class', position: { x: 350, y: 380 }, data: { label: 'Subject', attributes: ['-observers: List<Observer>'], methods: ['+attach()', '+detach()', '+notify()'] } },
  ],
  edges: [
    { id: 'e1', source: 'obs2', target: 'obs1', data: { relation: 'inheritance' } },
    { id: 'e2', source: 'obs3', target: 'obs1', data: { relation: 'inheritance' } },
    { id: 'e3', source: 'obs4', target: 'obs1', label: 'manages', data: { relation: 'aggregation', cardinalitySource: '1', cardinalityTarget: '*' } },
  ],
  meta: { title: '观察者模式', diagramType: 'uml_class' },
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

// 用户注册流程
const USER_REGISTER_FLOW: GraphData = {
  nodes: [
    { id: 'r1', type: 'start', position: { x: 300, y: 50 }, data: { label: '开始' } },
    { id: 'r2', type: 'process', position: { x: 300, y: 150 }, data: { label: '用户填写注册表单' } },
    { id: 'r3', type: 'decision', position: { x: 300, y: 280 }, data: { label: '表单验证' } },
    { id: 'r4', type: 'process', position: { x: 100, y: 400 }, data: { label: '显示错误信息' } },
    { id: 'r5', type: 'decision', position: { x: 500, y: 400 }, data: { label: '用户名是否已存在' } },
    { id: 'r6', type: 'process', position: { x: 350, y: 520 }, data: { label: '提示用户名已存在' } },
    { id: 'r7', type: 'process', position: { x: 600, y: 520 }, data: { label: '创建用户记录' } },
    { id: 'r8', type: 'process', position: { x: 600, y: 640 }, data: { label: '发送验证邮件' } },
    { id: 'r9', type: 'end', position: { x: 600, y: 760 }, data: { label: '注册成功' } },
  ],
  edges: [
    { id: 'e1', source: 'r1', target: 'r2' },
    { id: 'e2', source: 'r2', target: 'r3' },
    { id: 'e3', source: 'r3', target: 'r4', label: '失败' },
    { id: 'e4', source: 'r3', target: 'r5', label: '成功' },
    { id: 'e5', source: 'r5', target: 'r6', label: '存在' },
    { id: 'e6', source: 'r5', target: 'r7', label: '不存在' },
    { id: 'e7', source: 'r7', target: 'r8' },
    { id: 'e8', source: 'r8', target: 'r9' },
  ],
  meta: { title: '用户注册流程', diagramType: 'flowchart' },
};

// API 请求处理流程
const API_REQUEST_FLOW: GraphData = {
  nodes: [
    { id: 'a1', type: 'start', position: { x: 300, y: 50 }, data: { label: '请求到达' } },
    { id: 'a2', type: 'process', position: { x: 300, y: 150 }, data: { label: '解析请求参数' } },
    { id: 'a3', type: 'decision', position: { x: 300, y: 280 }, data: { label: '身份验证' } },
    { id: 'a4', type: 'process', position: { x: 100, y: 400 }, data: { label: '返回 401 未授权' } },
    { id: 'a5', type: 'decision', position: { x: 500, y: 400 }, data: { label: '权限检查' } },
    { id: 'a6', type: 'process', position: { x: 350, y: 520 }, data: { label: '返回 403 禁止访问' } },
    { id: 'a7', type: 'process', position: { x: 600, y: 520 }, data: { label: '执行业务逻辑' } },
    { id: 'a8', type: 'decision', position: { x: 600, y: 640 }, data: { label: '执行结果' } },
    { id: 'a9', type: 'process', position: { x: 450, y: 760 }, data: { label: '返回错误响应' } },
    { id: 'a10', type: 'process', position: { x: 700, y: 760 }, data: { label: '返回成功响应' } },
    { id: 'a11', type: 'end', position: { x: 600, y: 880 }, data: { label: '请求结束' } },
  ],
  edges: [
    { id: 'e1', source: 'a1', target: 'a2' },
    { id: 'e2', source: 'a2', target: 'a3' },
    { id: 'e3', source: 'a3', target: 'a4', label: '失败' },
    { id: 'e4', source: 'a3', target: 'a5', label: '成功' },
    { id: 'e5', source: 'a5', target: 'a6', label: '无权限' },
    { id: 'e6', source: 'a5', target: 'a7', label: '有权限' },
    { id: 'e7', source: 'a7', target: 'a8' },
    { id: 'e8', source: 'a8', target: 'a9', label: '失败' },
    { id: 'e9', source: 'a8', target: 'a10', label: '成功' },
    { id: 'e10', source: 'a9', target: 'a11' },
    { id: 'e11', source: 'a10', target: 'a11' },
  ],
  meta: { title: 'API 请求处理', diagramType: 'flowchart' },
};

// CI/CD 管道流程
const CICD_PIPELINE: GraphData = {
  nodes: [
    { id: 'c1', type: 'start', position: { x: 300, y: 50 }, data: { label: '代码提交' } },
    { id: 'c2', type: 'process', position: { x: 300, y: 150 }, data: { label: '拉取代码' } },
    { id: 'c3', type: 'process', position: { x: 300, y: 250 }, data: { label: '安装依赖' } },
    { id: 'c4', type: 'decision', position: { x: 300, y: 360 }, data: { label: '代码检查' } },
    { id: 'c5', type: 'process', position: { x: 100, y: 480 }, data: { label: '标记检查失败' } },
    { id: 'c6', type: 'decision', position: { x: 500, y: 480 }, data: { label: '单元测试' } },
    { id: 'c7', type: 'process', position: { x: 350, y: 600 }, data: { label: '标记测试失败' } },
    { id: 'c8', type: 'process', position: { x: 600, y: 600 }, data: { label: '构建应用' } },
    { id: 'c9', type: 'decision', position: { x: 600, y: 720 }, data: { label: '构建结果' } },
    { id: 'c10', type: 'process', position: { x: 450, y: 840 }, data: { label: '通知构建失败' } },
    { id: 'c11', type: 'process', position: { x: 700, y: 840 }, data: { label: '部署到环境' } },
    { id: 'c12', type: 'end', position: { x: 700, y: 960 }, data: { label: '部署完成' } },
  ],
  edges: [
    { id: 'e1', source: 'c1', target: 'c2' },
    { id: 'e2', source: 'c2', target: 'c3' },
    { id: 'e3', source: 'c3', target: 'c4' },
    { id: 'e4', source: 'c4', target: 'c5', label: '失败' },
    { id: 'e5', source: 'c4', target: 'c6', label: '通过' },
    { id: 'e6', source: 'c6', target: 'c7', label: '失败' },
    { id: 'e7', source: 'c6', target: 'c8', label: '通过' },
    { id: 'e8', source: 'c8', target: 'c9' },
    { id: 'e9', source: 'c9', target: 'c10', label: '失败' },
    { id: 'e10', source: 'c9', target: 'c11', label: '成功' },
    { id: 'e11', source: 'c11', target: 'c12' },
  ],
  meta: { title: 'CI/CD 管道', diagramType: 'flowchart' },
};

export const TEMPLATE_CATALOG: DiagramTemplate[] = [
  // 流程图模板
  { id: 'flowchart-order', name: '订单处理流程', nameEn: 'Order Process Flowchart', description: '展示订单从创建到完成的完整流程', diagramType: 'flowchart', graph: FLOWCHART_TEMPLATE },
  { id: 'flowchart-register', name: '用户注册流程', nameEn: 'User Registration Flow', description: '用户注册的完整流程，包含验证和邮件发送', diagramType: 'flowchart', graph: USER_REGISTER_FLOW },
  { id: 'flowchart-api', name: 'API 请求处理', nameEn: 'API Request Handler', description: 'RESTful API 请求的标准处理流程', diagramType: 'flowchart', graph: API_REQUEST_FLOW },
  { id: 'flowchart-cicd', name: 'CI/CD 管道', nameEn: 'CI/CD Pipeline', description: '持续集成和持续部署的自动化流程', diagramType: 'flowchart', graph: CICD_PIPELINE },

  // ER 图模板
  { id: 'er-ecommerce', name: '电商 ER 模型', nameEn: 'E-commerce ER Model', description: '用户、订单、商品之间的关系模型', diagramType: 'er', graph: ER_TEMPLATE },
  { id: 'er-blog', name: '博客系统 ER', nameEn: 'Blog System ER', description: '博客系统的用户、文章、评论、分类模型', diagramType: 'er', graph: BLOG_ER_TEMPLATE },
  { id: 'er-rbac', name: 'RBAC 权限模型', nameEn: 'RBAC Permission Model', description: '基于角色的访问控制权限模型', diagramType: 'er', graph: RBAC_ER_TEMPLATE },

  // 功能结构图模板
  { id: 'functional-order', name: '订单处理功能分解', nameEn: 'Order Processing Decomposition', description: '订单处理系统的功能层次结构', diagramType: 'functional', graph: FUNCTIONAL_TEMPLATE },

  // 用例图模板
  { id: 'usecase-ecommerce', name: '电商系统用例', nameEn: 'E-commerce Use Cases', description: '用户和管理员在电商系统中的用例', diagramType: 'usecase', graph: USECASE_TEMPLATE },

  // 时序图模板
  { id: 'sequence-login', name: '用户登录时序', nameEn: 'User Login Sequence', description: '用户登录过程中各组件的交互顺序', diagramType: 'sequence', graph: SEQUENCE_TEMPLATE },
  { id: 'sequence-payment', name: '支付流程时序', nameEn: 'Payment Flow Sequence', description: '在线支付过程中各系统的交互', diagramType: 'sequence', graph: PAYMENT_SEQUENCE },
  { id: 'sequence-jwt', name: 'JWT 认证时序', nameEn: 'JWT Auth Sequence', description: 'JWT Token 认证的完整交互流程', diagramType: 'sequence', graph: JWT_AUTH_SEQUENCE },

  // 类图模板
  { id: 'uml-class-ecommerce', name: '电商类图', nameEn: 'E-commerce Class Diagram', description: '电商系统的类结构和关系', diagramType: 'uml_class', graph: UML_CLASS_TEMPLATE },
  { id: 'uml-class-mvc', name: 'MVC 架构类图', nameEn: 'MVC Architecture', description: 'MVC 架构模式的类结构', diagramType: 'uml_class', graph: MVC_CLASS_TEMPLATE },
  { id: 'uml-class-observer', name: '观察者模式', nameEn: 'Observer Pattern', description: '观察者设计模式的类结构', diagramType: 'uml_class', graph: OBSERVER_PATTERN_TEMPLATE },

  // 状态图模板
  { id: 'uml-state-order', name: '订单状态图', nameEn: 'Order State Diagram', description: '订单从创建到完成的状态变迁', diagramType: 'uml_state', graph: UML_STATE_TEMPLATE },
];

export function getTemplatesByType(diagramType: DiagramType): DiagramTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.diagramType === diagramType);
}

export function getTemplateById(id: string): DiagramTemplate | undefined {
  return TEMPLATE_CATALOG.find(t => t.id === id);
}
