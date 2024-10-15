<script>
  import { onMount } from "svelte";
  import { enrollCourse, updateOrder } from "$lib/js/api";
  import { goto } from "$app/navigation";

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("slug");
    const courseId = urlParams.get("courseId");
    const userId = urlParams.get("userId");
    const transactionId = urlParams.get("transactionId");

    try {
      await updateOrder(userId, courseId, transactionId);
      await enrollCourse(slug, userId);
      goto(`http://localhost:5173/course/${slug}`);
    } catch (error) {
      console.error("Error redirect to course:", error);
    }
  });
</script>
