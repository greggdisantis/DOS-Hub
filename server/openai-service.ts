/**
 * OpenAI Service - Direct HTTP calls to bypass sandbox SDK interception
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI Chat Completions API directly
 */
export async function callOpenAI(
  messages: ChatMessage[],
  model: string = "gpt-3.5-turbo",
  maxTokens: number = 500
): Promise<ChatCompletionResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Generate training material from a topic
 */
export async function generateTrainingMaterial(topic: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are the DOS Hub training assistant. You ONLY answer questions about:
- Distinctive Outdoor Structures operations
- DOS Hub software
- installation procedures
- product ordering
- Service Fusion workflows

Generate comprehensive training material on the requested topic. Be detailed, clear, and practical.`,
    },
    {
      role: "user",
      content: `Generate training material about: ${topic}`,
    },
  ];

  const response = await callOpenAI(messages, "gpt-3.5-turbo", 2000);
  return response.choices[0].message.content;
}

/**
 * Generate a quiz from training material
 */
export async function generateQuiz(
  trainingMaterial: string,
  numQuestions: number = 5
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are the DOS Hub training assistant. Generate a quiz based on the provided training material.
Format each question as:
Q1. [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

Be clear, practical, and focused on DOS Hub operations.`,
    },
    {
      role: "user",
      content: `Generate ${numQuestions} quiz questions based on this training material:\n\n${trainingMaterial}`,
    },
  ];

  const response = await callOpenAI(messages, "gpt-3.5-turbo", 2000);
  return response.choices[0].message.content;
}

/**
 * Answer a question about DOS Hub
 */
export async function answerQuestion(question: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are the DOS Hub assistant. You ONLY answer questions about:
- Distinctive Outdoor Structures operations
- DOS Hub software
- installation procedures
- product ordering
- Service Fusion workflows

If a user asks about personal information or unrelated topics, respond with:
"I'm designed only to answer DOS Hub operational questions."

Be helpful, accurate, and concise.`,
    },
    {
      role: "user",
      content: question,
    },
  ];

  const response = await callOpenAI(messages, "gpt-3.5-turbo", 1000);
  return response.choices[0].message.content;
}
