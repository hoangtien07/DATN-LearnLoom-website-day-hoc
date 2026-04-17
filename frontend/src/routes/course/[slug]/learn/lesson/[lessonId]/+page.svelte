<script>
  import { onMount } from "svelte";
  import { getItem } from "$lib/js/api";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  let lessonId;
  let slug;
  let lesson = null;
  let isLoading = true;
  let accessError = null; // { kind: 'unauth' | 'not_enrolled' | 'not_found' | 'other', message }

  $: lessonId = $page.params.lessonId;
  $: slug = $page.params.slug;

  $: if (lessonId) {
    loadLesson(lessonId);
  }

  const extractError = (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message =
      error?.response?.data?.message || error?.message || "Lỗi không xác định";
    if (status === 401) return { kind: "unauth", message };
    if (status === 403 && code === "NOT_ENROLLED")
      return { kind: "not_enrolled", message };
    if (status === 404) return { kind: "not_found", message };
    return { kind: "other", message };
  };

  const loadLesson = async (id) => {
    try {
      isLoading = true;
      accessError = null;
      lesson = await getItem("lesson", id);
    } catch (error) {
      console.error("Error fetching lesson data:", error);
      lesson = null;
      accessError = extractError(error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    if (lessonId) loadLesson(lessonId);
  });

  // Hàm lấy id của video Youtube
  function getYoutubeVideoId(url) {
    const regex = /(?:\/|%3D|v=)([0-9A-Za-z_-]{11})(?:\S+)?/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
</script>

{#if isLoading}
  <div class="lesson-state"><p>Đang tải bài học...</p></div>
{:else if accessError?.kind === "unauth"}
  <div class="lesson-state access-block">
    <h3>Bạn cần đăng nhập</h3>
    <p>Vui lòng đăng nhập để tiếp tục học bài này.</p>
    <button
      class="access-btn"
      on:click={() =>
        goto(`/login?redirectTo=/course/${slug}/learn/lesson/${lessonId}`)}
      >Đăng nhập</button
    >
  </div>
{:else if accessError?.kind === "not_enrolled"}
  <div class="lesson-state access-block">
    <h3>Nội dung yêu cầu đăng ký khóa học</h3>
    <p>Hãy đăng ký khóa học để mở toàn bộ bài giảng và bài tập.</p>
    <button class="access-btn" on:click={() => goto(`/course/${slug}`)}
      >Đăng ký khóa học</button
    >
  </div>
{:else if accessError?.kind === "not_found"}
  <div class="lesson-state"><p>Không tìm thấy bài học.</p></div>
{:else if accessError}
  <div class="lesson-state"><p>Lỗi: {accessError.message}</p></div>
{:else if lesson}
  <div class="lesson-content">
    {#if lesson.type === "TextLesson"}
      {#if lesson.content}
        <div class="lesson-html">{@html lesson.content}</div>
      {:else}
        <p class="lesson-empty">Bài học này chưa có nội dung.</p>
      {/if}
    {:else if lesson.type === "VideoLesson"}
      {#if lesson.videoUrl}
        <div class="media-wrapper">
          <iframe
            src="https://www.youtube.com/embed/{getYoutubeVideoId(
              lesson.videoUrl,
            )}"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      {:else}
        <p class="lesson-empty">Bài học này chưa có nội dung.</p>
      {/if}
    {:else if lesson.type === "AudioLesson"}
      {#if lesson.audioUrl}
        <div class="audio-wrapper">
          <audio src={lesson.audioUrl} controls />
        </div>
      {:else}
        <p class="lesson-empty">Bài học này chưa có nội dung.</p>
      {/if}
    {:else if lesson.type === "LiveLesson"}
      {#if lesson.live}
        <a class="live-link" href={lesson.live} target="_blank"
          >Mở phòng học trực tuyến</a
        >
      {:else}
        <p class="lesson-empty">Bài học này chưa có nội dung.</p>
      {/if}
    {:else}
      <p class="lesson-empty">Loại bài học chưa được hỗ trợ.</p>
    {/if}
  </div>
{/if}

<style>
  .lesson-state,
  .lesson-empty {
    color: var(--learn-text-muted);
    font-size: 0.95rem;
  }
  .access-block {
    padding: 2rem;
    border: 1px solid var(--learn-border, #e5e7eb);
    border-radius: 10px;
    background: var(--learn-surface, #fafafa);
    max-width: 520px;
  }
  .access-block h3 {
    margin: 0 0 0.5rem;
  }
  .access-btn {
    margin-top: 1rem;
    padding: 0.6rem 1.2rem;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
  }
  .access-btn:hover {
    background: #1d4ed8;
  }

  .lesson-content {
    color: var(--learn-text);
  }

  .lesson-html {
    max-width: 860px;
    line-height: 1.7;
    color: var(--learn-text);
  }

  .lesson-html :global(h1),
  .lesson-html :global(h2),
  .lesson-html :global(h3),
  .lesson-html :global(h4) {
    color: #102544;
    font-weight: 700;
    margin: 1.2rem 0 0.8rem;
  }

  .lesson-html :global(p),
  .lesson-html :global(li) {
    line-height: 1.7;
    margin-bottom: 0.7rem;
  }

  .lesson-html :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 0.6rem 0;
  }

  .media-wrapper {
    width: 100%;
    max-width: 980px;
    aspect-ratio: 16 / 9;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--learn-border);
    box-shadow: var(--learn-shadow-sm);
  }

  .media-wrapper iframe {
    width: 100%;
    height: 100%;
  }

  .audio-wrapper {
    max-width: 720px;
    border: 1px solid var(--learn-border);
    border-radius: 12px;
    padding: 0.9rem;
    background: var(--learn-surface-soft);
  }

  .audio-wrapper audio {
    width: 100%;
  }

  .live-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 42px;
    padding: 0 1rem;
    border-radius: 999px;
    background: var(--learn-primary);
    color: #fff;
    font-weight: 600;
  }

  .live-link:hover {
    background: var(--learn-primary-hover);
    color: #fff;
  }
</style>
