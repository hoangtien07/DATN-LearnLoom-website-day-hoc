<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { user, fetchUser } from "../../../stores/auth.js";
  import { getMyOrders, createVnpayPaymentUrl } from "$lib/js/api";
  import Spinner from "$lib/components/Spinner.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorState from "$lib/components/ErrorState.svelte";
  import { pushToast } from "$lib/stores/toast.js";

  let orders = [];
  let pagination = null;
  let loading = true;
  let statusFilter = "all"; // all | pending | success | fail
  let page = 1;
  const PAGE_SIZE = 10;

  let retryingOrderId = null;
  let errorMsg = "";

  const STATUS_LABEL = {
    pending: { text: "Đang chờ thanh toán", cls: "status-pending" },
    success: { text: "Đã thanh toán", cls: "status-success" },
    fail: { text: "Thất bại", cls: "status-fail" },
  };

  const formatCurrency = (amount) => {
    const n = Number(amount) || 0;
    return `${n.toLocaleString("vi-VN")} VND`;
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("vi-VN");
  };

  const getCourseImage = (order) =>
    order?.courseId?.image_url ||
    order?.courseImage ||
    "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=400&q=60";

  const load = async () => {
    try {
      loading = true;
      errorMsg = "";
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter !== "all") params.status = statusFilter;
      const result = await getMyOrders(params);
      orders = result.data || [];
      pagination = result.pagination || null;
    } catch (err) {
      console.error("Error loading orders:", err);
      errorMsg = err?.response?.data?.message || "Không tải được đơn hàng";
    } finally {
      loading = false;
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

  // Thanh toán lại đơn pending bằng cách tái sinh URL VNPay.
  const handleRetryPayment = async (order) => {
    try {
      retryingOrderId = order._id;
      const response = await createVnpayPaymentUrl(order._id);
      if (response?.success && response?.paymentUrl) {
        window.location = response.paymentUrl;
        return;
      }
      pushToast(
        response?.message || "Không khởi tạo được URL thanh toán.",
        { variant: "error" },
      );
    } catch (err) {
      pushToast(
        err?.response?.data?.message || "Không khởi tạo được URL thanh toán.",
        { variant: "error" },
      );
    } finally {
      retryingOrderId = null;
    }
  };

  onMount(async () => {
    if (!$user) await fetchUser();
    if (!$user) {
      goto("/login?redirectTo=/profile/orders");
      return;
    }
    await load();
  });
</script>

<svelte:head>
  <title>Lịch sử mua hàng · LearnLoom</title>
</svelte:head>

<div class="orders-page">
  <header class="page-header">
    <div>
      <h1>Lịch sử mua hàng</h1>
      <p>Theo dõi đơn hàng khóa học và thanh toán lại nếu còn chờ.</p>
    </div>
    <a href="/profile" class="back-link">← Hồ sơ</a>
  </header>

  <div class="filter-bar">
    <label>
      <span>Trạng thái:</span>
      <select bind:value={statusFilter} on:change={handleFilterChange}>
        <option value="all">Tất cả</option>
        <option value="pending">Đang chờ</option>
        <option value="success">Đã thanh toán</option>
        <option value="fail">Thất bại</option>
      </select>
    </label>
    {#if pagination}
      <span class="total">Tổng: {pagination.total} đơn</span>
    {/if}
  </div>

  {#if loading}
    <p class="state">
      <Spinner size={18} inline label="Đang tải" /> Đang tải đơn hàng...
    </p>
  {:else if errorMsg}
    <ErrorState
      title="Không tải được đơn hàng"
      message={errorMsg}
      onRetry={load}
    />
  {:else if orders.length === 0}
    <EmptyState
      icon="bi-bag-x"
      title="Chưa có đơn hàng nào"
      description="Bạn chưa từng đăng ký khóa học trả phí. Khám phá catalog để bắt đầu."
      ctaLabel="Khám phá khóa học"
      ctaHref="/course"
    />
  {:else}
    <div class="orders-list">
      {#each orders as order (order._id)}
        {@const label = STATUS_LABEL[order.paymentStatus] || {
          text: order.paymentStatus,
          cls: "",
        }}
        <article class="order-card">
          <div class="course-thumb">
            {#if order.courseId?.slug}
              <a href={`/course/${order.courseId.slug}`}>
                <img src={getCourseImage(order)} alt={order.courseName} />
              </a>
            {:else}
              <img src={getCourseImage(order)} alt={order.courseName} />
            {/if}
          </div>

          <div class="order-main">
            <div class="course-name">
              {#if order.courseId?.slug}
                <a href={`/course/${order.courseId.slug}`}
                  >{order.courseName}</a
                >
              {:else}
                {order.courseName}
              {/if}
            </div>
            <dl class="order-meta">
              <div>
                <dt>Số tiền</dt>
                <dd class="amount">{formatCurrency(order.amount)}</dd>
              </div>
              <div>
                <dt>Phương thức</dt>
                <dd>{(order.paymentMethod || "—").toUpperCase()}</dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{formatDate(order.createdAt)}</dd>
              </div>
              {#if order.paidAt}
                <div>
                  <dt>Thanh toán lúc</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
              {/if}
              {#if order.transactionId}
                <div>
                  <dt>Mã giao dịch</dt>
                  <dd class="mono">{order.transactionId}</dd>
                </div>
              {/if}
            </dl>
          </div>

          <div class="order-side">
            <span class="badge {label.cls}">{label.text}</span>
            {#if order.paymentStatus === "pending" || order.paymentStatus === "fail"}
              <button
                class="btn-retry"
                disabled={retryingOrderId === order._id}
                on:click={() => handleRetryPayment(order)}
              >
                {retryingOrderId === order._id
                  ? "Đang chuyển..."
                  : order.paymentStatus === "pending"
                    ? "Thanh toán"
                    : "Thanh toán lại"}
              </button>
            {/if}
            {#if order.paymentStatus === "success" && order.courseId?.slug}
              <a
                class="btn-view"
                href={`/course/${order.courseId.slug}`}>Vào khóa học</a
              >
            {/if}
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

<style>
  .orders-page {
    max-width: 960px;
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

  .state,
  .empty {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }
  .empty .btn-explore {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.5rem 1.2rem;
    background: #2563eb;
    color: white;
    border-radius: 6px;
    text-decoration: none;
  }
  .error-banner {
    background: #fef2f2;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .order-card {
    display: grid;
    grid-template-columns: 120px 1fr auto;
    gap: 1rem;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem;
  }
  .course-thumb img {
    width: 120px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
  }
  .course-name {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  .course-name a {
    color: #111827;
    text-decoration: none;
  }
  .course-name a:hover {
    color: #2563eb;
  }

  .order-meta {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem;
    font-size: 0.88rem;
  }
  .order-meta > div {
    display: flex;
    flex-direction: column;
  }
  .order-meta dt {
    color: #6b7280;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .order-meta dd {
    margin: 0;
  }
  .amount {
    font-weight: 700;
    color: #111827;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8rem;
    color: #374151;
  }

  .order-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    min-width: 150px;
  }
  .badge {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .status-pending {
    background: #fef3c7;
    color: #b45309;
  }
  .status-success {
    background: #d1fae5;
    color: #065f46;
  }
  .status-fail {
    background: #fee2e2;
    color: #991b1b;
  }

  .btn-retry,
  .btn-view {
    padding: 0.4rem 0.9rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    border: 0;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
    white-space: nowrap;
  }
  .btn-retry {
    background: #2563eb;
    color: white;
  }
  .btn-retry:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .btn-retry:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-view {
    background: #10b981;
    color: white;
  }
  .btn-view:hover {
    background: #059669;
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
  .pager button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 680px) {
    .order-card {
      grid-template-columns: 1fr;
    }
    .course-thumb img {
      width: 100%;
      height: 140px;
    }
    .order-side {
      align-items: flex-start;
    }
  }
</style>
