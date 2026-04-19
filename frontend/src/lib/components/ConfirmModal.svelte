<!--
  Confirmation modal — mount 1 lần trong root layout. Lắng nghe confirmState.
  Tương thích với keyboard: Enter confirm, Esc cancel.
-->
<script>
  import { confirmState, resolveConfirm } from "$lib/stores/confirm";
  import { tick } from "svelte";

  let confirmBtn;

  const onBackdrop = () => resolveConfirm(false);
  const onCancel = () => resolveConfirm(false);
  const onConfirm = () => resolveConfirm(true);

  const onKeydown = (event) => {
    if (!$confirmState) return;
    if (event.key === "Escape") {
      event.preventDefault();
      resolveConfirm(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      resolveConfirm(true);
    }
  };

  // autofocus nút confirm khi mở modal
  $: if ($confirmState) {
    tick().then(() => confirmBtn?.focus());
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if $confirmState}
  <div
    class="confirm-backdrop"
    role="presentation"
    on:click={onBackdrop}
  >
    <div
      class="confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      on:click|stopPropagation
    >
      <h3 id="confirm-title">{$confirmState.title}</h3>
      <p id="confirm-desc" class="confirm-msg">{$confirmState.message}</p>
      <div class="confirm-actions">
        <button class="btn-cancel" on:click={onCancel}>
          {$confirmState.cancelLabel}
        </button>
        <button
          bind:this={confirmBtn}
          class="btn-confirm btn-confirm-{$confirmState.variant}"
          on:click={onConfirm}
        >
          {$confirmState.confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    padding: 16px;
  }
  .confirm-modal {
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  }
  .confirm-modal h3 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    color: #111827;
  }
  .confirm-msg {
    margin: 0 0 1.25rem;
    color: #4b5563;
    line-height: 1.5;
  }
  .confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .btn-cancel,
  .btn-confirm {
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    border: 0;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.95rem;
  }
  .btn-cancel {
    background: #f3f4f6;
    color: #374151;
  }
  .btn-cancel:hover {
    background: #e5e7eb;
  }
  .btn-confirm-primary {
    background: #2563eb;
    color: white;
  }
  .btn-confirm-primary:hover {
    background: #1d4ed8;
  }
  .btn-confirm-danger {
    background: #dc2626;
    color: white;
  }
  .btn-confirm-danger:hover {
    background: #b91c1c;
  }
  .btn-cancel:focus-visible,
  .btn-confirm:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
</style>
