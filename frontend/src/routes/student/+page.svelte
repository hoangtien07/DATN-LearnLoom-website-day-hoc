<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  // Placeholder — điều hướng về /profile cho mọi user.
  onMount(() => goto("/profile", { replaceState: true }));
</script>

<p>Đang chuyển hướng…</p>
