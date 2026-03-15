import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const HISTORY_LIMIT = Number(process.env.CHAT_HISTORY_LIMIT || 20);

if (!process.env.GEMINI_API_KEY) {
  // Keep startup non-blocking to avoid crashing local dev when chat is unused.
  console.warn(
    "GEMINI_API_KEY is missing. Chat endpoints will return 500 until configured.",
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const toGeminiRole = (role) => (role === "assistant" ? "model" : "user");

const buildContextText = ({ courseId, lessonId }) => {
  const details = [];
  if (courseId) details.push(`courseId=${courseId}`);
  if (lessonId) details.push(`lessonId=${lessonId}`);

  if (details.length === 0) {
    return "";
  }

  return `\nNgữ cảnh học tập hiện tại: ${details.join(", ")}. Hãy ưu tiên trả lời phù hợp với ngữ cảnh này nếu có liên quan.`;
};

const buildContents = ({ history, message, context }) => {
  const trimmedHistory = history.slice(-HISTORY_LIMIT);
  const historyContents = trimmedHistory.map((item) => ({
    role: toGeminiRole(item.role),
    parts: [{ text: item.content }],
  }));

  const userText = `${message}${buildContextText(context)}`;
  return [...historyContents, { role: "user", parts: [{ text: userText }] }];
};

const mapGeminiError = (error) => {
  if (!error) {
    return new Error("Gemini request failed");
  }

  if (error.status === 429) {
    return new Error(
      "Gemini API da vuot quota hoac rate limit. Hay kiem tra billing/quota roi thu lai.",
    );
  }

  if (error.status === 401 || error.status === 403) {
    return new Error(
      "Gemini API key khong hop le hoac khong du quyen truy cap model da chon.",
    );
  }

  return new Error(error.message || "Gemini request failed");
};

export const streamGeminiChat = async ({
  message,
  history = [],
  context = {},
  onChunk,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in server environment");
  }

  try {
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

    const contents = buildContents({ history, message, context });
    const result = await model.generateContentStream({ contents });

    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (!text) continue;

      fullText += text;
      if (onChunk) {
        onChunk(text);
      }
    }

    const finalResponse = await result.response;
    const finishReason =
      finalResponse?.candidates?.[0]?.finishReason ||
      finalResponse?.promptFeedback?.blockReason ||
      "STOP";

    return {
      text: fullText,
      model: DEFAULT_MODEL,
      finishReason,
    };
  } catch (error) {
    throw mapGeminiError(error);
  }
};
