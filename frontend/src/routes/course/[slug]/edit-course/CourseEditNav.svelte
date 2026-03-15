<!-- src/routes/course/[slug]/edit/CourseEditNav.svelte -->
<script>
  import { page } from "$app/stores";

  export let courseName = "";
  const slug = $page.params.slug;
  const tabs = [
    { name: "Mục lục", path: "curriculum" },
    { name: "Cài đặt", path: "settings" },
    { name: "Hỏi đáp", path: "faq" },
  ];

  $: currentPath = $page.url.pathname;
  const isActiveTab = (tabPath) =>
    currentPath.includes(`/edit-course/${tabPath}`);
</script>

<nav class="course-edit-nav mb-3" aria-label="Điều hướng chỉnh sửa khóa học">
  <ul class="course-edit-tabs">
    <li class="course-edit-title-card">
      <p class="course-edit-title-label">Khóa học đang chỉnh sửa</p>
      <p class="course-edit-title-value">{courseName}</p>
    </li>
    {#each tabs as tab}
      <li>
        <a
          href={`/course/${slug}/edit-course/${tab.path}`}
          class={`course-edit-tab-link ${isActiveTab(tab.path) ? "active" : ""}`}
          aria-current={isActiveTab(tab.path) ? "page" : undefined}
        >
          {tab.name}
        </a>
      </li>
    {/each}
  </ul>
</nav>
