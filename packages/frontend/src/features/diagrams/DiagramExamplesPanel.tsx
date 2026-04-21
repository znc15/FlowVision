import { useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { useHistoryStore } from '../../store/historyStore';
import { useTabStore } from '../../store/tabStore';
import { getAllDiagramConfigs, getDiagramConfig } from '../diagrams/diagramRegistry';
import { TEMPLATE_CATALOG, getTemplatesByType, DiagramTemplate } from '../diagrams/templateCatalog';
import { DiagramType } from '../../types/graph';

interface DiagramExamplesPanelProps {
  onClose?: () => void;
}

function DiagramExamplesPanel({ onClose }: DiagramExamplesPanelProps) {
  const [selectedType, setSelectedType] = useState<DiagramType | 'all'>('all');
  const replaceGraph = useGraphStore((s) => s.replaceGraph);
  const pushHistory = useHistoryStore((s) => s.pushHistory);
  const { addTab, setActiveTab } = useTabStore();

  const diagramConfigs = getAllDiagramConfigs();
  const filteredTemplates = selectedType === 'all' 
    ? TEMPLATE_CATALOG 
    : getTemplatesByType(selectedType);

  const handleLoadTemplate = (template: DiagramTemplate, inNewTab: boolean) => {
    if (inNewTab) {
      const tabId = addTab(template.name, template.graph);
      setActiveTab(tabId);
    } else {
      pushHistory(template.graph);
      replaceGraph(template.graph);
    }
    onClose?.();
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
        <div>
          <h2 className="text-lg font-bold text-on-surface">图表模板</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">选择模板快速开始</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-surface-container-high flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 px-6 py-3 border-b border-outline-variant/20 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            selectedType === 'all'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          全部
        </button>
        {diagramConfigs.map((config) => (
          <button
            key={config.type}
            onClick={() => setSelectedType(config.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedType === config.type
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            {config.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const config = getDiagramConfig(template.diagramType);
            return (
              <div
                key={template.id}
                className="bg-surface-container-lowest rounded-2xl ghost-border-soft overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="h-32 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-primary/30">{config.icon}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-lg">
                      {config.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">{template.name}</h3>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">{template.description}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleLoadTemplate(template, false)}
                      className="flex-1 py-2 bg-primary text-on-primary text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      使用模板
                    </button>
                    <button
                      onClick={() => handleLoadTemplate(template, true)}
                      className="px-3 py-2 bg-surface-container-high text-on-surface text-xs font-medium rounded-xl hover:bg-surface-container-highest transition-colors"
                      title="在新标签页打开"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2">folder_open</span>
            <p className="text-sm">暂无此类模板</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiagramExamplesPanel;
