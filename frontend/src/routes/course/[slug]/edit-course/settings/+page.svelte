<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import {
    fetchCourseBySlug,
    updateCourse,
    getSubjects,
    publishCourse,
    unpublishCourse,
    hideCourse,
    unhideCourse,
  } from "$lib/js/api";
  import Editor from "cl-editor";

  let course;
  let slug = $page.params.slug;
  let isLoading = true;
  let editedContent = "";
  let subjects = [];
  let saveState = "";
  let saveMessage = "";
  let isSaving = false;
  $: enrolledCount = Number(course?.totalStudentsEnrolled || 0);
  $: canMoveToDraft = !course?.is_published || enrolledCount === 0;

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

  // Lưu tất cả thay đổi hiện tại và chuyển khóa học về bản nháp
  const handleSaveDraft = async () => {
    if (isSaving) return;

    if (!canMoveToDraft) {
      saveState = "error";
      saveMessage =
        "Khóa học đang có học viên theo học nên không thể ngừng bán theo cách về nháp. Hãy dùng Ẩn khóa học để dừng hiển thị với học viên mới.";
      return;
    }

    isSaving = true;
    saveState = "";
    saveMessage = "Đang lưu thay đổi và ngừng bán khóa học...";
    try {
      course.description = editedContent;
      await updateCourse(slug, { ...course, is_published: false });
      course = { ...course, is_published: false };
      saveState = "success";
      saveMessage = "Đã lưu thay đổi và ngừng bán khóa học (về bản nháp).";
    } catch (error) {
      saveState = "error";
      saveMessage =
        error?.response?.data?.message ||
        "Không thể lưu và ngừng bán khóa học.";
    } finally {
      isSaving = false;
    }
  };

  // Lưu tất cả thay đổi (giữ nguyên trạng thái publish)
  const handleUpdateCourse = async () => {
    if (isSaving) return;
    isSaving = true;
    saveState = "";
    saveMessage = "Đang lưu thay đổi...";
    try {
      course.description = editedContent;
      await updateCourse(slug, course);
      saveState = "success";
      saveMessage = "Đã lưu cài đặt khóa học thành công.";
      const from = $page.url.searchParams.get("from");
      if (from === "admin") goto("/admin/course-management");
    } catch (error) {
      console.error("Error updating course:", error);
      saveState = "error";
      saveMessage = "Lưu thất bại. Vui lòng thử lại.";
    } finally {
      isSaving = false;
    }
  };

  const handlePublishToggle = async () => {
    if (isSaving) return;

    if (course.is_published && !canMoveToDraft) {
      saveState = "error";
      saveMessage =
        "Khóa học đang có học viên theo học nên không thể ngừng bán theo cách về nháp. Hãy dùng Ẩn khóa học để dừng hiển thị với học viên mới.";
      return;
    }

    isSaving = true;
    saveState = "";
    try {
      if (course.is_published) {
        await unpublishCourse(slug);
        course = { ...course, is_published: false };
        saveMessage =
          "Đã ngừng bán khóa học (về bản nháp, không lưu thay đổi nội dung chưa bấm Lưu).";
      } else {
        await publishCourse(slug);
        course = { ...course, is_published: true };
        saveMessage =
          "Đã chuyển trạng thái sang xuất bản (không lưu thay đổi nội dung chưa bấm Lưu).";
      }
      saveState = "success";
    } catch (error) {
      saveState = "error";
      saveMessage =
        error?.response?.data?.message ||
        "Không thể thay đổi trạng thái xuất bản.";
    } finally {
      isSaving = false;
    }
  };

  const handleVisibilityToggle = async () => {
    if (isSaving) return;

    if (course.visible) {
      const confirmed = window.confirm(
        `Bạn có chắc muốn ẩn khóa học "${course.name}"? Học viên sẽ không nhìn thấy khóa học này.`,
      );
      if (!confirmed) return;
    }

    isSaving = true;
    saveState = "";
    try {
      if (course.visible) {
        await hideCourse(slug);
        course = { ...course, visible: false };
        saveMessage = "Khóa học đã được ẩn khỏi học viên.";
      } else {
        await unhideCourse(slug);
        course = { ...course, visible: true };
        saveMessage = "Khóa học đã được hiển thị trở lại.";
      }
      saveState = "success";
    } catch (error) {
      saveState = "error";
      saveMessage = "Không thể thay đổi trạng thái hiển thị.";
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
      <div class="settings-action-bar">
        <!-- Trạng thái hiện tại -->
        <span class="settings-status-chips">
          <span
            class="course-status-badge {course.is_published
              ? 'published'
              : 'draft'}"
          >
            {course.is_published ? "Đã xuất bản" : "Bản nháp"}
          </span>
          {#if !course.visible}
            <span class="course-status-badge hidden-badge">Đang ẩn</span>
          {/if}
        </span>
        <button
          class="course-edit-btn outline"
          on:click={handleSaveDraft}
          disabled={isSaving ||
            course.is_published === false ||
            !canMoveToDraft}
          title="Lưu toàn bộ thay đổi hiện tại và ngừng bán khóa học (về bản nháp)"
        >
          {isSaving ? "Đang lưu..." : "Lưu + ngừng bán"}
        </button>
        <button
          class="course-edit-btn {course.is_published ? 'danger' : 'primary'}"
          on:click={handlePublishToggle}
          disabled={isSaving || (course.is_published && !canMoveToDraft)}
          title={course.is_published
            ? canMoveToDraft
              ? "Chỉ ngừng bán khóa học (về nháp, không lưu nội dung đang chỉnh)"
              : "Khóa học đã có học viên, không thể ngừng bán theo cách về nháp"
            : "Chỉ đổi trạng thái sang xuất bản (không lưu nội dung đang chỉnh)"}
        >
          {#if isSaving}
            Đang xử lý...
          {:else if course.is_published}
            <i class="bi bi-eye-slash"></i> Ngừng bán (không lưu)
          {:else}
            <i class="bi bi-send-check"></i> Xuất bản (không lưu)
          {/if}
        </button>
        <button
          class="course-edit-btn {course.visible ? 'outline' : 'primary'}"
          on:click={handleVisibilityToggle}
          disabled={isSaving}
          title={course.visible
            ? "Ẩn khóa học khỏi học viên"
            : "Hiện lại khóa học"}
        >
          {#if course.visible}
            <i class="bi bi-eye-slash-fill"></i> Ẩn khóa học
          {:else}
            <i class="bi bi-eye-fill"></i> Hiện khóa học
          {/if}
        </button>
        <button
          class="course-edit-btn secondary"
          on:click={handleUpdateCourse}
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu tất cả thay đổi"}
        </button>
        <p class="settings-action-note">
          "Lưu + ngừng bán" sẽ lưu nội dung rồi chuyển khóa học sang trạng thái
          bản nháp. Các nút có "(không lưu)" chỉ đổi trạng thái xuất bản. Khóa
          học đã có học viên sẽ không thể ngừng bán theo cách về nháp.
        </p>
      </div>
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

  .settings-action-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .settings-status-chips {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-right: 4px;
  }

  .settings-action-note {
    width: 100%;
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: #586b92;
  }

  .course-status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .course-status-badge.published {
    background: #d1fae5;
    color: #065f46;
  }

  .course-status-badge.draft {
    background: #fef3c7;
    color: #92400e;
  }

  .hidden-badge {
    background: #f3f4f6;
    color: #374151;
  }
</style>
