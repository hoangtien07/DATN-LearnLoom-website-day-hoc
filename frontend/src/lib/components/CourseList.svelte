<script>
  import CourseItem from "./CourseItem.svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import { createEventDispatcher } from "svelte";

  export let courses = [];
  export let isEdit = false;
  export let selectable = false;
  export let selectedSlugs = new Set();
  export let currentPage = 1;
  let pageSize = 8;

  const dispatch = createEventDispatcher();

  $: paginatedItems = paginate({ items: courses, pageSize, currentPage });
</script>

{#if courses.length > 0}
  <ul class="course-list">
    {#each paginatedItems as course}
      <li class="course-list-item">
        {#if isEdit}
          <CourseItem
            {course}
            isEdit="true"
            {selectable}
            selected={selectedSlugs.has(course.slug)}
            on:courseHidden={(e) => dispatch("courseHidden", e.detail)}
            on:courseUpdated={(e) => dispatch("courseUpdated", e.detail)}
            on:toggleSelect={(e) => dispatch("toggleSelect", e.detail)}
          />
        {:else}
          <CourseItem {course} />
        {/if}
      </li>
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
  .course-list {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
    gap: 18px;
    align-items: stretch;
  }

  .course-list-item {
    min-width: 0;
  }

  @media (max-width: 768px) {
    .course-list {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
  }
</style>
