<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../stores/auth";

  const loginWithGoogle = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const logoutWithGoogle = () => {
    window.location.href = "http://localhost:5000/auth/logout";
  };

  onMount(() => {
    fetchUser();
  });

  $: loggedInUser = $user;
</script>

<div class="login-modal">
  <button
    on:click={(e) => {
      e.target.parentElement.style.display = "none";
    }}>Close</button
  >

  {#if loggedInUser}
    <p>Xin chào, {loggedInUser.username}!</p>
    <p>Email: {loggedInUser.email}</p>
    <button on:click={logoutWithGoogle}>Log out</button>
  {:else}
    <button on:click={loginWithGoogle}>Login with Google</button>
  {/if}
</div>

<style>
  .login-modal {
    width: 600px;
    height: 400px;
    padding: 20px 40px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    z-index: 10;
  }
</style>
