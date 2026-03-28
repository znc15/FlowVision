import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// AI Provider 配置
export interface ProviderConfig {
  provider: 'claude' | 'openai';
  apiKey: string;
  model?: string;
  baseURL?: string;
}

// 生成结果
export interface GenerateResult {
  text: string;
  tokensUsed: number;
}

// 模型信息
export interface ModelInfo {
  id: string;
  name: string;
}

// 统一 Provider 接口
interface AIProvider {
  generate(system: string, userMessage: string, maxTokens?: number): Promise<GenerateResult>;
  generateStream(system: string, userMessage: string, maxTokens?: number, thinking?: boolean): AsyncIterable<{ type: 'thinking' | 'text'; content: string }>;
  listModels(): Promise<ModelInfo[]>;
}

// Claude Provider 实现
class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  private isThinkingModel(): boolean {
    return this.model.includes('3-7') || this.model.includes('3.7');
  }

  async generate(system: string, userMessage: string, maxTokens = 4096): Promise<GenerateResult> {
    const params: any = {
      model: this.model,
      system,
      messages: [{ role: 'user', content: userMessage }],
    };

    if (this.isThinkingModel()) {
      params.thinking = { type: 'enabled', budget_tokens: 2048 };
      params.max_tokens = maxTokens + 2048;
    } else {
      params.max_tokens = maxTokens;
    }

    const response = await this.client.messages.create(params);

    const textBlock = response.content.find((c: any) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude 返回了非文本内容');
    }

    return {
      text: textBlock.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  async *generateStream(system: string, userMessage: string, maxTokens = 4096, thinking = false): AsyncIterable<{ type: 'thinking' | 'text'; content: string }> {
    const params: any = {
      model: this.model,
      system,
      messages: [{ role: 'user', content: userMessage }],
    };

    const useThinking = thinking || this.isThinkingModel();
    if (useThinking) {
      params.thinking = { type: 'enabled', budget_tokens: 4096 };
      params.max_tokens = maxTokens + 4096;
    } else {
      params.max_tokens = maxTokens;
    }

    const stream = this.client.messages.stream(params);

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as any;
        if (delta.type === 'thinking_delta') {
          yield { type: 'thinking' as const, content: delta.thinking as string };
        } else if (delta.type === 'text_delta') {
          yield { type: 'text' as const, content: delta.text as string };
        }
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    // Anthropic 无标准模型列表 API，返回静态列表
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4' },
      { id: 'claude-opus-4-20250414', name: 'Claude Opus 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Thinking)' },
    ];
  }
}

// OpenAI Provider 实现
class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    this.model = config.model || 'gpt-4o';
  }

  async generate(system: string, userMessage: string, maxTokens = 4096): Promise<GenerateResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI 返回了空内容');
    }

    return {
      text,
      tokensUsed: (response.usage?.total_tokens) ?? 0,
    };
  }

  async *generateStream(system: string, userMessage: string, maxTokens = 4096, _thinking = false): AsyncIterable<{ type: 'thinking' | 'text'; content: string }> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: 'text', content: delta };
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const list = await this.client.models.list();
      const models: ModelInfo[] = [];
      for await (const model of list) {
        // 过滤出 GPT/chatgpt 系列模型
        if (model.id.startsWith('gpt-') || model.id.startsWith('chatgpt-') || model.id.startsWith('o')) {
          models.push({ id: model.id, name: model.id });
        }
      }
      // 按名称排序
      return models.sort((a, b) => a.id.localeCompare(b.id));
    } catch {
      // 获取失败时返回默认列表
      return [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      ];
    }
  }
}

// 默认模型映射
const DEFAULT_MODELS: Record<string, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

/**
 * 根据配置创建 AI Provider 实例
 * 优先使用请求中的配置，fallback 到环境变量
 */
export function createProvider(config?: Partial<ProviderConfig>): AIProvider {
  const provider = config?.provider || 'claude';

  // 获取 API Key：请求配置 > 环境变量
  let apiKey = config?.apiKey || '';
  if (!apiKey) {
    if (provider === 'claude') {
      apiKey = process.env.ANTHROPIC_API_KEY || '';
    } else {
      apiKey = process.env.OPENAI_API_KEY || '';
    }
  }

  if (!apiKey) {
    const envVar = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(`缺少 API Key，请在设置中配置或设置环境变量 ${envVar}`);
  }

  const finalConfig: ProviderConfig = {
    provider,
    apiKey,
    model: config?.model || DEFAULT_MODELS[provider],
    baseURL: config?.baseURL,
  };

  if (provider === 'openai') {
    return new OpenAIProvider(finalConfig);
  }
  return new ClaudeProvider(finalConfig);
}

// 导出可用 provider 列表
export const AVAILABLE_PROVIDERS = [
  { id: 'claude', name: 'Claude', defaultModel: DEFAULT_MODELS.claude },
  { id: 'openai', name: 'OpenAI', defaultModel: DEFAULT_MODELS.openai },
];

/**
 * 获取指定 provider 的模型列表
 */
export async function listModels(config?: Partial<ProviderConfig>): Promise<ModelInfo[]> {
  try {
    const provider = createProvider(config);
    return await provider.listModels();
  } catch {
    // 缺少 apiKey 时返回默认列表
    const p = config?.provider || 'claude';
    if (p === 'openai') {
      return [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      ];
    }
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4' },
      { id: 'claude-opus-4-20250414', name: 'Claude Opus 4' },
    ];
  }
}
