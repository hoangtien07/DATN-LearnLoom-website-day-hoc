<script>
  // items: Array<{ label: string, href?: string }>
  // Each item renders as a link if href is provided, plain text otherwise (last item).
  export let items = [];
</script>

{#if items.length > 0}
  <nav class="breadcrumbs" aria-label="Điều hướng phân cấp">
    <ol class="breadcrumb-list">
      {#each items as item, i}
        <li class="breadcrumb-item {i === items.length - 1 ? 'active' : ''}">
          {#if item.href && i < items.length - 1}
            <a href={item.href} class="breadcrumb-link">{item.label}</a>
          {:else}
            <span>{item.label}</span>
          {/if}
          {#if i < items.length - 1}
            <span class="breadcrumb-sep" aria-hidden="true">/</span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .breadcrumbs {
    margin-bottom: 0.6rem;
  }

  .breadcrumb-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0;
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8rem;
    color: #6b7280;
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .breadcrumb-link {
    color: #4e6592;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s;
  }

  .breadcrumb-link:hover {
    color: #1a4fa3;
    text-decoration: underline;
  }

  .breadcrumb-item.active span {
    color: #374151;
    font-weight: 600;
  }

  .breadcrumb-sep {
    color: #d1d5db;
    margin: 0 0.2rem;
    font-weight: 400;
  }
</style>
