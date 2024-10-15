<script>
  import { onMount } from "svelte";
  import { fetchCourseBySlug, getItem } from "$lib/js/api";
  import { page } from "$app/stores";
  import CurriculumSidebar from "./CurriculumSidebar.svelte";
  import LessonContent from "./LessonContent.svelte";
  import { user, fetchUser } from "../../../../../stores/auth";

  export let course;
  let selectedItem = null;
  let lessonData = null; // Biến lưu trữ dữ liệu bài học/bài tập

  $: instructor = user;

  const slug = $page.params.slug;

  onMount(async () => {
    await fetchUser();
    course = await fetchCourseBySlug(slug);
  });

  // Hàm lấy thông tin bài học/bài tập dựa trên itemType và itemId
  const fetchLessonData = async (item) => {
    try {
      lessonData = await getItem(item.itemType, item.itemId);
      lessonData.itemType = item.itemType;
    } catch (error) {
      console.error("Error fetching item data:", error);
      lessonData = null; // Reset lessonData nếu có lỗi
    }
  };

  // Xử lý sự kiện 'selectLesson' từ CurriculumSidebar
  const handleLessonSelect = (event) => {
    selectedItem = event.detail;
    fetchLessonData(selectedItem);
  };
</script>

{#if $instructor && $instructor.role === "instructor"}
  {#if course}
    <!-- <CourseEditNav courseName={course.name} /> -->
    <div class="body">
      <CurriculumSidebar {course} on:selectLesson={handleLessonSelect} />
      <div class="content ms-3">
        <LessonContent {lessonData} />
      </div>
    </div>
  {/if}
{/if}

<style>
  .body {
    position: relative;
    display: flex;
  }
  .content {
    flex-basis: 70%;
    padding-left: 20px;
  }
</style>
