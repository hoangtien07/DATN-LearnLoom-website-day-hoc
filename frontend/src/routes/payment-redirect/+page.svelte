<script>
  import { onMount, onDestroy } from "svelte";
  import {
    getOrderPaymentStatus,
    createVnpayPaymentUrl,
  } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import { pushToast } from "$lib/stores/toast.js";
  import Spinner from "$lib/components/Spinner.svelte";

  let isLoading = true;
  let status = "pending";
  let message = "Đang xác nhận thanh toán...";
  let orderInfo = null;
  let targetCourseUrl = "/";
  let txnRef = "";
  let orderId = "";
  let pollCount = 0;
  let pollHandle = null;
  let isRetryingPayment = false;
  const MAX_POLLS = 15; // 15 lần × 2 giây = ~30 giây
  const POLL_INTERVAL_MS = 2000;

  const stopPolling = () => {
    if (pollHandle) {
      clearTimeout(pollHandle);
      pollHandle = null;
    }
  };

  const checkStatus = async () => {
    if (!orderId) return;
    try {
      const response = await getOrderPaymentStatus(orderId);
      if (!response.success) {
        status = "fail";
        message = "Không lấy được trạng thái thanh toán.";
        isLoading = false;
        stopPolling();
        return;
      }

      orderInfo = response;
      status = response.paymentStatus;

      if (response.redirectUrl) targetCourseUrl = response.redirectUrl;
      else if (response.courseSlug)
        targetCourseUrl = `/course/${response.courseSlug}`;

      if (status === "success") {
        message = "Thanh toán thành công. Đang chuyển đến khóa học...";
        stopPolling();
        setTimeout(() => goto(targetCourseUrl), 1200);
      } else if (status === "fail") {
        message = "Thanh toán chưa thành công hoặc đã bị hủy.";
        stopPolling();
      } else {
        // pending: tiếp tục poll nếu chưa hết attempt.
        pollCount++;
        if (pollCount < MAX_POLLS) {
          message = `Giao dịch đang chờ xác nhận từ VNPay... (${pollCount}/${MAX_POLLS})`;
          pollHandle = setTimeout(checkStatus, POLL_INTERVAL_MS);
        } else {
          message =
            "VNPay chưa xác nhận giao dịch sau 30 giây. Có thể callback bị lỡ — vui lòng thử thanh toán lại hoặc kiểm tra ở trang Lịch sử mua hàng.";
          stopPolling();
        }
      }
    } catch (error) {
      console.error("Error polling payment status:", error);
      status = "fail";
      message = "Đã xảy ra lỗi khi xác nhận thanh toán.";
      stopPolling();
    } finally {
      isLoading = false;
    }
  };

  const handleRetryPayment = async () => {
    if (!orderId || isRetryingPayment) return;
    try {
      isRetryingPayment = true;
      const response = await createVnpayPaymentUrl(orderId);
      if (response?.success && response?.paymentUrl) {
        window.location = response.paymentUrl;
        return;
      }
      pushToast(response?.message || "Không khởi tạo được URL thanh toán.", {
        variant: "error",
      });
    } catch (err) {
      pushToast(
        err?.response?.data?.message || "Không khởi tạo được URL thanh toán.",
        { variant: "error" },
      );
    } finally {
      isRetryingPayment = false;
    }
  };

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get("orderId") || "";
    txnRef = urlParams.get("txnRef") || "";
    const statusFromReturn = urlParams.get("status");
    const messageFromReturn = urlParams.get("message");

    if (statusFromReturn) status = statusFromReturn;
    if (messageFromReturn) message = messageFromReturn;

    if (!orderId) {
      if (!statusFromReturn) status = "fail";
      if (!messageFromReturn) message = "Thiếu mã đơn hàng thanh toán.";
      isLoading = false;
      return;
    }
    // Bắt đầu poll ngay, không đợi.
    checkStatus();
  });

  onDestroy(stopPolling);
</script>

<svelte:head>
  <title>Kết quả thanh toán · LearnLoom</title>
</svelte:head>

<div class="payment-result-container">
  <h1>Kết quả thanh toán</h1>

  {#if isLoading}
    <p class="loading-row">
      <Spinner size={18} inline label="Đang kiểm tra" /> Đang xử lý giao dịch...
    </p>
  {:else}
    <p class:success={status === "success"} class:fail={status === "fail"}>
      {#if status === "pending"}
        <Spinner size={16} inline label="Chờ xác nhận" />
      {/if}
      {message}
    </p>

    {#if orderInfo}
      <div class="order-meta">
        <p>Mã đơn hàng: <code>{orderInfo.orderId}</code></p>
        <p>Trạng thái: <strong>{orderInfo.paymentStatus}</strong></p>
        {#if orderInfo.transactionId}
          <p>Mã giao dịch: <code>{orderInfo.transactionId}</code></p>
        {/if}
      </div>
    {:else if txnRef}
      <p>Mã tham chiếu VNPay: <code>{txnRef}</code></p>
    {/if}

    <div class="actions">
      {#if status === "pending" && pollCount >= MAX_POLLS}
        <button
          class="btn-primary"
          disabled={isRetryingPayment}
          on:click={handleRetryPayment}
        >
          {isRetryingPayment ? "Đang chuyển..." : "Thử thanh toán lại"}
        </button>
        <a class="btn-outline" href="/profile/orders">Xem lịch sử đơn hàng</a>
      {:else if status === "fail"}
        <button
          class="btn-primary"
          disabled={isRetryingPayment}
          on:click={handleRetryPayment}
        >
          {isRetryingPayment ? "Đang chuyển..." : "Thử thanh toán lại"}
        </button>
      {/if}
      {#if status !== "success"}
        <button class="btn-outline" on:click={() => goto(targetCourseUrl)}
          >Quay lại khóa học</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .payment-result-container {
    max-width: 720px;
    margin: 48px auto;
    padding: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }

  h1 {
    font-size: 1.3rem;
    margin: 0 0 1rem;
  }

  .loading-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .success {
    color: #1f7a1f;
    font-weight: 600;
  }

  .fail {
    color: #b00020;
    font-weight: 600;
  }

  .order-meta {
    margin: 1rem 0;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  .order-meta p {
    margin: 0.3rem 0;
  }
  .order-meta code {
    background: #e5e7eb;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .btn-primary,
  .btn-outline {
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    text-decoration: none;
    border: 1px solid transparent;
  }
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-outline {
    background: transparent;
    color: #2563eb;
    border-color: #2563eb;
  }
  .btn-outline:hover {
    background: #eff6ff;
  }
</style>
