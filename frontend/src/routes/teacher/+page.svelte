<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";

  onMount(() => {
    fetchUser();
  });

  $: teacher = $user;
  $: isTeacher = $user && $user.role === "teacher";
</script>

{#if isTeacher}
  <h2>Chào {teacher.username}!</h2>
  <h1>Teacher Dashboard</h1>
  <a href="/profile">Profile</a>
{:else}
  <h2>You do not have permission to access this page.</h2>
{/if}
