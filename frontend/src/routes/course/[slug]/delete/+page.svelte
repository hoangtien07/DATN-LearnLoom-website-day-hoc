<!-- frontend/src/routes/admin/[id]/delete/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { fetchCourseBySlug, deleteCourse } from "$lib/js/api";
  import { page } from "$app/stores";

  let course = {};
  const slug = $page.params.slug;

  onMount(async () => {
    course = await fetchCourseBySlug(slug);
  });

  const handleDelete = async () => {
    console.log(course._id);
    await deleteCourse(course._id);
    window.location.href = "/";
  };
</script>

<h1>Delete Course</h1>
{#if course}
  <p>Are you sure you want to delete the course "{course.name}"?</p>
  <button on:click={handleDelete}>Yes, Delete</button>
  <a href="/">Cancel</a>
{:else}
  <p>Loading...</p>
{/if}
