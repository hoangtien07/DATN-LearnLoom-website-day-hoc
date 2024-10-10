<!-- frontend/src/routes/admin/[id]/delete/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { fetchCourseById, deleteCourse } from "$lib/js/api";
  import { page } from "$app/stores";

  let course = {};
  const id = $page.params.id;

  onMount(async () => {
    course = await fetchCourseById(id);
  });

  const handleDelete = async () => {
    await deleteCourse(id);
    window.location.href = "/admin/course";
  };
</script>

<h1>Delete Course</h1>
{#if course}
  <p>Are you sure you want to delete the course "{course.name}"?</p>
  <button on:click={handleDelete}>Yes, Delete</button>
  <a href="/admin/course">Cancel</a>
{:else}
  <p>Loading...</p>
{/if}
