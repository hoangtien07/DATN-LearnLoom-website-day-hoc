<!-- frontend/src/routes/admin/course/[_id]/edit/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { fetchCourseById, updateCourse } from "$lib/js/api";
  import CourseForm from "$lib/components/courseForm.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  let course = {};
  const slug = $page.params.slug;

  console.log(slug);

  onMount(async () => {
    course = await fetchCourseById(slug);
  });

  const handleSave = async (updatedCourse) => {
    await updateCourse(slug, updatedCourse);
    const from = $page.url.searchParams.get("from");
    goto(from === "admin" ? "/admin/course-management" : "/course");
  };
</script>

<h1>Edit Course</h1>
{#if course}
  <CourseForm {course} onSave={handleSave} />
{:else}
  <p>Loading...</p>
{/if}
