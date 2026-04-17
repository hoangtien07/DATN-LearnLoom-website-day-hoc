<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { user, fetchUser } from "../../../stores/auth.js";
  import {
    submitInstructorApplication,
    getMyInstructorApplications,
  } from "$lib/js/api";

  let applications = [];
  let loading = true;
  let submitting = false;
  let submitError = "";
  let formError = "";

  let form = {
    fullName: "",
    phone: "",
    expertise: "",
    motivation: "",
    credentialsUrl: "",
  };

  const STATUS_LABEL = {
    pending: { text: "Đang chờ duyệt", cls: "status-pending" },
    approved: { text: "Đã duyệt", cls: "status-approved" },
    rejected: { text: "Bị từ chối", cls: "status-rejected" },
  };

  const loadApplications = async () => {
    try {
      loading = true;
      applications = await getMyInstructorApplications();
    } catch (err) {
      console.error("Error loading applications:", err);
      applications = [];
    } finally {
      loading = false;
    }
  };

  const validate = () => {
    if (form.fullName.trim().length < 2) return "Họ tên tối thiểu 2 ký tự";
    if (form.expertise.trim().length < 2) return "Chuyên môn tối thiểu 2 ký tự";
    if (form.motivation.trim().length < 20)
      return "Lý do đăng ký tối thiểu 20 ký tự";
    if (
      form.credentialsUrl &&
      !/^https?:\/\//i.test(form.credentialsUrl.trim())
    )
      return "URL chứng chỉ phải bắt đầu bằng http:// hoặc https://";
    return "";
  };

  const handleSubmit = async () => {
    submitError = "";
    formError = validate();
    if (formError) return;

    try {
      submitting = true;
      await submitInstructorApplication({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        expertise: form.expertise.trim(),
        motivation: form.motivation.trim(),
        credentialsUrl: form.credentialsUrl.trim() || undefined,
      });
      form = {
        fullName: "",
        phone: "",
        expertise: "",
        motivation: "",
        credentialsUrl: "",
      };
      await loadApplications();
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "ALREADY_PRIVILEGED") {
        submitError = "Bạn đã là giảng viên hoặc admin.";
      } else if (code === "APPLICATION_PENDING") {
        submitError = "Bạn đã có đơn đang chờ duyệt.";
      } else {
        submitError =
          err?.response?.data?.message || "Không gửi được đơn đăng ký.";
      }
    } finally {
      submitting = false;
    }
  };

  $: hasPending = applications.some((a) => a.status === "pending");
  $: isAlreadyInstructor =
    $user && ($user.role === "instructor" || $user.role === "admin");

  onMount(async () => {
    if (!$user) await fetchUser();
    if (!$user) {
      goto("/login?redirectTo=/instructor/apply");
      return;
    }
    await loadApplications();
  });
</script>

<svelte:head>
  <title>Đăng ký làm giảng viên · LearnLoom</title>
</svelte:head>

