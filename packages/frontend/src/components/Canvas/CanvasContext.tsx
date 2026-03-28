import { createContext, useContext } from 'react';

/** 画布上下文 - 用于节点组件与画布之间的通信 */
interface CanvasContextValue {
  openEditDialog: (nodeId: string) => void;
}

export const CanvasContext = createContext<CanvasContextValue>({
  openEditDialog: () => {},
});

export function useCanvasContext() {
  return useContext(CanvasContext);
}
