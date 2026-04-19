<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { getAuthUrl } from "$lib/js/api";
  import { fetchUser, user } from "../../stores/auth";
  import loginImg from "$lib/images/login.png";
  import { Button } from "@sveltestrap/sveltestrap";

  // Đọc redirectTo từ query + sessionStorage để giữ khi Google OAuth redirect về.
  // Lưu vào sessionStorage vì OAuth flow rời khỏi trang, query string không giữ lại.
  let redirectTo = "/";

  onMount(async () => {
    const fromQuery = $page.url.searchParams.get("redirectTo");
    if (fromQuery) {
      sessionStorage.setItem("loginRedirectTo", fromQuery);
      redirectTo = fromQuery;
    } else {
      redirectTo = sessionStorage.getItem("loginRedirectTo") || "/";
    }

    await fetchUser();
    // Nếu đã login sẵn → redirect luôn.
    if ($user) {
      sessionStorage.removeItem("loginRedirectTo");
      goto(redirectTo, { replaceState: true });
    }
  });

  $: loggedInUser = $user;
  // Sau khi user login qua OAuth callback, $user populate → tự redirect.
  $: if (loggedInUser && typeof window !== "undefined") {
    const target = sessionStorage.getItem("loginRedirectTo") || "/";
    if (target !== "/login") {
      sessionStorage.removeItem("loginRedirectTo");
      goto(target, { replaceState: true });
    }
  }
</script>

<svelte:head>
  <title>Đăng nhập · LearnLoom</title>
</svelte:head>

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
        >Đăng xuất</Button
      >
    {:else}
      <h1 class="mb-4">Đăng nhập</h1>
      {#if redirectTo && redirectTo !== "/"}
        <p class="redirect-hint">
          Sau khi đăng nhập sẽ quay lại:
          <code>{redirectTo}</code>
        </p>
      {/if}
      <Button outline color="primary" href={getAuthUrl("/auth/google")}
        ><i class="bi bi-google me-3"></i> Đăng nhập với Google</Button
      >
    {/if}
  </div>
</div>

<style scoped>
  .login {
    width: 700px;
    max-width: 95vw;
    height: 500px;
    border-radius: 20px;
    border: 2px solid #aaa;
    background-color: #fff;
    padding: 20px;
    margin: 40px auto 0;
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
  .redirect-hint {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 1rem;
    text-align: center;
  }
  .redirect-hint code {
    background: #f3f4f6;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }
</style>