<div class="apply-container">
  <header class="apply-header">
    <h1>Đăng ký làm giảng viên</h1>
    <p>
      Chia sẻ kiến thức của bạn với cộng đồng LearnLoom. Đơn đăng ký sẽ được
      admin duyệt trong vòng 1–3 ngày làm việc.
    </p>
  </header>

  {#if isAlreadyInstructor}
    <div class="notice success">
      <p>
        Bạn đã là <strong>{$user.role === "admin" ? "Admin" : "Giảng viên"}</strong
        > — không cần nộp đơn mới.
      </p>
      {#if $user.role === "instructor"}
        <button on:click={() => goto("/instructor/dashboard")}>
          Vào dashboard giảng viên
        </button>
      {/if}
    </div>
  {:else}
    <section class="apply-form-section">
      <h2>Nộp đơn mới</h2>
      {#if hasPending}
        <div class="notice warn">
          Bạn đang có một đơn chờ duyệt. Hãy đợi admin xử lý trước khi nộp đơn
          mới.
        </div>
      {:else}
        <form on:submit|preventDefault={handleSubmit} class="apply-form">
          <label>
            <span>Họ và tên <i>*</i></span>
            <input
              type="text"
              bind:value={form.fullName}
              maxlength="200"
              required
              placeholder="Nguyễn Văn A"
            />
          </label>

          <label>
            <span>Số điện thoại</span>
            <input
              type="tel"
              bind:value={form.phone}
              maxlength="30"
              placeholder="09xxxxxxxx"
            />
          </label>

          <label>
            <span>Chuyên môn / Lĩnh vực giảng dạy <i>*</i></span>
            <input
              type="text"
              bind:value={form.expertise}
              maxlength="200"
              required
              placeholder="VD: Lập trình Web, Thiết kế UI/UX, ..."
            />
          </label>

          <label>
            <span>Lý do muốn làm giảng viên <i>*</i></span>
            <textarea
              bind:value={form.motivation}
              maxlength="2000"
              rows="5"
              required
              placeholder="Kinh nghiệm, dự định khóa học, giá trị mang lại..."
            ></textarea>
            <small>Tối thiểu 20 ký tự. {form.motivation.length}/2000</small>
          </label>

          <label>
            <span>Link chứng chỉ / portfolio (tuỳ chọn)</span>
            <input
              type="url"
              bind:value={form.credentialsUrl}
              maxlength="500"
              placeholder="https://..."
            />
          </label>

          {#if formError}
            <div class="form-error">{formError}</div>
          {/if}
          {#if submitError}
            <div class="form-error">{submitError}</div>
          {/if}

          <div class="form-actions">
            <button type="submit" disabled={submitting} class="primary">
              {submitting ? "Đang gửi..." : "Gửi đơn đăng ký"}
            </button>
          </div>
        </form>
      {/if}
    </section>
  {/if}

  <section class="my-applications">
    <h2>Đơn của tôi</h2>
    {#if loading}
      <p>Đang tải...</p>
    {:else if applications.length === 0}
      <p class="muted">Bạn chưa có đơn đăng ký nào.</p>
    {:else}
      <ul class="app-list">
        {#each applications as app (app._id)}
          {@const label = STATUS_LABEL[app.status] || {
            text: app.status,
            cls: "",
          }}
          <li class="app-item">
            <div class="app-head">
              <span class="badge {label.cls}">{label.text}</span>
              <span class="created-at">
                {new Date(app.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
            <div class="app-body">
              <p><strong>Chuyên môn:</strong> {app.expertise}</p>
              <p class="motivation">{app.motivation}</p>
              {#if app.credentialsUrl}
                <p>
                  <strong>Link chứng chỉ:</strong>
                  <a href={app.credentialsUrl} target="_blank" rel="noopener">
                    {app.credentialsUrl}
                  </a>
                </p>
              {/if}
              {#if app.status === "rejected" && app.rejectionReason}
                <div class="rejection">
                  <strong>Lý do từ chối:</strong>
                  {app.rejectionReason}
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .apply-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #111827;
  }
  .apply-header h1 {
    margin: 0;
    font-size: 1.8rem;
  }
  .apply-header p {
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .notice {
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  .notice.success {
    background: #ecfdf5;
    border: 1px solid #10b981;
  }
  .notice.warn {
    background: #fff7ed;
    border: 1px solid #f59e0b;
  }
  .notice button {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  }

  .apply-form-section,
  .my-applications {
    margin-top: 2rem;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
  }
  .apply-form-section h2,
  .my-applications h2 {
    margin-top: 0;
    font-size: 1.2rem;
  }

  .apply-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .apply-form label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .apply-form span {
    font-weight: 500;
    font-size: 0.9rem;
  }
  .apply-form span i {
    color: #dc2626;
    font-style: normal;
  }
  .apply-form input,
  .apply-form textarea {
    padding: 0.6rem 0.8rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
  }
  .apply-form small {
    color: #9ca3af;
    font-size: 0.8rem;
  }
  .form-error {
    color: #dc2626;
    padding: 0.6rem;
    background: #fef2f2;
    border-radius: 6px;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
  }
  .primary {
    padding: 0.6rem 1.5rem;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .primary:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .app-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .app-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    background: #f9fafb;
  }
  .app-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
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
  .created-at {
    color: #6b7280;
    font-size: 0.85rem;
  }
  .motivation {
    white-space: pre-wrap;
  }
  .rejection {
    margin-top: 0.5rem;
    padding: 0.6rem;
    background: #fef2f2;
    border-left: 3px solid #dc2626;
    border-radius: 4px;
  }
  .muted {
    color: #9ca3af;
  }
</style>
