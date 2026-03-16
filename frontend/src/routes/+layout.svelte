<script>
  import Header from "./Header.svelte";
  import Footer from "./Footer.svelte";
  import "../app.css";
  import ChatAI from "$lib/components/ChatAI.svelte";
  import aiImg from "$lib/images/chatAI-1.png";
  import closeImg from "$lib/images/chatAI-2.png";
  import { writable } from "svelte/store";
  import { Tooltip } from "@sveltestrap/sveltestrap";

  const showChat = writable(false);
</script>

<div class="app">
  <Header />

  <main>
    <slot />
  </main>

  <Footer />

  <!-- Nút ChatAI -->
  <button class="chat-button" on:click={() => ($showChat = !$showChat)}>
    {#if $showChat}
      <Tooltip target="close-ai" placement="right">Close</Tooltip>
      <img src={closeImg} alt="" id="close-ai" />
    {:else}
      <Tooltip target="open-ai" placement="right">Chat with AI</Tooltip>
      <img src={aiImg} alt="" id="open-ai" />
    {/if}
  </button>

  <!-- Hộp thoại ChatAI -->
  {#if $showChat}
    <div class="chat-box">
      <ChatAI />
    </div>
  {/if}
</div>

<style>
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
    bottom: 100px; /* Điều chỉnh vị trí theo ý muốn */
    left: 20px;
    width: min(92vw, 620px);
    background: transparent;
    border: none;
    border-radius: 0;
    z-index: 1000; /* Đảm bảo hộp thoại nằm trên các element khác */
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
