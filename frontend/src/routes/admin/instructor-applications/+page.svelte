<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { user, fetchUser } from "../../../stores/auth.js";
  import {
    listInstructorApplications,
    approveInstructorApplication,
    rejectInstructorApplication,
  } from "$lib/js/api";
  import { pushToast } from "$lib/stores/toast.js";
  import { confirm as uiConfirm } from "$lib/stores/confirm.js";

  let applications = [];
  let pagination = null;
  let loading = true;
  let statusFilter = "pending"; // pending | approved | rejected | all
  let page = 1;
  const PAGE_SIZE = 20;

  let processingId = null;
  let processError = "";

  let showRejectModal = false;
  let rejectTarget = null;
  let rejectionReason = "";

  const STATUS_LABEL = {
    pending: { text: "Chờ duyệt", cls: "status-pending" },
    approved: { text: "Đã duyệt", cls: "status-approved" },
    rejected: { text: "Đã từ chối", cls: "status-rejected" },
  };

  const load = async () => {
    try {
      loading = true;
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter !== "all") params.status = statusFilter;
      const result = await listInstructorApplications(params);
      applications = result.data || [];
      pagination = result.pagination || null;
    } catch (err) {
      console.error("Error loading applications:", err);
      applications = [];
    } finally {
      loading = false;
    }
  };

  const handleApprove = async (app) => {
    const ok = await uiConfirm({
      title: "Duyệt đơn làm giảng viên",
      message: `Duyệt đơn của "${app.fullName}"? User sẽ được nâng quyền thành giảng viên.`,
      confirmLabel: "Duyệt",
    });
    if (!ok) return;
    processError = "";
    try {
      processingId = app._id;
      await approveInstructorApplication(app._id);
      pushToast(`Đã duyệt đơn của ${app.fullName}.`, { variant: "success" });
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || "Không duyệt được đơn.";
      processError = msg;
      pushToast(msg, { variant: "error" });
    } finally {
      processingId = null;
    }
  };

  const openRejectModal = (app) => {
    rejectTarget = app;
    rejectionReason = "";
    showRejectModal = true;
    processError = "";
  };

  const closeRejectModal = () => {
    showRejectModal = false;
    rejectTarget = null;
    rejectionReason = "";
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectionReason.trim().length < 5) {
      processError = "Lý do từ chối tối thiểu 5 ký tự.";
      return;
    }
    processError = "";
    try {
      processingId = rejectTarget._id;
      await rejectInstructorApplication(rejectTarget._id, rejectionReason.trim());
      pushToast("Đã từ chối đơn và gửi lý do cho người nộp.", {
        variant: "success",
      });
      closeRejectModal();
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || "Không từ chối được đơn.";
      processError = msg;
      pushToast(msg, { variant: "error" });
    } finally {
      processingId = null;
    }
  };

  const handleFilterChange = async () => {
    page = 1;
    await load();
  };

  const goToPage = async (newPage) => {
    page = newPage;
    await load();
  };

  onMount(async () => {
    if (!$user) await fetchUser();
    if (!$user) {
      goto("/login?redirectTo=/admin/instructor-applications");
      return;
    }
    if ($user.role !== "admin") {
      goto("/");
      return;
    }
    await load();
  });
</script>

<svelte:head>
  <title>Duyệt giảng viên · Admin</title>
</svelte:head>

