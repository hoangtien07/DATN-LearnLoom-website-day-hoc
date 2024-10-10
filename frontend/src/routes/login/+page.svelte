<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";

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

{#if loggedInUser}
  <p>Xin chào, {loggedInUser.username}!</p>
  <p>Email: {loggedInUser.email}</p>
  <button on:click={logoutWithGoogle}>Log out</button>
{:else}
  <button on:click={loginWithGoogle}>Login with Google</button>
{/if}
