<script>
  import { onMount } from "svelte";
  import { getItem } from "$lib/js/api";
  import { page } from "$app/stores";

  let lessonId;
  let lesson = null;
  let isLoading = true;

  $: lessonId = $page.params.lessonId;
  // Khi lessonId thay đổi, gọi lại API để tải bài học mới
  $: if (lessonId) {
    loadLesson(lessonId);
  }

  onMount(async () => {
    try {
      isLoading = true;
      lesson = await getItem("lesson", lessonId);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      isLoading = false;
    }
  });

  // Hàm tải bài học dựa trên lessonId
  const loadLesson = async (lessonId) => {
    try {
      isLoading = true;
      lesson = await getItem("lesson", lessonId);
    } catch (error) {
      console.error("Error fetching lesson data:", error);
    } finally {
      isLoading = false;
    }
  };

  // Hàm lấy id của video Youtube
  function getYoutubeVideoId(url) {
    const regex = /(?:\/|%3D|v=)([0-9A-Za-z_-]{11})(?:\S+)?/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
</script>

{#if isLoading}
  <p>Loading lesson...</p>
{:else if lesson}
  <div class="lesson-content">
    {#if lesson.type === "TextLesson"}
      {#if lesson.content}
        {@html lesson.content}
      {:else}
        <p>Bài học này chưa có nội dung</p>
      {/if}
    {:else if lesson.type === "VideoLesson"}
      {#if lesson.videoUrl}
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/{getYoutubeVideoId(
            lesson.videoUrl
          )}"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      {:else}
        <p>Bài học này chưa có nội dung</p>
      {/if}
    {:else if lesson.type === "AudioLesson"}
      {#if lesson.audioUrl}
        <audio src={lesson.audioUrl} controls />
      {:else}
        <p>Bài học này chưa có nội dung</p>
      {/if}
    {:else if lesson.type === "LiveLesson"}
      {#if lesson.live}
        <a href={lesson.live} target="_blank"
          >Click đường link này để chuyển hướng đến buổi học</a
        >
      {:else}
        <p>Bài học này chưa có nội dung</p>
      {/if}
    {:else}
      <p>Unsupported lesson type.</p>
    {/if}
  </div>
{/if}
