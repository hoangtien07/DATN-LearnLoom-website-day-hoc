<script>
  import Header from "./Header.svelte";
  import Footer from "./Footer.svelte";
  import "../app.css";
  import ChatAI from "$lib/components/ChatAI.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import aiImg from "$lib/images/chatAI-1.png";
  import closeImg from "$lib/images/chatAI-2.png";
  import { writable } from "svelte/store";
  import { Tooltip } from "@sveltestrap/sveltestrap";

  const showChat = writable(false);
</script>

<!-- Skip-to-content link cho keyboard/screen reader user -->
<a href="#main-content" class="skip-link">Bỏ qua tới nội dung chính</a>

<div class="app">
  <Header />

  <main id="main-content" tabindex="-1">
    <slot />
  </main>

  <Footer />

  <!-- Global UX components -->
  <Toast />
  <ConfirmModal />

  <!-- Nút ChatAI -->
  <button
    class="chat-button"
    on:click={() => ($showChat = !$showChat)}
    aria-label={$showChat ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
    aria-expanded={$showChat}
  >
    {#if $showChat}
      <Tooltip target="close-ai" placement="right">Đóng</Tooltip>
      <img src={closeImg} alt="" id="close-ai" aria-hidden="true" />
    {:else}
      <Tooltip target="open-ai" placement="right">Trò chuyện với AI</Tooltip>
      <img src={aiImg} alt="" id="open-ai" aria-hidden="true" />
    {/if}
  </button>

  <!-- Hộp thoại ChatAI -->
  {#if $showChat}
    <div class="chat-box" role="dialog" aria-label="Trợ lý AI">
      <ChatAI />
    </div>
  {/if}
</div>

<style>
  /* Skip link — ẩn đến khi focus, cho keyboard user nhảy tới main content */
  .skip-link {
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
    z-index: 99999;
  }
  .skip-link:focus {
    left: 1rem;
    top: 1rem;
    width: auto;
    height: auto;
    padding: 0.5rem 1rem;
    background: #111827;
    color: #fff;
    border-radius: 6px;
    text-decoration: none;
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  /* Focus ring chuẩn cho mọi element tương tác */
  :global(*:focus-visible) {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    position: relative;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* Style cho nút ChatAI */
  .chat-button {
    position: fixed;
    bottom: 20px;
    color: #000;
    background-color: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 1000; /* Đảm bảo nút nằm trên các element khác */
  }
  img {
    height: 80px;
  }
  /* Style cho hộp thoại ChatAI */
  .chat-box {
    position: fixed;
    bottom: 100px;
    left: 20px;
    /* Không bao giờ vượt viewport — tránh tràn trên mobile <400px */
    width: min(92vw, 620px);
    max-width: calc(100vw - 16px);
    background: transparent;
    border: none;
    border-radius: 0;
    z-index: 1000;
  }

  @media (max-width: 768px) {
    .chat-box {
      left: 4vw;
      bottom: 86px;
      width: 92vw;
    }
  }
  /* #close-ai {
    margin-bottom: -20px;
  } */
</style>
