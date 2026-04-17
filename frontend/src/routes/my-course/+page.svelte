<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  // Trang placeholder — chuyển hướng sang /profile (nơi hiển thị khoá học đã học).
  onMount(() => goto("/profile", { replaceState: true }));
</script>

<p>Đang chuyển hướng…</p>
