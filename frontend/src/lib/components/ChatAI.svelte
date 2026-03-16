<script>
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { marked } from "marked";
  import {
    clearChatHistory,
    deleteChatMessage,
    getApiBaseUrl,
    getChatHistory,
  } from "$lib/js/api";

  let messages = [];

  const userInput = writable("");
  let isLoading = false;
  const apiBaseUrl = getApiBaseUrl();
  let activeStreamController = null;

  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const escapeHtml = (raw = "") =>
    raw
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatAiMessage = (content = "") => {
    const safeContent = escapeHtml(content);
    return marked.parse(safeContent);
  };

  const getSessionKey = () => {
    const existingKey = localStorage.getItem("chatSessionKey");
    if (existingKey) return existingKey;

    const newKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`;

    localStorage.setItem("chatSessionKey", newKey);
    return newKey;
  };

  const getCurrentContext = () => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname || "";
    const normalizedSegments = path
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    const courseIndex = normalizedSegments.indexOf("course");
    const learnIndex = normalizedSegments.indexOf("learn");

    const courseSlug =
      courseIndex !== -1 && normalizedSegments[courseIndex + 1]
        ? decodeURIComponent(normalizedSegments[courseIndex + 1])
        : null;

    const routeItemType =
      learnIndex !== -1 && normalizedSegments[learnIndex + 1]
        ? normalizedSegments[learnIndex + 1]
        : null;

    const routeItemId =
      learnIndex !== -1 && normalizedSegments[learnIndex + 2]
        ? normalizedSegments[learnIndex + 2]
        : null;

    const itemType = routeItemType === "assignment" ? "assignment" : "lesson";
    const itemId = routeItemId || null;

    return {
      courseId: params.get("courseId") || null,
      lessonId: params.get("lessonId") || itemId,
      itemType,
      courseSlug,
      itemId,
    };
  };

  const getContextLabel = () => {
    const context = getCurrentContext();
    if (!context?.courseSlug || !context?.itemId) {
      return "AI dang ho tro theo ngu canh chung";
    }

    const typeLabel = context.itemType === "assignment" ? "bai tap" : "bai hoc";
    return `AI dang ho tro theo ${typeLabel} hien tai`;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const last = messages[messages.length - 1];
      if (last && last.$el) {
        last.$el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 0);
  };

  const saveToLocalStorage = () => {
    const serializableMessages = messages.map(({ id, role, content }) => ({
      id,
      role,
      content,
    }));

    localStorage.setItem("chatHistory", JSON.stringify(serializableMessages));
  };

  onMount(async () => {
    const sessionKey = getSessionKey();
    const { courseId, lessonId } = getCurrentContext();

    try {
      const history = await getChatHistory({
        sessionKey,
        courseId,
        lessonId,
      });

      messages = (history.messages || []).map((msg) => ({
        id: msg._id,
        role: msg.role === "assistant" ? "ai" : "user",
        content: msg.content,
      }));
      saveToLocalStorage();
      scrollToBottom();
    } catch (error) {
      console.error("Lỗi khi tải lịch sử chat từ backend:", error);
      messages = localStorage.getItem("chatHistory")
        ? JSON.parse(localStorage.getItem("chatHistory"))
        : [];
    }
  });

  onDestroy(() => {
    if (activeStreamController) {
      activeStreamController.abort();
      activeStreamController = null;
    }
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading || $userInput.trim() === "") return;

    const prompt = $userInput.trim();
    userInput.set("");
    const sessionKey = getSessionKey();
    const { courseId, lessonId, itemType, courseSlug } = getCurrentContext();

    messages = [...messages, { role: "user", content: prompt }];
    const userMessageIndex = messages.length - 1;
    const aiMessageIndex = messages.length;
    messages = [...messages, { role: "ai", content: "" }];
    scrollToBottom();
    isLoading = true;

    try {
      if (activeStreamController) {
        activeStreamController.abort();
      }

      activeStreamController = new AbortController();
      const response = await fetch(`${apiBaseUrl}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
        signal: activeStreamController.signal,
        body: JSON.stringify({
          message: prompt,
          sessionKey,
          courseId,
          lessonId,
          itemType,
          courseSlug,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Không thể kết nối tới chat service (${response.status} ${response.statusText})`,
        );
      }

      if (!response.body) {
        throw new Error("Không nhận được dữ liệu stream từ chat service");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processEvent = (block) => {
        if (!block.trim()) {
          return;
        }

        const lines = block.split("\n");
        let event = "message";
        const dataLines = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          }

          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const data = dataLines.join("\n");

        if (!data) return;

        let payload;
        try {
          payload = JSON.parse(data);
        } catch (parseError) {
          console.error("Lỗi parse SSE payload:", parseError, data);
          return;
        }

        if (event === "ready") {
          const next = [...messages];
          next[userMessageIndex] = {
            ...next[userMessageIndex],
            id: payload.messageId,
          };
          messages = next;
          return;
        }

        if (event === "chunk") {
          const next = [...messages];
          next[aiMessageIndex] = {
            ...next[aiMessageIndex],
            role: "ai",
            content:
              (next[aiMessageIndex]?.content || "") + (payload.text || ""),
          };
          messages = next;
          scrollToBottom();
          return;
        }

        if (event === "done") {
          const next = [...messages];
          next[aiMessageIndex] = {
            ...next[aiMessageIndex],
            id: payload.messageId,
            content: payload.text || next[aiMessageIndex]?.content || "",
          };
          messages = next;
          saveToLocalStorage();
          return;
        }

        if (event === "error") {
          throw new Error(payload.message || "Chat stream failed");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          processEvent(block);
        }
      }

      if (buffer.trim()) {
        processEvent(buffer.trim());
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Lỗi khi gọi API:", error);
      const next = [...messages];
      next[aiMessageIndex] = {
        role: "ai",
        content:
          error?.message ||
          "Xin lỗi, hiện tại mình chưa thể phản hồi. Vui lòng thử lại.",
      };
      messages = next;
    } finally {
      activeStreamController = null;
      isLoading = false;
      saveToLocalStorage();
    }
  };

  const handleDeleteMessage = async (index) => {
    const target = messages[index];
    const previousMessages = [...messages];

    messages = messages.filter((_, currentIndex) => currentIndex !== index);
    saveToLocalStorage();

    if (!target?.id) {
      return;
    }

    try {
      await deleteChatMessage({
        messageId: target.id,
        sessionKey: getSessionKey(),
      });
    } catch (error) {
      console.error("Lỗi khi xóa tin nhắn trên backend:", error);
      messages = previousMessages;
      saveToLocalStorage();
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleClearChat = async () => {
    const previousMessages = [...messages];
    const sessionKey = getSessionKey();
    const { courseId, lessonId } = getCurrentContext();

    messages = [];
    saveToLocalStorage();

    try {
      await clearChatHistory({ sessionKey, courseId, lessonId });
    } catch (error) {
      console.error("Lỗi khi xóa lịch sử chat trên backend:", error);
      messages = previousMessages;
      saveToLocalStorage();
    }
  };
</script>

<div class="chat-container">
  <div class="chat-header">
    <div class="chat-header-title">
      <h2><span class="status-dot"></span>Chat voi AI Gemini</h2>
      <p>{getContextLabel()}</p>
    </div>

    <button type="button" class="clear-chat-btn" on:click={handleClearChat}>
      <i class="bi bi-trash3-fill"></i>
      <span>Xóa cuộc trò chuyện</span>
    </button>
  </div>
  <div class="chat-messages" aria-live="polite">
    {#if messages.length === 0}
      <div class="empty-state">
        <i class="bi bi-stars"></i>
        <h3>Sẵn sàng hỗ trợ</h3>
        <p>
          Bạn có thể hỏi về bài học hiện tại, tóm tắt nội dung hoặc yêu cầu giải
          thích từng bước.
        </p>
      </div>
    {/if}

    {#each messages as message, index}
      <div
        class="message-wrapper {message.role} {isLoading &&
        index === messages.length - 1 &&
        message.role === 'ai' &&
        !message.content
          ? 'loading'
          : ''}"
        bind:this={message.$el}
      >
        <div class="avatar" aria-hidden="true">
          {message.role === "ai" ? "AI" : "You"}
        </div>
        <div class="message">
          {#if message.role === "ai"}
            <div class="message-content markdown-content">
              {@html formatAiMessage(message.content)}
            </div>
          {:else}
            <p class="message-content">{message.content}</p>
          {/if}
          <div class="button-group">
            <button
              type="button"
              aria-label="Xóa tin nhắn"
              on:click={() => handleDeleteMessage(index)}
              ><i class="bi bi-trash3-fill"></i></button
            >
            <button
              type="button"
              aria-label="Sao chép tin nhắn"
              on:click={() => handleCopyMessage(message.content)}
              ><i class="bi bi-clipboard-fill"></i></button
            >
          </div>
        </div>
      </div>
    {/each}
  </div>
  <form class="chat-input" on:submit={handleSubmit}>
    <input
      type="text"
      bind:value={$userInput}
      placeholder="Nhập tin nhắn..."
      disabled={isLoading}
      aria-busy={isLoading}
    />
    <button type="submit" disabled={isLoading || !$userInput.trim()}>
      {#if isLoading}
        Đang trả lời...
      {:else}
        Gửi
      {/if}
    </button>
  </form>
</div>

<style>
  .chat-container {
    --chat-surface: #ffffff;
    --chat-surface-soft: #f7fbff;
    --chat-border: #dbe6f4;
    --chat-text: #0f274a;
    --chat-muted: #607089;
    --chat-accent: #0b66ff;
    --chat-accent-strong: #0a53cc;
    --chat-user-bubble: linear-gradient(135deg, #1168f6 0%, #0a4dd8 100%);
    --chat-ai-bubble: #ffffff;
    display: flex;
    flex-direction: column;
    height: min(74vh, 640px);
    width: min(92vw, 620px);
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
    border: 1px solid var(--chat-border);
    border-radius: 20px;
    box-shadow:
      0 24px 56px rgba(8, 34, 74, 0.16),
      0 4px 10px rgba(8, 34, 74, 0.08);
    overflow: hidden;
    color: var(--chat-text);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid var(--chat-border);
    padding: 14px 16px 12px;
    gap: 12px;
    background: linear-gradient(135deg, #f5f9ff 0%, #ffffff 100%);
  }

  .status-dot {
    display: inline-flex;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #20b760;
    box-shadow: 0 0 0 4px rgba(32, 183, 96, 0.15);
    margin-right: 8px;
  }

  .chat-header-title p {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--chat-muted);
    line-height: 1.35;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    line-height: 1.2;
    font-weight: 700;
    display: flex;
    align-items: center;
  }

  .clear-chat-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid #f1c7c7;
    color: #b42318;
    background: #fff6f6;
    border-radius: 10px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      background-color 0.2s ease;
    white-space: nowrap;
  }

  .clear-chat-btn:hover {
    background: #fff0f0;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(180, 35, 24, 0.12);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: radial-gradient(
        circle at 100% 0,
        rgba(15, 102, 255, 0.08),
        transparent 42%
      ),
      radial-gradient(
        circle at 0 100%,
        rgba(19, 175, 106, 0.08),
        transparent 36%
      ),
      var(--chat-surface-soft);
  }

  .empty-state {
    margin: auto;
    text-align: center;
    max-width: 320px;
    color: var(--chat-muted);
    background: rgba(255, 255, 255, 0.8);
    border: 1px dashed var(--chat-border);
    border-radius: 14px;
    padding: 16px 14px;
  }

  .empty-state i {
    font-size: 20px;
    color: #0b66ff;
  }

  .empty-state h3 {
    margin: 8px 0 6px;
    font-size: 15px;
    color: var(--chat-text);
  }

  .empty-state p {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
  }

  .message-wrapper {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    gap: 8px;
    animation: fadeInUp 0.28s ease;
  }

  .message-wrapper.user {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #355070;
    background: #ebf2ff;
    border: 1px solid #d6e3fa;
    flex-shrink: 0;
  }

  .message-wrapper.user .avatar {
    color: #ffffff;
    background: #3d86ff;
    border-color: #3d86ff;
  }

  .message {
    position: relative;
    padding: 10px 12px;
    border-radius: 16px;
    max-width: 80%;
    background-color: var(--chat-ai-bubble);
    border: 1px solid #d7e4f6;
    box-shadow: 0 8px 18px rgba(14, 43, 79, 0.08);
  }

  .message-wrapper.user .message {
    background: var(--chat-user-bubble);
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 12px 24px rgba(11, 78, 197, 0.28);
  }

  .message-content {
    margin: 0;
    word-break: break-word;
    line-height: 1.42;
    font-size: 14px;
  }

  .message-wrapper.user .markdown-content :global(code),
  .message-wrapper.user .markdown-content :global(pre) {
    background-color: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  .message.loading {
    text-align: center;
    font-style: italic;
  }

  .message-wrapper.ai.loading .message-content:empty::before {
    content: "...";
    animation: blink 1s steps(1, end) infinite;
    opacity: 0.8;
  }

  .markdown-content :global(p) {
    margin: 0 0 8px;
  }

  .markdown-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .markdown-content :global(strong) {
    font-weight: 700;
  }

  .markdown-content :global(em) {
    font-style: italic;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 6px 0 8px 18px;
    padding: 0;
  }

  .markdown-content :global(li) {
    margin: 2px 0;
  }

  .markdown-content :global(code) {
    background-color: rgba(10, 47, 96, 0.08);
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .markdown-content :global(pre) {
    overflow-x: auto;
    background-color: rgba(10, 47, 96, 0.08);
    border-radius: 6px;
    padding: 8px;
    margin: 8px 0;
  }

  .button-group {
    display: flex;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    transition: opacity 0.2s ease;
  }

  .button-group i {
    color: #5d6f87;
    transition: 0.3s ease;
  }

  .button-group button:hover i {
    color: #172a45;
  }

  .message-wrapper.user .button-group {
    right: 100%;
    margin-right: 8px;
  }

  .message-wrapper.ai .button-group {
    left: 100%;
    margin-left: 8px;
  }

  .message-wrapper:hover .button-group,
  .message-wrapper:focus-within .button-group {
    opacity: 1;
    pointer-events: auto;
  }

  .button-group button {
    margin-right: 6px;
    width: 30px;
    height: 30px;
    background: #ffffff;
    border: 1px solid #d0ddec;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(15, 40, 90, 0.08);
  }

  .chat-input {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-top: 1px solid var(--chat-border);
    background-color: var(--chat-surface);
  }

  .chat-input input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #cddcf0;
    border-radius: 12px;
    background: #ffffff;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .chat-input input:focus {
    outline: none;
    border-color: #76a9ff;
    box-shadow: 0 0 0 3px rgba(11, 102, 255, 0.15);
  }

  .chat-input input:disabled {
    cursor: not-allowed;
    background-color: #f2f6fb;
  }

  .chat-input button {
    min-width: 92px;
    padding: 10px 14px;
    background: linear-gradient(
      135deg,
      var(--chat-accent) 0%,
      var(--chat-accent-strong) 100%
    );
    color: #fff;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 10px 20px rgba(11, 102, 255, 0.22);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .chat-input button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 24px rgba(11, 102, 255, 0.26);
  }

  .chat-input button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    box-shadow: none;
  }

  @keyframes blink {
    0% {
      opacity: 0.25;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.25;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .chat-container {
      width: 100%;
      height: min(68vh, 580px);
      border-radius: 16px;
    }

    .chat-header {
      padding: 12px;
    }

    h2 {
      font-size: 16px;
    }

    .chat-header-title p {
      font-size: 12px;
      margin-top: 4px;
    }

    .clear-chat-btn {
      padding: 7px 9px;
      font-size: 11px;
    }

    .message {
      max-width: 92%;
    }

    .button-group {
      opacity: 1;
      pointer-events: auto;
      position: static;
      transform: none;
      margin-top: 6px;
    }

    .message-wrapper.user .button-group,
    .message-wrapper.ai .button-group {
      margin: 6px 0 0;
    }

    .message {
      padding-bottom: 8px;
    }

    .chat-input {
      padding: 10px;
      gap: 8px;
    }

    .chat-input button {
      min-width: 76px;
    }
  }
</style>
