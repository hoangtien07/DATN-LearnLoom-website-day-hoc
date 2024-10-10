<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";

  onMount(() => {
    fetchUser();
  });

  $: admin = $user;
  $: isAdmin = $user && $user.role === "admin";
</script>

{#if isAdmin}
  <p>Chào mừng, Admin {admin.username}!</p>

  <div class="admin-menu">
    <a href="/admin/course-management">Quản lý Khóa học</a>
    <a href="/admin/user-management">Quản lý Người dùng</a>
  </div>
{:else}
  <h2>You do not have permission to access this page.</h2>
{/if}

<style>
  .admin-menu {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .admin-menu a {
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
</style>
