<script>
  import { onMount } from "svelte";
  import { getOrderPaymentStatus } from "$lib/js/api";
  import { goto } from "$app/navigation";

  let isLoading = true;
  let status = "pending";
  let message = "Đang xác nhận thanh toán...";
  let orderInfo = null;
  let targetCourseUrl = "/";
  let txnRef = "";

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("orderId");
    txnRef = urlParams.get("txnRef") || "";
    const statusFromReturn = urlParams.get("status");
    const messageFromReturn = urlParams.get("message");

    if (statusFromReturn) {
      status = statusFromReturn;
    }

    if (messageFromReturn) {
      message = messageFromReturn;
    }

    if (!orderId) {
      if (!statusFromReturn) {
        status = "fail";
      }
      if (!messageFromReturn) {
        message = "Thiếu mã đơn hàng thanh toán.";
      }
      isLoading = false;
      return;
    }

    try {
      const response = await getOrderPaymentStatus(orderId);

      if (!response.success) {
        status = "fail";
        message = "Không lấy được trạng thái thanh toán.";
        isLoading = false;
        return;
      }

      orderInfo = response;
      status = response.paymentStatus;

      if (response.redirectUrl) {
        targetCourseUrl = response.redirectUrl;
      } else if (response.courseSlug) {
        targetCourseUrl = `/course/${response.courseSlug}`;
      }

      if (status === "success") {
        message = "Thanh toán thành công. Đang chuyển đến khóa học...";
        setTimeout(() => {
          goto(targetCourseUrl);
        }, 1200);
      } else if (status === "pending") {
        message =
          "Giao dịch đang chờ xác nhận. Vui lòng thử tải lại sau vài giây.";
      } else {
        message = "Thanh toán chưa thành công hoặc đã bị hủy.";
      }
    } catch (error) {
      console.error("Error redirect to course:", error);
      status = "fail";
      message = "Đã xảy ra lỗi khi xác nhận thanh toán.";
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="payment-result-container">
  <h1>Kết quả thanh toán</h1>

  {#if isLoading}
    <p>Đang xử lý giao dịch...</p>
  {:else}
    <p class:success={status === "success"} class:fail={status === "fail"}>
      {message}
    </p>

    {#if orderInfo}
      <p>Mã đơn hàng: {orderInfo.orderId}</p>
      <p>Trạng thái: {orderInfo.paymentStatus}</p>
      {#if orderInfo.transactionId}
        <p>Mã giao dịch: {orderInfo.transactionId}</p>
      {/if}
    {:else if txnRef}
      <p>Mã tham chiếu VNPay: {txnRef}</p>
    {/if}

    {#if status !== "success"}
      <button on:click={() => goto(targetCourseUrl)}>Quay lại khóa học</button>
    {/if}
  {/if}
</div>

<style>
  .payment-result-container {
    max-width: 720px;
    margin: 48px auto;
    padding: 24px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background: #fff;
  }

  .success {
    color: #1f7a1f;
    font-weight: 600;
  }

  .fail {
    color: #b00020;
    font-weight: 600;
  }

  button {
    margin-top: 12px;
    background: #0f62fe;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 10px 14px;
    cursor: pointer;
  }

  button:hover {
    background: #0353e9;
  }
</style>
