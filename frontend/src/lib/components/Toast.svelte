<!--
  Toast container — mount 1 lần trong root layout. Lắng nghe store `toasts`
  và render stack thông báo ở góc màn hình.
-->
<script>
  import { toasts, dismissToast } from "$lib/stores/toast";
</script>

<div class="toast-stack" role="region" aria-live="polite" aria-label="Thông báo">
  {#each $toasts as t (t.id)}
    <div class="toast toast-{t.variant}" role="status">
      <i
        class="bi {t.variant === 'success'
          ? 'bi-check-circle-fill'
          : t.variant === 'error'
            ? 'bi-exclamation-octagon-fill'
            : t.variant === 'warn'
              ? 'bi-exclamation-triangle-fill'
              : 'bi-info-circle-fill'}"
        aria-hidden="true"
      ></i>
      <span class="toast-msg">{t.message}</span>
      <button
        class="toast-close"
        on:click={() => dismissToast(t.id)}
        aria-label="Đóng thông báo"
      >
        <i class="bi bi-x" aria-hidden="true"></i>
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: calc(100vw - 32px);
    width: 360px;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    font-size: 0.92rem;
    color: #111827;
    pointer-events: auto;
    border-left: 4px solid #3b82f6;
    animation: slide-in 180ms ease-out;
  }
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(24px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .toast-info {
    border-left-color: #3b82f6;
  }
  .toast-info i:first-child {
    color: #3b82f6;
  }
  .toast-success {
    border-left-color: #10b981;
  }
  .toast-success i:first-child {
    color: #10b981;
  }
  .toast-warn {
    border-left-color: #f59e0b;
  }
  .toast-warn i:first-child {
    color: #f59e0b;
  }
  .toast-error {
    border-left-color: #dc2626;
  }
  .toast-error i:first-child {
    color: #dc2626;
  }
  .toast-msg {
    flex: 1;
    line-height: 1.45;
  }
  .toast-close {
    background: transparent;
    border: 0;
    color: #9ca3af;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .toast-close:hover {
    color: #374151;
    background: #f3f4f6;
  }
  @media (max-width: 480px) {
    .toast-stack {
      left: 16px;
      right: 16px;
      width: auto;
    }
  }
</style>
