<script>
  export let icon = "bi-inbox"; // bootstrap-icons class
  export let title = "Chưa có dữ liệu";
  export let description = "";
  export let ctaLabel = "";
  export let ctaHref = "";
  export let onCta = null; // function, optional
</script>

<div class="empty-state" role="status">
  <div class="empty-icon" aria-hidden="true">
    <i class="bi {icon}"></i>
  </div>
  <h3>{title}</h3>
  {#if description}
    <p class="empty-desc">{description}</p>
  {/if}
  {#if ctaLabel}
    {#if ctaHref}
      <a class="empty-cta" href={ctaHref}>{ctaLabel}</a>
    {:else if onCta}
      <button class="empty-cta" on:click={onCta}>{ctaLabel}</button>
    {/if}
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2.5rem 1rem;
    text-align: center;
    color: #4b5563;
  }
  .empty-icon i {
    font-size: 2.8rem;
    color: #9ca3af;
    opacity: 0.8;
  }
  .empty-state h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #111827;
  }
  .empty-desc {
    margin: 0;
    font-size: 0.92rem;
    max-width: 360px;
    line-height: 1.5;
  }
  .empty-cta {
    margin-top: 0.5rem;
    display: inline-block;
    padding: 0.5rem 1.2rem;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.92rem;
  }
  .empty-cta:hover {
    background: #1d4ed8;
  }
  .empty-cta:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
</style>
