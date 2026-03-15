<script>
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { Button } from "@sveltestrap/sveltestrap";
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
    return {
      courseId: params.get("courseId") || null,
      lessonId: params.get("lessonId") || null,
    };
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
    const { courseId, lessonId } = getCurrentContext();

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
    <h2>Chat với AI Gemini</h2>

    <button on:click={handleClearChat} style="background-color:transparent;">
      <Button size="sm" outline color="danger"
        ><i class="bi bi-trash3-fill"></i> Xóa cuộc trò chuyện</Button
      >
    </button>
  </div>
  <div class="chat-messages">
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
        <div class="message">
          {#if message.role === "ai"}
            <div class="message-content markdown-content">
              {@html formatAiMessage(message.content)}
            </div>
          {:else}
            <p class="message-content">{message.content}</p>
          {/if}
          <div class="button-group">
            <button on:click={() => handleDeleteMessage(index)}
              ><i class="bi bi-trash3-fill"></i></button
            >
            <button on:click={() => handleCopyMessage(message.content)}
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
    display: flex;
    flex-direction: column;
    height: 500px;
    width: 600px;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #aaa;
    padding: 4px 12px;
  }

  .bi-trash3-fill {
    font-size: 14px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }

  .clear-button {
    padding: 5px 10px;
    background-color: transparent;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .message-wrapper {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
  }

  .message-wrapper.user {
    justify-content: flex-end;
  }

  .message {
    position: relative;
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 80%;
    background-color: #ededed;
  }

  .message-content {
    margin: 0;
    word-break: break-word;
  }

  .message.user {
    background-color: #007bff;
    color: #fff;
  }

  .message.ai {
    background-color: #eee;
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
    background-color: rgba(0, 0, 0, 0.08);
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .markdown-content :global(pre) {
    overflow-x: auto;
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    padding: 8px;
    margin: 8px 0;
  }

  .button-group {
    display: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    zoom: 0.8;
  }
  .button-group i {
    color: #999;
    transition: 0.3s ease;
  }

  .button-group button:hover i {
    color: #000;
  }

  .message-wrapper.user .button-group {
    right: 100%;
    margin-right: 4px;
  }

  .message-wrapper.ai .button-group {
    left: 100%;
    margin-left: 8px;
  }

  .message-wrapper:hover .button-group {
    display: flex;
  }

  .button-group button {
    margin-right: 5px;
    padding: 5px 8px;
    background-color: transparent;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
  }

  .chat-input {
    display: flex;
    padding: 10px;
    border-top: 1px solid #ccc;
  }

  .chat-input input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .chat-input input:disabled {
    cursor: not-allowed;
    background-color: #f3f3f3;
  }

  .chat-input button {
    padding: 8px 12px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .chat-input button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
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

  @media (max-width: 768px) {
    .chat-container {
      width: 100%;
      height: 70vh;
    }

    .message {
      max-width: 92%;
    }
  }
</style>
