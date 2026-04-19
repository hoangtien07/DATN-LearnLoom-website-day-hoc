<script>
  export let title = "Đã xảy ra lỗi";
  export let message = "Không thể tải dữ liệu. Vui lòng thử lại.";
  export let onRetry = null; // function
  export let retryLabel = "Thử lại";
</script>

<div class="error-state" role="alert">
  <div class="error-icon" aria-hidden="true">
    <i class="bi bi-exclamation-octagon"></i>
  </div>
  <h3>{title}</h3>
  <p class="error-msg">{message}</p>
  {#if onRetry}
    <button class="error-retry" on:click={onRetry}>{retryLabel}</button>
  {/if}
</div>

<style>
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1rem;
    text-align: center;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    max-width: 520px;
    margin: 1rem auto;
  }
  .error-icon i {
    font-size: 2.5rem;
    color: #dc2626;
  }
  .error-state h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #7f1d1d;
  }
  .error-msg {
    margin: 0;
    font-size: 0.9rem;
    color: #991b1b;
    max-width: 360px;
    line-height: 1.5;
  }
  .error-retry {
    margin-top: 0.5rem;
    padding: 0.5rem 1.2rem;
    background: #dc2626;
    color: white;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
  }
  .error-retry:hover {
    background: #b91c1c;
  }
  .error-retry:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }
</style>
