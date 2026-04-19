<script>
  import { onMount } from "svelte";
  import { fetchCourses, fetchFilteredCourses } from "$lib/js/api";
  import CourseItem from "$lib/components/CourseItem.svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import StarRating from "svelte-star-rating";

  // Khai báo biến phân trang
  export let currentPage = 1;
  let pageSize = 12;
  $: paginatedItems = paginate({ items: sortedCourses, pageSize, currentPage });

  // BUG-FE-022: Reset về trang 1 khi list courses đổi (filter, search, sort)
  // để tránh đang ở trang 3 rồi filter mới ra list ít hơn → trang 3 trống.
  let lastListKey = "";
  $: {
    const key = `${(courses || []).length}|${sort}|${Object.values(
      filterCriteria || {},
    )
      .map((v) => (Array.isArray(v) ? v.join(",") : v))
      .join("|")}`;
    if (key !== lastListKey) {
      lastListKey = key;
      currentPage = 1;
    }
  }

  // Biến bộ lọc
  export let filterCriteria = {};
  export let courses = [];
  let isLoading = true;

  // Biến sắp xếp
  export let sort = ""; // Giá trị mặc định là rỗng, không sắp xếp

  // Config cho rating star
  const config = {
    fullColor: "#ffa500",
  };

  // Hàm kiểm tra xem có bộ lọc nào đang được áp dụng không
  function hasActiveFilters() {
    return (
      (filterCriteria.subjects && filterCriteria.subjects.length > 0) ||
      (filterCriteria.levels && filterCriteria.levels.length > 0) ||
      (filterCriteria.durations && filterCriteria.durations.length > 0) ||
      (filterCriteria.prices && filterCriteria.prices.length > 0)
    );
  }

  // Hàm sắp xếp khóa học
  $: sortedCourses = sortCourses(courses, sort);

  function sortCourses(courses, sortBy) {
    if (!sortBy) return courses; // Không sắp xếp nếu sortBy rỗng

    return [...courses].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.totalStudentsEnrolled - a.totalStudentsEnrolled; // Sắp xếp theo số lượng học viên giảm dần
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt); // Sắp xếp theo ngày tạo giảm dần
        case "rating":
          return b.avgRating - a.avgRating; // Sắp xếp theo đánh giá giảm dần
        // Thêm các trường hợp sắp xếp khác tại đây (ví dụ: giá, tên, ...)
        default:
          return 0; // Không sắp xếp nếu sortBy không hợp lệ
      }
    });
  }

  async function loadCourses() {
    isLoading = true;
    if (hasActiveFilters()) {
      courses = await fetchFilteredCourses(filterCriteria);
    } else {
      courses = await fetchCourses();
    }
    isLoading = false;
  }

  onMount(() => {
    loadCourses();
  });

  $: if (hasActiveFilters() || sort) {
    // Tải lại khi có bộ lọc hoặc sắp xếp
    loadCourses();
  }
</script>

{#if isLoading}
  <p>Đang tải...</p>
{:else if sortedCourses.length > 0}
  <div class="course-list">
    {#each paginatedItems as course}
      <CourseItem {course} />
    {/each}
  </div>

  <LightPaginationNav
    totalItems={sortedCourses.length}
    {pageSize}
    {currentPage}
    limit={1}
    showStepOptions={true}
    on:setPage={(e) => (currentPage = e.detail.page)}
  />
{:else}
  <p>Không có khóa học nào phù hợp với bộ lọc hiện tại.</p>
{/if}

<style>
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
