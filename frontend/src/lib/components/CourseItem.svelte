<script>
  import {
    Card,
    CardImg,
    CardBody,
    CardTitle,
    CardText,
  } from "@sveltestrap/sveltestrap";
  import { getTime } from "$lib/js/function.js";
  import StarRating from "svelte-star-rating";
  import { createEventDispatcher } from "svelte";
  import { hideCourse, publishCourse, unpublishCourse } from "$lib/js/api.js";

  export let course;
  export let isEdit = false;
  export let selectable = false;
  export let selected = false;

  const dispatch = createEventDispatcher();

  // Config cho rating star
  const config = { fullColor: "#ffa500" };

  let linkCourse = "";
  if (isEdit) linkCourse = `/course/${course.slug}/edit-course/curriculum`;
  else linkCourse = `/course/${course.slug}`;

  let validRating =
    typeof course.avgRating === "number" &&
    course.avgRating >= 0 &&
    course.avgRating <= 5
      ? course.avgRating
      : 0;

  let isActing = false;
  $: enrolledCount = Number(course?.totalStudentsEnrolled || 0);
  $: canMoveToDraft = !course?.is_published || enrolledCount === 0;

  const handlePublishToggle = async (e) => {
    e.preventDefault();

    if (course.is_published && !canMoveToDraft) {
      window.alert(
        "Khóa học đang có học viên theo học nên không thể ngừng bán theo cách chuyển về nháp. Bạn có thể dùng thao tác Ẩn để ngừng hiển thị với học viên mới.",
      );
      return;
    }

    isActing = true;
    try {
      if (course.is_published) {
        await unpublishCourse(course.slug);
        course = { ...course, is_published: false };
      } else {
        await publishCourse(course.slug);
        course = { ...course, is_published: true };
      }
      dispatch("courseUpdated", course);
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message;
      if (message) window.alert(message);
    } finally {
      isActing = false;
    }
  };

  const handleHide = async (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `Bạn có chắc muốn ẩn khóa học "${course.name}"? Khóa học sẽ không còn hiển thị với học viên.`,
    );
    if (!confirmed) return;

    isActing = true;
    try {
      await hideCourse(course.slug);
      dispatch("courseHidden", course);
    } catch (err) {
      console.error(err);
    } finally {
      isActing = false;
    }
  };

  const handleToggleSelect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch("toggleSelect", {
      slug: course.slug,
      selected: !selected,
    });
  };
</script>

