<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { fetchUser, user } from "../../stores/auth";

  // Placeholder — instructor vào dashboard, user khác về /.
  // Note: hệ thống dùng role "instructor" (không phải "teacher") nên giữ redirect theo role thật.
  onMount(async () => {
    if (!$user) await fetchUser();
    if ($user?.role === "instructor") {
      goto("/instructor/dashboard", { replaceState: true });
    } else {
      goto("/", { replaceState: true });
    }
  });
</script>

<p>Đang chuyển hướng…</p>
