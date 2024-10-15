<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { fetchCourseBySlug, updateCourse, getSubjects } from "$lib/js/api";
  import Editor from "cl-editor";
  import { writable } from "svelte/store";

  let course;
  let slug = $page.params.slug;
  let isLoading = true;
  let editedContent = writable("");

  let subjects = [];

  $: if (!course) {
    fetchCourseBySlug(slug);
  }

  // Fetch course data when the page loads
  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);
      editedContent.set(course.description);
      subjects = await getSubjects();
      subjects = subjects.map((subject) => subject.name);
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  });

  // Function to handle form submission
  const handleUpdateCourse = async () => {
    try {
      course.description = $editedContent;
      await updateCourse(slug, course);
      console.log("Course updated successfully!");
    } catch (error) {
      console.error("Error updating course:", error);
    }
  };

  // Hàm xử lý khi nội dung editor thay đổi
  const handleEditorChange = (event) => {
    editedContent.set(event.detail);
  };

  // Hàm lấy id của video Youtube
  function getYoutubeVideoId(url) {
    const regex = /(?:\/|%3D|v=)([0-9A-Za-z_-]{11})(?:\S+)?/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
</script>

{#if isLoading}
  <p>Loading course information...</p>
{:else}
  <div>
    <h2>Cài đặt trang tổng quan khóa học</h2>
    <form on:submit|preventDefault={handleUpdateCourse}>
      <label for="courseName">
        Tên khóa học:
        <input type="text" id="courseName" bind:value={course.name} />
      </label>

      <label for="courseImage">
        Ảnh khóa học:
        <input type="text" id="courseImage" bind:value={course.image_url} />
      </label>
      <img src={course.image_url} alt={course.name} />

      <label for="overviewVideo">
        Video tổng quan:
        <input
          type="text"
          id="overviewVideo"
          bind:value={course.overviewVideo}
        />
      </label>
      {#if course.overviewVideo}
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/{getYoutubeVideoId(
            course.overviewVideo
          )}"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      {/if}

      <label for="courseSummary">
        Tóm tắt về khóa học:
        <textarea id="courseSummary" bind:value={course.summary}></textarea>
      </label>

      <label for="courseLevel">
        Trình độ:
        <select id="courseLevel" bind:value={course.level}>
          <option value="Sơ cấp">Sơ cấp</option>
          <option value="Trung cấp">Trung cấp</option>
          <option value="Chuyên gia">Chuyên gia</option>
        </select>
      </label>

      <label for="courseSubject">
        Môn học:
        <select id="courseSubject" bind:value={course.subject}>
          {#each subjects as subject}
            <option value={subject}>{subject}</option>
          {/each}
        </select>
      </label>

      <label for="price"
        >Giá:
        <input type="number" id="price" bind:value={course.price} required />
      </label>

      <label for="courseDescription">
        Mô tả khóa học:
        <Editor bind:html={$editedContent} on:change={handleEditorChange} />
      </label>

      <button type="submit">Lưu</button>
    </form>
  </div>
{/if}

<style>
  label {
    display: block;
    margin-bottom: 10px;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 8px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
