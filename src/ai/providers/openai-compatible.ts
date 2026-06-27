import OpenAI from "openai";

export type AiProviderConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiCallOptions = {
  systemPrompt: string;
  userPrompt: string;
};

export async function callAiProvider(config: AiProviderConfig, options: AiCallOptions): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });

  const response = await client.chat.completions.create({
    model: config.model,
    temperature: config.temperature ?? 0.2,
    max_tokens: config.maxTokens ?? 6000,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt }
    ]
  });

  return response.choices[0]?.message?.content ?? "";
}
