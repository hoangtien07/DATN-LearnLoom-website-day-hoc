<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  // Placeholder — chuyển hướng sang /profile (nơi hiển thị learning path).
  onMount(() => goto("/profile", { replaceState: true }));
</script>

<p>Đang chuyển hướng…</p>
