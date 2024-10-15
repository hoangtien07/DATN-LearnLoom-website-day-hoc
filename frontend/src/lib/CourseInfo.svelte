<script>
  import { onMount } from "svelte";
  import { createCourse } from "./js/api.js";
  import { fetchUser, user } from "../stores/auth.js";

  import Editor from "cl-editor/src/Editor.svelte";

  let course = {
    name: "",
    description: "",
    teacher: "",
    overviewVideo: "",
    level: "Beginner",
    totalLessons: 0,
    totalDuration: "",
    slug: "",
    totalStudentsEnrolled: 0,
    visible: true,
    image_url: "",
    price: 0,
    old_price: 0,
    is_pro: false,
    is_published: false,
    is_selling: false,
    published_at: new Date().toISOString(),
    sections: [],
  };
  let colors = [
    "#000000",
    "#e60000",
    "#ff9900",
    "#ffff00",
    "#008a00",
    "#0066cc",
    "#9933ff",
    "#ffffff",
    "#facccc",
    "#ffebcc",
    "#ffffcc",
    "#cce8cc",
    "#cce0f5",
    "#ebd6ff",
    "#bbbbbb",
    "#f06666",
    "#ffc266",
    "#ffff66",
    "#66b966",
    "#66a3e0",
    "#c285ff",
    "#888888",
    "#a10000",
    "#b26b00",
    "#b2b200",
    "#006100",
    "#0047b2",
    "#6b24b2",
    "#444444",
    "#5c0000",
    "#663d00",
    "#666600",
    "#003700",
    "#002966",
    "#3d1466",
  ];
  let isSubmitting = false;
  let errorMessage = null;

  const handleSubmit = async () => {
    isSubmitting = true;
    errorMessage = null;

    try {
      await createCourse(course);
      window.location.href = `/course/${course.slug}/edit`;
    } catch (error) {
      errorMessage = error.message;
    } finally {
      isSubmitting = false;
    }
  };

  onMount(async () => {
    await fetchUser();
    if (teacher) {
      course.teacher = teacher._id;
      console.log(course.teacher);
    } else {
      console.log("Teacher not loaded yet");
    }
  });

  $: teacher = $user;
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div>
    <label for="name">Name:</label>
    <input type="text" id="name" bind:value={course.name} />
  </div>
  <div>
    <label for="description">Description:</label>
    <div class="d-flex">
      <Editor {colors} on:change={(evt) => (course.description = evt.detail)} />
      <div>
        {@html course.description}
      </div>
    </div>
  </div>
  <div>
    <label for="overviewVideo">Overview Video URL:</label>
    <input type="text" id="overviewVideo" bind:value={course.overviewVideo} />
  </div>
  <div>
    <label for="level">Level:</label>
    <select id="level" bind:value={course.level}>
      <option value="Beginner">Beginner</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Advanced">Advanced</option>
    </select>
  </div>
  <div>
    <label for="totalLessons">Total Lessons:</label>
    <input type="number" id="totalLessons" bind:value={course.totalLessons} />
  </div>
  <div>
    <label for="totalDuration">Total Duration:</label>
    <input type="text" id="totalDuration" bind:value={course.totalDuration} />
  </div>
  <div>
    <label for="slug">Slug:</label>
    <input type="text" id="slug" bind:value={course.slug} />
  </div>
  <div>
    <label for="image_url">Image URL:</label>
    <input type="text" id="image_url" bind:value={course.image_url} />
  </div>
  <div>
    <label for="price">Price:</label>
    <input type="number" id="price" bind:value={course.price} />
  </div>
  <div>
    <label for="old_price">Old Price:</label>
    <input type="number" id="old_price" bind:value={course.old_price} />
  </div>
  <div>
    <input type="checkbox" id="is_pro" bind:checked={course.is_pro} />
    <label for="is_pro">Pro Course</label>
  </div>
  <div>
    <input
      type="checkbox"
      id="is_published"
      bind:checked={course.is_published}
    />
    <label for="is_published">Published</label>
  </div>
  <div>
    <input type="checkbox" id="is_selling" bind:checked={course.is_selling} />
    <label for="is_selling">Selling</label>
  </div>
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? "Submitting..." : "Create Course"}
  </button>
  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}
</form>
