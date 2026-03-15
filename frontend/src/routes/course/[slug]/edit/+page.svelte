<!-- frontend/src/routes/admin/course/[_id]/edit/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { fetchCourseById, updateCourse } from "$lib/js/api";
  import CourseForm from "$lib/components/courseForm.svelte";
  import { page } from "$app/stores";

  let course = {};
  const slug = $page.params.slug;

  console.log(slug);

  onMount(async () => {
    course = await fetchCourseById(slug);
  });

  const handleSave = async (updatedCourse) => {
    await updateCourse(slug, updatedCourse);
    window.location.href = "/course";
  };
</script>

<h1>Edit Course</h1>
{#if course}
  <CourseForm {course} onSave={handleSave} />
{:else}
  <p>Loading...</p>
{/if}