<div class="course-item-wrapper" class:is-edit={isEdit}>
  {#if isEdit && selectable}
    <button
      type="button"
      class="course-select-toggle"
      class:is-selected={selected}
      on:click={handleToggleSelect}
      title={selected ? "Bỏ chọn" : "Chọn khóa học"}
      aria-label={selected ? "Bỏ chọn khóa học" : "Chọn khóa học"}
    >
      <i class={`bi ${selected ? "bi-check-circle-fill" : "bi-circle"}`}></i>
    </button>
  {/if}

  <a href={linkCourse}>
    <Card>
      <CardImg src={course.image_url} alt={course.name} />
      <CardBody>
        <CardTitle>{course.name}</CardTitle>
        <CardText class="course-summary">{course.summary}</CardText>
        <div class="course-rating-row">
          <StarRating {config} rating={validRating} />
          <span class="course-rating-value"
            >({Number(course.avgRating).toFixed(1)})</span
          >
        </div>
        <div class="course-meta-row">
          <span
            ><i class="bi bi-people"></i> {course.totalStudentsEnrolled}</span
          >
          <span
            ><i class="bi bi-clock-history"></i>
            {getTime(course.updatedAt)}</span
          >
        </div>
        {#if isEdit}
          <div class="course-status-badge-wrap">
            <span
              class="course-status-badge {course.is_published
                ? 'published'
                : 'draft'}"
            >
              {course.is_published ? "Đã xuất bản" : "Bản nháp"}
            </span>
            {#if enrolledCount > 0}
              <span
                class="course-status-badge enrolled"
                title="Khóa học đang có học viên theo học"
              >
                <i class="bi bi-exclamation-circle"></i> Đang có học viên
              </span>
            {/if}
          </div>
        {/if}
      </CardBody>
    </Card>
  </a>

  {#if isEdit}
    <div class="course-item-actions">
      <button
        class="cia-btn edit"
        on:click|preventDefault={() => {
          window.location.href = linkCourse;
        }}
        title="Chỉnh sửa"
      >
        <i class="bi bi-pencil-square"></i> Sửa
      </button>
      <button
        class="cia-btn {course.is_published ? 'unpublish' : 'publish'}"
        on:click={handlePublishToggle}
        disabled={isActing || (course.is_published && !canMoveToDraft)}
        title={course.is_published
          ? canMoveToDraft
            ? "Ngừng bán (chuyển về bản nháp)"
            : "Khóa học đã có học viên, không thể ngừng bán theo cách về nháp"
          : "Xuất bản"}
      >
        <i class="bi bi-{course.is_published ? 'eye-slash' : 'send-check'}"></i>
        {course.is_published
          ? canMoveToDraft
            ? "Ngừng bán"
            : "Đã có học viên"
          : "Xuất bản"}
      </button>
      <button
        class="cia-btn hide"
        on:click={handleHide}
        disabled={isActing}
        title="Ẩn khóa học"
      >
        <i class="bi bi-eye-slash-fill"></i> Ẩn
      </button>
    </div>
  {/if}
</div>

<style scoped>
  .course-item-wrapper {
    position: relative;
    min-width: 0;
  }
  .course-select-toggle {
    position: absolute;
    z-index: 3;
    top: 10px;
    left: 10px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    background: rgba(255, 255, 255, 0.95);
    color: #6b7280;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      border-color 0.16s,
      color 0.16s,
      box-shadow 0.16s;
  }
  .course-select-toggle:hover {
    border-color: #2563eb;
    color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
  .course-select-toggle.is-selected {
    border-color: #2563eb;
    color: #2563eb;
  }
  :global(.card) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 430px;
    border: 1px solid #d9e4ff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(15, 45, 102, 0.08);
    transition:
      box-shadow 0.22s ease,
      transform 0.22s ease,
      border-color 0.22s ease;
  }

  :global(.card-img) {
    width: 100%;
    height: 155px;
    object-fit: cover;
  }

  :global(.card-body) {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.85rem;
  }

  a {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  a:hover :global(.card) {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(15, 45, 102, 0.14);
    border-color: #bfd2ff;
  }

  :global(.card-text) {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    color: #4f6388;
    margin-bottom: 0;
  }

  :global(.card-title) {
    font-size: 1rem;
    font-weight: 700;
    color: #132b57;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .course-summary {
    min-height: 3.6rem;
  }

  .course-rating-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .course-rating-value {
    font-size: 0.84rem;
    color: #4b5f84;
    font-weight: 600;
  }

  .course-meta-row {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    font-size: 0.8rem;
    color: #51658f;
    border-top: 1px dashed #d6e1fb;
    padding-top: 0.55rem;
    margin-top: auto;
  }

  .course-meta-row span {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .course-status-badge-wrap {
    margin-top: 0.1rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .course-status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
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

  .course-status-badge.enrolled {
    background: #eff6ff;
    color: #1d4ed8;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .course-item-actions {
    margin-top: 0.55rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .cia-btn {
    min-width: 0;
    padding: 0.42rem 0.45rem;
    border: 1px solid transparent;
    border-radius: 10px;
    font-size: 0.79rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.18s,
      border-color 0.18s,
      opacity 0.18s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.32rem;
    white-space: nowrap;
  }

  .cia-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cia-btn.edit {
    background: #eaf2ff;
    color: #1d4ed8;
    border-color: #cfe0ff;
  }

  .cia-btn.edit:hover:not(:disabled) {
    background: #dce9ff;
  }

  .cia-btn.publish {
    background: #d8f7ea;
    color: #065f46;
    border-color: #b3ecd6;
  }

  .cia-btn.publish:hover:not(:disabled) {
    background: #c2f2dd;
  }

  .cia-btn.unpublish {
    background: #fff3d2;
    color: #92400e;
    border-color: #f6df9f;
  }

  .cia-btn.unpublish:hover:not(:disabled) {
    background: #ffecbb;
  }

  .cia-btn.hide {
    background: #f4f6fb;
    color: #374151;
    border-color: #e2e7f3;
  }

  .cia-btn.hide:hover:not(:disabled) {
    background: #e8edf7;
  }

  @media (max-width: 640px) {
    :global(.card) {
      min-height: 410px;
    }

    .course-item-actions {
      gap: 0.38rem;
    }

    .cia-btn {
      font-size: 0.75rem;
      padding: 0.38rem 0.3rem;
    }
  }
</style>
