<!-- frontend/src/components/CourseForm.svelte -->
<script>
  export let course = {
    name: "",
    description: "",
    duration: 0,
    level: "",
  };
  export let onSave;
</script>

<form on:submit|preventDefault={() => onSave(course)}>
  <label>
    Name:
    <input type="text" bind:value={course.name} />
  </label>
  <label>
    Description:
    <textarea bind:value={course.description}></textarea>
  </label>
  <label>
    Duration:
    <input type="number" bind:value={course.duration} />
  </label>
  <label>
    Level:
    <input type="text" bind:value={course.level} />
  </label>
  <button type="submit">Save</button>
</form>
