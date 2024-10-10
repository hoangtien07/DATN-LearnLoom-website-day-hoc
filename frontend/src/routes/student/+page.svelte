<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";

  onMount(() => {
    fetchUser();
  });

  $: student = $user;
  $: isStudent = $user && $user.role === "student";
</script>

{#if isStudent}
  <h2>Chào {student.username}!</h2>
  <h1>Student Dashboard</h1>
  <a href="/student/profile">Profile</a>
{:else}
  <h2>You do not have permission to access this page.</h2>
{/if}
