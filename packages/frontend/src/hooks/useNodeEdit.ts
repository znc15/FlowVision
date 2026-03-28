import { useState, useCallback, KeyboardEvent } from 'react';
import { useGraphStore } from '../store/graphStore';

interface NodeEditState {
  isEditing: boolean;
  editLabel: string;
  startEdit: () => void;
  handleLabelChange: (value: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
}

/**
 * 节点双击编辑 Hook
 * 双击进入编辑模式，Enter/blur 保存，Escape 取消
 */
export function useNodeEdit(nodeId: string, currentLabel: string): NodeEditState {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(currentLabel);
  const updateNode = useGraphStore((s) => s.updateNode);

  const startEdit = useCallback(() => {
    setEditLabel(currentLabel);
    setIsEditing(true);
  }, [currentLabel]);

  const saveEdit = useCallback(() => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== currentLabel) {
      updateNode(nodeId, { data: { label: trimmed } } as any);
    }
    setIsEditing(false);
  }, [editLabel, currentLabel, nodeId, updateNode]);

  const cancelEdit = useCallback(() => {
    setEditLabel(currentLabel);
    setIsEditing(false);
  }, [currentLabel]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    isEditing,
    editLabel,
    startEdit,
    handleLabelChange: setEditLabel,
    handleKeyDown,
    handleBlur: saveEdit,
  };
}
