import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { NodeType } from '../../types/graph';

interface NodeEditDialogProps {
  nodeId: string | null;
  onClose: () => void;
}

const NODE_TYPES: { value: NodeType; label: string; icon: string }[] = [
  { value: 'process', label: '流程', icon: 'settings' },
  { value: 'decision', label: '判断', icon: 'call_split' },
  { value: 'start', label: '开始', icon: 'play_circle' },
  { value: 'end', label: '结束', icon: 'stop_circle' },
  { value: 'data', label: '数据', icon: 'database' },
  { value: 'group', label: '分组', icon: 'folder' },
];

function NodeEditDialog({ nodeId, onClose }: NodeEditDialogProps) {
  const nodes = useGraphStore((s) => s.nodes);
  const updateNode = useGraphStore((s) => s.updateNode);
  const removeNode = useGraphStore((s) => s.removeNode);

  const node = nodes.find((n) => n.id === nodeId);

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NodeType>('process');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
      setType(node.type);
      setTags(node.data.tags?.join(', ') || '');
      setColor(node.data.color || '');
    }
  }, [node]);

  const handleSave = useCallback(() => {
    if (!nodeId || !label.trim()) return;
    const parsedTags = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    updateNode(nodeId, {
      type,
      data: {
        ...node?.data,
        label: label.trim(),
        description: description.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        color: color || undefined,
      },
    });
    onClose();
  }, [nodeId, label, description, type, tags, color, node, updateNode, onClose]);

  const handleDelete = useCallback(() => {
    if (!nodeId) return;
    removeNode(nodeId);
    onClose();
  }, [nodeId, removeNode, onClose]);

  if (!nodeId || !node) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] ghost-border-soft animate-[scaleIn_250ms_ease-out]">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">edit</span>
            编辑节点
          </h3>
          <button onClick={onClose} className="icon-button-soft h-7 w-7">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* 表单 */}
        <div className="px-5 py-4 space-y-4">
          {/* 节点类型 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">节点类型</label>
            <div className="grid grid-cols-3 gap-1.5">
              {NODE_TYPES.map((nt) => (
                <button
                  key={nt.value}
                  onClick={() => setType(nt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    type === nt.value
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{nt.icon}</span>
                  {nt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 节点名称 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">节点名称</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="输入节点名称..."
              className="w-full bg-slate-50 rounded-lg py-2.5 px-3 text-xs text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              autoFocus
            />
          </div>

          {/* 节点描述 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入节点描述..."
              rows={3}
              className="w-full bg-slate-50 rounded-lg py-2.5 px-3 text-xs text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">标签（逗号分隔，可选）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如: API, 核心, 入口"
              className="w-full bg-slate-50 rounded-lg py-2.5 px-3 text-xs text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors duration-150"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            删除节点
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!label.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NodeEditDialog;
