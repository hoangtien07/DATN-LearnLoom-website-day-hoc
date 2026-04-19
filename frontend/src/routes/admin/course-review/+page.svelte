<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { user, fetchUser } from "../../../stores/auth.js";
  import {
    listPendingCourses,
    approveCourseReview,
    rejectCourseReview,
  } from "$lib/js/api";
  import { pushToast } from "$lib/stores/toast.js";
  import { confirm as uiConfirm } from "$lib/stores/confirm.js";

  let courses = [];
  let pagination = null;
  let loading = true;
  let page = 1;
  const PAGE_SIZE = 20;

  let processingSlug = null;
  let errorMsg = "";

  let showRejectModal = false;
  let rejectTarget = null;
  let rejectionReason = "";

  const load = async () => {
    try {
      loading = true;
      errorMsg = "";
      const result = await listPendingCourses({ page, limit: PAGE_SIZE });
      courses = result.data || [];
      pagination = result.pagination || null;
    } catch (err) {
      console.error(err);
      errorMsg =
        err?.response?.data?.message || "Không tải được danh sách khóa học chờ duyệt";
    } finally {
      loading = false;
    }
  };

  const handleApprove = async (course) => {
    const ok = await uiConfirm({
      title: "Duyệt khóa học",
      message: `Duyệt & xuất bản khóa học "${course.name}"?`,
      confirmLabel: "Duyệt & xuất bản",
    });
    if (!ok) return;
    try {
      processingSlug = course.slug;
      errorMsg = "";
      await approveCourseReview(course.slug);
      pushToast("Đã duyệt & xuất bản khóa học.", { variant: "success" });
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || "Không duyệt được.";
      errorMsg = msg;
      pushToast(msg, { variant: "error" });
    } finally {
      processingSlug = null;
    }
  };

  const openRejectModal = (course) => {
    rejectTarget = course;
    rejectionReason = "";
    showRejectModal = true;
    errorMsg = "";
  };
  const closeRejectModal = () => {
    showRejectModal = false;
    rejectTarget = null;
    rejectionReason = "";
  };
  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectionReason.trim().length < 5) {
      errorMsg = "Lý do từ chối tối thiểu 5 ký tự.";
      return;
    }
    try {
      processingSlug = rejectTarget.slug;
      errorMsg = "";
      await rejectCourseReview(rejectTarget.slug, rejectionReason.trim());
      pushToast("Đã từ chối khóa học và gửi lý do cho giảng viên.", {
        variant: "success",
      });
      closeRejectModal();
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || "Không từ chối được.";
      errorMsg = msg;
      pushToast(msg, { variant: "error" });
    } finally {
      processingSlug = null;
    }
  };

  const goToPage = async (p) => {
    page = p;
    await load();
  };

  onMount(async () => {
    if (!$user) await fetchUser();
    if (!$user) {
      goto("/login?redirectTo=/admin/course-review");
      return;
    }
    if ($user.role !== "admin") {
      goto("/");
      return;
    }
    await load();
  });

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleString("vi-VN") : "—";
</script>

<svelte:head>
  <title>Duyệt khóa học · Admin</title>
</svelte:head>

