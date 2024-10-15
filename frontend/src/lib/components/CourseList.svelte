<script>
  import CourseItem from "./CourseItem.svelte"; // Import component CourseItem
  import { paginate, LightPaginationNav } from "svelte-paginate";

  export let courses = []; // Nhận danh sách khóa học từ component cha
  export let isEdit = false;
  export let currentPage = 1; // Biến lưu trữ trang hiện tại
  let pageSize = 8; // Số lượng khóa học trên mỗi trang

  $: paginatedItems = paginate({ items: courses, pageSize, currentPage });
</script>

{#if courses.length > 0}
  <ul class="course-list">
    {#each paginatedItems as course}
      {#if isEdit}
        <CourseItem {course} isEdit="true" />
      {:else}
        <CourseItem {course} />
      {/if}
    {/each}
  </ul>

  <LightPaginationNav
    totalItems={courses.length}
    {pageSize}
    {currentPage}
    limit={1}
    showStepOptions={true}
    on:setPage={(e) => (currentPage = e.detail.page)}
  />
{:else}
  <p>Không có khóa học nào.</p>
{/if}

<style>
  ul {
    padding-left: 0;
  }
  .course-list {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(240px, 1fr)
    ); /* Hiển thị nhiều khóa học trên 1 dòng, min-width 240px */
    grid-gap: 20px;
  }
</style>
