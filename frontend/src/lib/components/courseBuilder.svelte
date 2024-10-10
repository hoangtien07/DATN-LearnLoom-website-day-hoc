<script>
  import { onMount } from "svelte";
  import { createCourse } from "../../lib/js/api.js";
  import { fetchUser, user } from "../../stores/auth";

  let course = {
    name: "",
    description: "",
    teacher: "",
    overviewVideo: "",
    level: "beginner",
    totalLessons: 0,
    totalDuration: "",
    slug: "",
    visible: true,
    image_url: "",
    price: 0,
    old_price: 0,
    is_pro: false,
    is_published: false,
    is_selling: false,
    published_at: new Date().toISOString(),
    chapters: [],
  };

  let isSubmitting = false;
  let errorMessage = null;

  const handleSubmit = async () => {
    isSubmitting = true;
    errorMessage = null;

    try {
      await createCourse(course);
      // Handle success (e.g., redirect to course details page)
      console.log("Course created successfully!");
    } catch (error) {
      errorMessage = error.message;
    } finally {
      isSubmitting = false;
    }
    window.location.href = "/";
  };

  onMount(() => {
    fetchUser();
    course.teacher = teacher._id;
    console.log(course.teacher);
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
    <textarea id="description" bind:value={course.description} />
  </div>
  <div>
    <label for="overviewVideo">Overview Video URL:</label>
    <input type="text" id="overviewVideo" bind:value={course.overviewVideo} />
  </div>
  <div>
    <label for="level">Level:</label>
    <select id="level" bind:value={course.level}>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
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

<!-- <div>
  <h3>Chapters</h3>
  {#each course.chapters as chapter, index}
    <div>
      <label
        >Chapter Name:
        <input
          type="text"
          bind:value={course.chapters[index].name}
          required
        />
      </label> -->

<!-- Add lesson, quiz, assignment fields as needed -->
<!-- </div>
  {/each}
  <button type="button" on:click={addChapter}>Add Chapter</button>
</div> -->
