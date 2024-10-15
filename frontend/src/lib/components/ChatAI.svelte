<script>
  import { writable } from "svelte/store";
  import { Button } from "@sveltestrap/sveltestrap";

  // Khởi tạo messages từ localStorage hoặc mảng rỗng nếu chưa có
  let messages = localStorage.getItem("chatHistory")
    ? JSON.parse(localStorage.getItem("chatHistory"))
    : [];

  const userInput = writable("");
  let isLoading = false;

  // Hàm lưu messages vào localStorage
  const saveToLocalStorage = () => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if ($userInput.trim() === "") return;

    messages = [...messages, { role: "user", content: $userInput }];
    // Cuộn xuống tin nhắn người dùng vừa gửi
    setTimeout(() => {
      messages[messages.length - 1].$el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    isLoading = true;

    try {
      const response = await fetch("http://127.0.0.1:8080/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `ask=${encodeURIComponent($userInput)}`,
      });

      const data = await response.json();

      if (data.status === "success") {
        messages = [...messages, { role: "ai", content: data.output }];
        // Tự động cuộn xuống tin nhắn mới nhất
        setTimeout(() => {
          messages[messages.length - 1].$el.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      } else {
        console.error("Lỗi khi gọi API:", data.message);
      }
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
    } finally {
      isLoading = false;
      userInput.set("");
      saveToLocalStorage(); // Lưu vào localStorage sau mỗi lần gửi
    }
  };

  const handleDeleteMessage = (index) => {
    messages = messages.filter((_, i) => i !== index);
    saveToLocalStorage(); // Lưu sau khi xóa
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleClearChat = () => {
    messages = []; // Xóa toàn bộ messages
    saveToLocalStorage(); // Cập nhật localStorage
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
      <div class="message-wrapper {message.role}" bind:this={message.$el}>
        <div class="message">
          <p>{@html message.content}</p>
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
    {#if isLoading}
      <div class="message-wrapper loading">
        <div class="message">
          <p>...</p>
        </div>
      </div>
    {/if}
  </div>
  <form class="chat-input" on:submit={handleSubmit}>
    <input type="text" bind:value={$userInput} placeholder="Nhập tin nhắn..." />
    <button type="submit">Gửi</button>
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

  .message p {
    margin: 0;
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

  .chat-input button {
    padding: 8px 12px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
</style>
