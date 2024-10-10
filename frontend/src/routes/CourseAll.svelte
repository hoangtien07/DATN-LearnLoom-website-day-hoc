<!-- frontend/src/routes/admin/course/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { fetchCourses, deleteCourse } from "$lib/js/api";

  let courses = [];

  onMount(async () => {
    courses = await fetchCourses();
  });

  const handleDelete = async (id) => {
    await deleteCourse(id);
    courses = courses.filter((course) => course._id !== id);
  };
</script>

<h1>Course Management</h1>

<ul>
  {#each courses as course}
    <li>
      <a href={`/course/${course.slug}/edit/`}>{course.name} </a>
      <!-- <button on:click={() => handleDelete(course._id)}>Delete</button> -->
    </li>
  {/each}
</ul>
