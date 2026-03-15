<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { fetchCourseBySlug, updateCourse, getSubjects } from "$lib/js/api";
  import Editor from "cl-editor";

  let course;
  let slug = $page.params.slug;
  let isLoading = true;
  let editedContent = "";
  let subjects = [];
  let saveState = "";
  let saveMessage = "";
  let isSaving = false;

  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);
      editedContent = course.description || "";
      subjects = await getSubjects();
      subjects = subjects.map((subject) => subject.name);
    } catch (err) {
      console.error(err);
      saveState = "error";
      saveMessage = "Không thể tải dữ liệu cài đặt khóa học.";
    } finally {
      isLoading = false;
    }
  });

  const handleUpdateCourse = async () => {
    if (isSaving) {
      return;
    }

    isSaving = true;
    saveState = "";
    saveMessage = "Đang lưu thay đổi...";

    try {
      course.description = editedContent;
      await updateCourse(slug, course);
      saveState = "success";
      saveMessage = "Đã lưu cài đặt khóa học thành công.";

      const from = $page.url.searchParams.get("from");
      if (from === "admin") {
        goto("/admin/course-management");
      }
    } catch (error) {
      console.error("Error updating course:", error);
      saveState = "error";
      saveMessage = "Lưu thất bại. Vui lòng thử lại.";
    } finally {
      isSaving = false;
    }
  };

  const handleEditorChange = (event) => {
    editedContent = event.detail;
  };

  function getYoutubeVideoId(url) {
    const regex = /(?:\/|%3D|v=)([0-9A-Za-z_-]{11})(?:\S+)?/;
    const match = url?.match(regex);
    return match ? match[1] : null;
  }
</script>

{#if isLoading}
  <div class="course-edit-empty">Đang tải cài đặt khóa học...</div>
{:else if course}
  <div class="course-settings">
    <div class="course-edit-toolbar">
      <div>
        <h2 class="course-edit-section-title">Cài đặt khóa học</h2>
        <p class="course-edit-section-subtitle">
          Tinh chỉnh thông tin hiển thị, định vị nội dung và mức giá để tăng tỷ
          lệ đăng ký.
        </p>
      </div>
      <button
        class="course-edit-btn primary"
        on:click={handleUpdateCourse}
        disabled={isSaving}
        >{isSaving ? "Đang lưu..." : "Lưu tất cả thay đổi"}</button
      >
    </div>

    {#if saveMessage}
      <p class={`course-edit-status ${saveState}`}>{saveMessage}</p>
    {/if}

    <section class="course-edit-panel">
      <h3 class="panel-heading">Thông tin cơ bản</h3>
      <div class="course-edit-form-grid">
        <div class="course-edit-field">
          <label class="course-edit-label" for="courseName">Tên khóa học</label>
          <input
            id="courseName"
            class="course-edit-input"
            type="text"
            bind:value={course.name}
          />
        </div>

        <div class="course-edit-field">
          <label class="course-edit-label" for="courseLevel">Trình độ</label>
          <select
            id="courseLevel"
            class="course-edit-select"
            bind:value={course.level}
          >
            <option value="Sơ cấp">Sơ cấp</option>
            <option value="Trung cấp">Trung cấp</option>
            <option value="Chuyên gia">Chuyên gia</option>
          </select>
        </div>
      </div>

      <div class="course-edit-field">
        <label class="course-edit-label" for="courseSummary"
          >Tóm tắt khóa học</label
        >
        <textarea
          id="courseSummary"
          class="course-edit-textarea"
          bind:value={course.summary}
          placeholder="Mô tả ngắn giúp học viên hiểu nhanh khóa học có gì"
        ></textarea>
      </div>
    </section>

    <section class="course-edit-panel mt-3">
      <h3 class="panel-heading">Media và preview</h3>
      <div class="course-edit-form-grid">
        <div class="course-edit-field">
          <label class="course-edit-label" for="courseImage">Ảnh đại diện</label
          >
          <input
            id="courseImage"
            class="course-edit-input"
            type="text"
            bind:value={course.image_url}
            placeholder="https://..."
          />
          <p class="course-edit-help">
            Dùng ảnh tỷ lệ ngang để hiển thị đẹp trên trang danh sách khóa học.
          </p>
        </div>

        <div class="course-edit-field">
          <label class="course-edit-label" for="overviewVideo"
            >Video giới thiệu</label
          >
          <input
            id="overviewVideo"
            class="course-edit-input"
            type="text"
            bind:value={course.overviewVideo}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      </div>

      <div class="preview-grid">
        <div class="preview-card">
          <p class="preview-title">Preview ảnh</p>
          {#if course.image_url}
            <img src={course.image_url} alt={course.name} />
          {:else}
            <div class="course-edit-empty compact">Chưa có ảnh đại diện.</div>
          {/if}
        </div>

        <div class="preview-card">
          <p class="preview-title">Preview video</p>
          {#if course.overviewVideo && getYoutubeVideoId(course.overviewVideo)}
            <iframe
              src={`https://www.youtube.com/embed/${getYoutubeVideoId(course.overviewVideo)}`}
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          {:else}
            <div class="course-edit-empty compact">
              Chưa có video preview hợp lệ.
            </div>
          {/if}
        </div>
      </div>
    </section>

    <section class="course-edit-panel mt-3">
      <h3 class="panel-heading">Phân loại và giá bán</h3>
      <div class="course-edit-form-grid">
        <div class="course-edit-field">
          <label class="course-edit-label" for="courseSubject">Môn học</label>
          <select
            id="courseSubject"
            class="course-edit-select"
            bind:value={course.subject}
          >
            {#each subjects as subject}
              <option value={subject}>{subject}</option>
            {/each}
          </select>
        </div>

        <div class="course-edit-field">
          <label class="course-edit-label" for="price">Giá (VND)</label>
          <input
            id="price"
            class="course-edit-input"
            type="number"
            min="0"
            bind:value={course.price}
          />
        </div>
      </div>
    </section>

    <section class="course-edit-panel mt-3">
      <h3 class="panel-heading">Mô tả chi tiết</h3>
      <p class="course-edit-help mb-2">
        Nội dung này hiển thị trong trang chi tiết khóa học và ảnh hưởng lớn đến
        quyết định mua.
      </p>
      <Editor bind:html={editedContent} on:change={handleEditorChange} />
    </section>
  </div>
{:else}
  <div class="course-edit-empty">Không tìm thấy dữ liệu cài đặt khóa học.</div>
{/if}

<style>
  .course-settings {
    min-height: 100%;
  }

  .panel-heading {
    font-size: 1rem;
    font-weight: 700;
    color: #122b5a;
    margin-bottom: 0.85rem;
  }

  .preview-grid {
    margin-top: 0.6rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .preview-card {
    border: 1px solid #d8e4ff;
    border-radius: 12px;
    padding: 0.7rem;
    background: #f8fbff;
  }

  .preview-title {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #4e6592;
    font-weight: 700;
    margin-bottom: 0.45rem;
  }

  .preview-card img {
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid #d3e1ff;
  }

  .preview-card iframe {
    width: 100%;
    height: 280px;
    border-radius: 10px;
    border: 1px solid #d3e1ff;
  }

  .course-edit-empty.compact {
    padding: 0.9rem;
    font-size: 0.82rem;
  }

  @media (max-width: 900px) {
    .preview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
