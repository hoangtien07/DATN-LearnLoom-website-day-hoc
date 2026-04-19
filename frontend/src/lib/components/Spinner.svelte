<script>
  export let size = 24; // px
  export let label = "Đang tải"; // a11y label
  export let inline = false;
</script>

<span
  class="spinner"
  class:inline
  role="status"
  aria-label={label}
  style="--spinner-size: {size}px"
>
  <span class="sr-only">{label}</span>
</span>

<style>
  .spinner {
    display: inline-block;
    width: var(--spinner-size, 24px);
    height: var(--spinner-size, 24px);
    border-radius: 50%;
    border: 2px solid #e5e7eb;
    border-top-color: #2563eb;
    animation: spin 700ms linear infinite;
    vertical-align: middle;
  }
  .spinner.inline {
    margin-right: 0.4em;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
