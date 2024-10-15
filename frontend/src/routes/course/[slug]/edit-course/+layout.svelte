<script>
  import { onMount } from "svelte";
  import { fetchCourseBySlug } from "$lib/js/api";
  import { page } from "$app/stores";
  import CourseEditNav from "./CourseEditNav.svelte";

  const slug = $page.params.slug;
  let course = null;

  $: if (!course) {
    fetchCourseBySlug(slug);
  }

  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

{#if course}
  <CourseEditNav courseName={course.name} />
  <slot />
{/if}