<div class="admin-page">
  <header class="page-header">
    <div>
      <h1>Duyệt đơn đăng ký làm giảng viên</h1>
      <p>Xem xét và phê duyệt các đơn đăng ký làm giảng viên từ học viên.</p>
    </div>
    <a href="/admin" class="back-link">← Về dashboard</a>
  </header>

  <div class="filter-bar">
    <label>
      <span>Trạng thái:</span>
      <select bind:value={statusFilter} on:change={handleFilterChange}>
        <option value="pending">Chờ duyệt</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Đã từ chối</option>
        <option value="all">Tất cả</option>
      </select>
    </label>
    {#if pagination}
      <span class="total">Tổng: {pagination.total} đơn</span>
    {/if}
  </div>

  {#if processError}
    <div class="error-banner">{processError}</div>
  {/if}

  {#if loading}
    <p class="loading">Đang tải...</p>
  {:else if applications.length === 0}
    <p class="empty">Không có đơn nào phù hợp.</p>
  {:else}
    <div class="app-table">
      {#each applications as app (app._id)}
        {@const label = STATUS_LABEL[app.status] || { text: app.status, cls: "" }}
        <article class="app-card">
          <div class="app-top">
            <div class="applicant">
              {#if app.user?.thumbnail}
                <img src={app.user.thumbnail} alt="avatar" class="avatar" />
              {:else}
                <div class="avatar placeholder">
                  {(app.user?.username || app.fullName)?.charAt(0)?.toUpperCase() ||
                    "?"}
                </div>
              {/if}
              <div>
                <p class="name">{app.fullName}</p>
                <p class="email">{app.user?.email || ""}</p>
              </div>
            </div>
            <span class="badge {label.cls}">{label.text}</span>
          </div>

          <dl class="app-meta">
            {#if app.phone}
              <div><dt>SĐT</dt><dd>{app.phone}</dd></div>
            {/if}
            <div><dt>Chuyên môn</dt><dd>{app.expertise}</dd></div>
            <div class="motivation">
              <dt>Lý do</dt>
              <dd>{app.motivation}</dd>
            </div>
            {#if app.credentialsUrl}
              <div>
                <dt>Chứng chỉ</dt>
                <dd>
                  <a href={app.credentialsUrl} target="_blank" rel="noopener">
                    {app.credentialsUrl}
                  </a>
                </dd>
              </div>
            {/if}
            <div>
              <dt>Nộp lúc</dt>
              <dd>{new Date(app.createdAt).toLocaleString("vi-VN")}</dd>
            </div>
            {#if app.reviewedAt}
              <div>
                <dt>Xử lý lúc</dt>
                <dd>
                  {new Date(app.reviewedAt).toLocaleString("vi-VN")}
                  {#if app.reviewedBy?.username}
                    bởi <strong>{app.reviewedBy.username}</strong>
                  {/if}
                </dd>
              </div>
            {/if}
            {#if app.status === "rejected" && app.rejectionReason}
              <div class="rejection">
                <dt>Lý do từ chối</dt>
                <dd>{app.rejectionReason}</dd>
              </div>
            {/if}
          </dl>

          {#if app.status === "pending"}
            <div class="actions">
              <button
                class="btn-approve"
                disabled={processingId === app._id}
                on:click={() => handleApprove(app)}
              >
                {processingId === app._id ? "Đang duyệt..." : "Duyệt"}
              </button>
              <button
                class="btn-reject"
                disabled={processingId === app._id}
                on:click={() => openRejectModal(app)}
              >
                Từ chối
              </button>
            </div>
          {/if}
        </article>
      {/each}
    </div>

    {#if pagination && pagination.totalPages > 1}
      <div class="pager">
        <button
          disabled={page <= 1}
          on:click={() => goToPage(page - 1)}>← Trước</button
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
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      on:click|stopPropagation
    >
      <h3>Từ chối đơn của {rejectTarget?.fullName}</h3>
      <p class="muted">Lý do sẽ được gửi cho người nộp đơn.</p>
      <textarea
        bind:value={rejectionReason}
        maxlength="1000"
        rows="4"
        placeholder="VD: Hồ sơ chưa đầy đủ, thiếu chứng chỉ liên quan..."
      ></textarea>
      {#if processError}
        <div class="error-banner inline">{processError}</div>
      {/if}
      <div class="modal-actions">
        <button class="btn-cancel" on:click={closeRejectModal}>Huỷ</button>
        <button
          class="btn-reject"
          disabled={processingId === rejectTarget?._id}
          on:click={confirmReject}
        >
          {processingId === rejectTarget?._id
            ? "Đang xử lý..."
            : "Xác nhận từ chối"}
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
    margin-bottom: 1.5rem;
  }
  .page-header h1 {
    margin: 0;
    font-size: 1.6rem;
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

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .filter-bar select {
    padding: 0.3rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }
  .filter-bar .total {
    margin-left: auto;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .loading,
  .empty {
    color: #6b7280;
    text-align: center;
    padding: 2rem;
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

  .app-table {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .app-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 1.25rem;
  }
  .app-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .applicant {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }
  .avatar.placeholder {
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #6b7280;
  }
  .name {
    margin: 0;
    font-weight: 600;
  }
  .email {
    margin: 0;
    color: #6b7280;
    font-size: 0.85rem;
  }
  .badge {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .status-pending {
    background: #fef3c7;
    color: #b45309;
  }
  .status-approved {
    background: #d1fae5;
    color: #065f46;
  }
  .status-rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .app-meta {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .app-meta > div {
    display: flex;
    gap: 0.75rem;
  }
  .app-meta dt {
    min-width: 110px;
    color: #6b7280;
    font-size: 0.85rem;
  }
  .app-meta dd {
    margin: 0;
    flex: 1;
  }
  .app-meta .motivation dd {
    white-space: pre-wrap;
  }
  .app-meta .rejection dd {
    background: #fef2f2;
    padding: 0.5rem;
    border-left: 3px solid #dc2626;
    border-radius: 4px;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }
  .btn-approve,
  .btn-reject,
  .btn-cancel {
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    border: 0;
    cursor: pointer;
    font-weight: 500;
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
    margin: 0 0 0.5rem;
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
</style>
