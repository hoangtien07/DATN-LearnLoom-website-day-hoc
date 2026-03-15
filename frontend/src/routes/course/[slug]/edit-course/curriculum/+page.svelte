<script>
  import { onMount } from "svelte";
  import { fetchCourseBySlug, getItem } from "$lib/js/api";
  import { page } from "$app/stores";
  import CurriculumSidebar from "./CurriculumSidebar.svelte";
  import LessonContent from "./LessonContent.svelte";
  import { user, fetchUser } from "../../../../../stores/auth";

  export let course;
  let selectedItem = null;
  let lessonData = null;
  let isLoading = true;

  $: instructor = user;

  const slug = $page.params.slug;

  onMount(async () => {
    await fetchUser();
    course = await fetchCourseBySlug(slug);
    isLoading = false;
  });

  const fetchLessonData = async (item) => {
    try {
      lessonData = await getItem(item.itemType, item.itemId);
      lessonData.itemType = item.itemType;
    } catch (error) {
      console.error("Error fetching item data:", error);
      lessonData = null;
    }
  };

  const handleLessonSelect = (event) => {
    selectedItem = event.detail;
    fetchLessonData(selectedItem);
  };

  $: selectedItemTitle = selectedItem
    ? `${selectedItem.type || "Nội dung"} - ${selectedItem.itemType}`
    : "Chọn một bài học hoặc bài tập từ danh sách bên trái";
</script>

{#if $instructor && ($instructor.role === "instructor" || $instructor.role === "admin")}
  {#if isLoading}
    <div class="course-edit-empty">Đang tải mục lục khóa học...</div>
  {:else if course}
    <div class="course-edit-toolbar">
      <div>
        <h2 class="course-edit-section-title">Mục lục khóa học</h2>
        <p class="course-edit-section-subtitle">
          Quản lý cấu trúc chương và nội dung bài học bằng một bảng điều khiển
          thống nhất.
        </p>
      </div>
      <span class="course-edit-status">{selectedItemTitle}</span>
    </div>

    <div class="course-edit-grid">
      <div class="course-edit-panel soft">
        <CurriculumSidebar {course} on:selectLesson={handleLessonSelect} />
      </div>
      <div class="course-edit-panel">
        <LessonContent {lessonData} />
      </div>
    </div>
  {:else}
    <div class="course-edit-empty">
      Không tìm thấy dữ liệu mục lục cho khóa học này.
    </div>
  {/if}
{:else}
  <div class="course-edit-empty">
    Bạn không có quyền chỉnh sửa nội dung khóa học này.
  </div>
{/if}
