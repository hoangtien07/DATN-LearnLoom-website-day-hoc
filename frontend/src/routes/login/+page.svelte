<script>
  import { onMount } from "svelte";
  import { getAuthUrl } from "$lib/js/api";
  import { fetchUser, user } from "../../stores/auth";
  import loginImg from "$lib/images/login.png";
  import { Button } from "@sveltestrap/sveltestrap";

  onMount(() => {
    fetchUser();
  });

  $: loggedInUser = $user;
</script>

<div class="login d-flex">
  <div class="login-img">
    <img src={loginImg} alt="" />
  </div>
  <div
    class="d-flex flex-column justify-content-center align-items-center"
    style="flex:1"
  >
    {#if loggedInUser}
      <p class="mb-4">Xin chào, {loggedInUser.username}!</p>

      <Button outline color="primary" href={getAuthUrl("/auth/logout")}
        >Log out</Button
      >
    {:else}
      <h1 class="mb-4">Sign in</h1>
      <Button outline color="primary" href={getAuthUrl("/auth/google")}
        ><i class="bi bi-google me-3"></i> Login with Google</Button
      >
    {/if}
  </div>
</div>

<style scoped>
  .login {
    width: 700px;
    height: 500px;
    border-radius: 20px;
    border: 2px solid #aaa;
    background-color: #fff;
    padding: 20px;
    margin: 0 auto;
    margin-top: 40px;
  }
  .login-img {
    width: 50%;
    background-color: #f0eae3;
    display: flex;
    align-items: center;
  }
  img {
    width: 100%;
  }
</style>
