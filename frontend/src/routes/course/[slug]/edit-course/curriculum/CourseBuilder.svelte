<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import CurriculumSidebar from "./CurriculumSidebar.svelte";
  import {
    fetchCourseBySlug,
    fetchLessonById,
    updateLesson,
  } from "$lib/js/api";

  let course = {};
  let selectedLesson = null; // Bài học được chọn
  let lessonContent = {}; // Nội dung chi tiết của bài học
  const slug = $page.params.slug;

  // Fetch dữ liệu khóa học khi component được mount
  onMount(async () => {
    course = await fetchCourseBySlug(slug);
  });

  // Chọn bài học từ sidebar và load nội dung
  const selectLesson = async (lessonId) => {
    if (lessonId) {
      selectedLesson = lessonId;
      lessonContent = await fetchLessonById(lessonId);
    } else {
      selectedLesson = null;
      lessonContent = {};
    }
  };

  // Lưu thay đổi cho bài học
  const saveLesson = async () => {
    if (selectedLesson) {
      await updateLesson(selectedLesson, lessonContent);
      alert("Lưu bài học thành công!");
    }
  };
</script>

<div class="course-builder">
  <!-- Sidebar với danh sách các chương và bài học -->
  <CurriculumSidebar {course} on:selectLesson={(e) => selectLesson(e.detail)} />

  <!-- Main content hiển thị thông tin chi tiết về bài học -->
  <div class="lesson-details">
    {#if selectedLesson}
      <h2>{lessonContent.name || "Bài học mới"}</h2>

      <label for="lesson-name">Tên bài học:</label>
      <input type="text" id="lesson-name" bind:value={lessonContent.name} />

      <label for="lesson-description">Mô tả:</label>
      <textarea id="lesson-description" bind:value={lessonContent.description}
      ></textarea>

      <label for="lesson-content">Nội dung:</label>
      <textarea id="lesson-content" bind:value={lessonContent.content}
      ></textarea>

      <button on:click={saveLesson}>Lưu bài học</button>
    {:else}
      <p>Chọn một bài học từ sidebar để hiển thị thông tin.</p>
    {/if}
  </div>
</div>

<style>
  .course-builder {
    display: flex;
  }
  .lesson-details {
    flex-grow: 1;
    padding: 20px;
    background-color: #f9f9f9;
  }
</style>
