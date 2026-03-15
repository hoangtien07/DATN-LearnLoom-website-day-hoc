<script>
  import { page } from "$app/stores";

  const tabs = [
    { label: "Dashboard", href: "/instructor/dashboard" },
    { label: "Gradebook", href: "/instructor/gradebook" },
    { label: "Earnings", href: "/instructor/earnings" },
  ];

  $: currentPath = $page.url.pathname;
  const isActive = (href) =>
    currentPath === href || currentPath.startsWith(`${href}/`);
</script>

<nav
  class="instructor-workspace-nav"
  aria-label="Điều hướng khu vực giảng viên"
>
  <div class="instructor-nav-tabs">
    {#each tabs as tab}
      <a
        href={tab.href}
        class={`instructor-nav-link ${isActive(tab.href) ? "active" : ""}`}
        aria-current={isActive(tab.href) ? "page" : undefined}
      >
        {tab.label}
      </a>
    {/each}
  </div>
</nav>