<div class="admin-page">
  <header class="page-header">
    <div>
      <h1>Duyệt khóa học chờ xuất bản</h1>
      <p>Kiểm tra nội dung trước khi cho phép khóa học công khai với học viên.</p>
    </div>
    <a href="/admin" class="back-link">← Về dashboard</a>
  </header>

  {#if pagination}
    <div class="total-line">Tổng: {pagination.total} khóa học đang chờ</div>
  {/if}

  {#if errorMsg}
    <div class="error-banner">{errorMsg}</div>
  {/if}

  {#if loading}
    <p class="state">Đang tải...</p>
  {:else if courses.length === 0}
    <div class="empty">
      <p>Không có khóa học nào đang chờ duyệt.</p>
    </div>
  {:else}
    <div class="course-list">
      {#each courses as course (course._id)}
        <article class="course-card">
          <img
            class="thumb"
            src={course.image_url ||
              "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=400&q=60"}
            alt={course.name}
          />
          <div class="course-main">
            <h3>{course.name}</h3>
            <p class="summary">{course.summary}</p>
            <dl class="meta">
              <div>
                <dt>Giảng viên</dt>
                <dd>
                  {course.teacher?.username || "—"}
                  {#if course.teacher?.email}
                    <span class="email">({course.teacher.email})</span>
                  {/if}
                </dd>
              </div>
              <div>
                <dt>Môn</dt>
                <dd>{course.subject} · {course.level}</dd>
              </div>
              <div>
                <dt>Giá</dt>
                <dd>
                  {Number(course.price || 0) > 0
                    ? `${Number(course.price).toLocaleString("vi-VN")} VND`
                    : "Miễn phí"}
                </dd>
              </div>
              <div>
                <dt>Gửi duyệt lúc</dt>
                <dd>{formatDate(course.reviewSubmittedAt)}</dd>
              </div>
            </dl>
            <div class="actions">
              <a
                class="btn-view"
                href={`/course/${course.slug}`}
                target="_blank"
                rel="noopener"
              >
                Xem trang khóa học
              </a>
              <button
                class="btn-approve"
                disabled={processingSlug === course.slug}
                on:click={() => handleApprove(course)}
              >
                {processingSlug === course.slug ? "Đang xử lý..." : "Duyệt & xuất bản"}
              </button>
              <button
                class="btn-reject"
                disabled={processingSlug === course.slug}
                on:click={() => openRejectModal(course)}
              >
                Từ chối
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>

    {#if pagination && pagination.totalPages > 1}
      <div class="pager">
        <button disabled={page <= 1} on:click={() => goToPage(page - 1)}
          >← Trước</button
        >
        <span>Trang {page} / {pagination.totalPages}</span>
        <button
          disabled={page >= pagination.totalPages}
          on:click={() => goToPage(page + 1)}>Sau →</button
        >
      </div>
    {/if}
  {/if}
</div>

{#if showRejectModal}
  <div class="modal-backdrop" role="presentation" on:click={closeRejectModal}>
    <div class="modal" role="dialog" aria-modal="true" on:click|stopPropagation>
      <h3>Từ chối khóa học "{rejectTarget?.name}"</h3>
      <p class="muted">Lý do sẽ được hiển thị cho giảng viên để họ sửa & gửi lại.</p>
      <textarea
        bind:value={rejectionReason}
        maxlength="1000"
        rows="4"
        placeholder="VD: Nội dung chưa đủ chi tiết, thiếu bài tập, ..."
      ></textarea>
      {#if errorMsg}
        <div class="error-banner inline">{errorMsg}</div>
      {/if}
      <div class="modal-actions">
        <button class="btn-cancel" on:click={closeRejectModal}>Huỷ</button>
        <button
          class="btn-reject"
          disabled={processingSlug === rejectTarget?.slug}
          on:click={confirmReject}
        >
          Xác nhận từ chối
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .admin-page {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #111827;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  .page-header p {
    color: #6b7280;
    margin-top: 0.25rem;
  }
  .back-link {
    color: #2563eb;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .total-line {
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .error-banner {
    background: #fef2f2;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  .error-banner.inline {
    margin: 0.5rem 0 0;
  }

  .state,
  .empty {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .course-card {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem;
  }
  .thumb {
    width: 160px;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
  }
  .course-main h3 {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
  }
  .summary {
    color: #4b5563;
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
  }
  .meta {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  .meta > div {
    display: flex;
    flex-direction: column;
  }
  .meta dt {
    color: #6b7280;
    font-size: 0.75rem;
    text-transform: uppercase;
  }
  .meta dd {
    margin: 0;
  }
  .email {
    color: #9ca3af;
    font-size: 0.8rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .btn-view,
  .btn-approve,
  .btn-reject,
  .btn-cancel {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 0;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
  }
  .btn-view {
    background: #f3f4f6;
    color: #374151;
  }
  .btn-approve {
    background: #10b981;
    color: white;
  }
  .btn-approve:hover:not(:disabled) {
    background: #059669;
  }
  .btn-reject {
    background: #dc2626;
    color: white;
  }
  .btn-reject:hover:not(:disabled) {
    background: #b91c1c;
  }
  .btn-cancel {
    background: #f3f4f6;
    color: #374151;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .pager {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .pager button {
    padding: 0.4rem 0.8rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: white;
    padding: 1.5rem;
    border-radius: 10px;
    max-width: 500px;
    width: 90%;
  }
  .modal h3 {
    margin: 0 0 0.25rem;
  }
  .modal textarea {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin-top: 0.75rem;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .muted {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0;
  }

  @media (max-width: 680px) {
    .course-card {
      grid-template-columns: 1fr;
    }
    .thumb {
      width: 100%;
      height: 160px;
    }
  }
</style>
