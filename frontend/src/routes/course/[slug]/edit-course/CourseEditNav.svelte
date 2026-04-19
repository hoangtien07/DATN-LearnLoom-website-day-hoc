<!-- src/routes/course/[slug]/edit/CourseEditNav.svelte -->
<script>
  import { page } from "$app/stores";

  export let courseName = "";
  // slug reactive theo $page để nav hoạt động đúng khi user đổi slug bằng URL.
  $: slug = $page.params.slug;
  const tabs = [
    { name: "Mục lục", path: "curriculum" },
    { name: "Cài đặt", path: "settings" },
    { name: "Hỏi đáp", path: "faq" },
  ];

  // Reactive computed: Svelte track $page.url.pathname → re-evaluate khi route đổi.
  // Helper function closure trước đây không trigger re-render khi currentPath đổi
  // (Svelte không track deps bên trong function call trong template).
  $: currentPath = $page.url.pathname;
  $: activeTabPath =
    tabs.find((t) => currentPath.includes(`/edit-course/${t.path}`))?.path ||
    "";
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
          class="course-edit-tab-link"
          class:active={activeTabPath === tab.path}
          aria-current={activeTabPath === tab.path ? "page" : undefined}
        >
          {tab.name}
        </a>
      </li>
    {/each}
  </ul>
</nav>
