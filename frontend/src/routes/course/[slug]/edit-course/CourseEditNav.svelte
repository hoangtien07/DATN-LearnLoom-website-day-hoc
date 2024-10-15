<!-- src/routes/course/[slug]/edit/CourseEditNav.svelte -->
<script>
  import { page } from "$app/stores";

  export let courseName = "";
  const slug = $page.params.slug;
  const tabs = [
    { name: "Mục lục", path: "curriculum" },
    { name: "Cài đặt", path: "settings" },
    // { name: "Thanh toán", path: "payment" },
    { name: "Hỏi đáp", path: "faq" },
  ];
</script>

<nav class="course-edit-nav mb-4">
  <!-- <div class="d-flex justify-content-between">
    <a href="/instructor/dashboard" class="back-button"
      >Trở về khóa học của tôi</a
    >
    <div class="course-name">Khóa học: {courseName}</div>
  </div> -->
  <ul class="nav-tabs d-flex">
    <li style="flex:1">
      Khóa học: {courseName}
    </li>
    {#each tabs as tab}
      <li class="tabs">
        <a href={`/course/${slug}/edit-course/${tab.path}`} class="nav-link">
          {tab.name}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  ul {
    padding: 0;
  }
  li {
    padding: 4px 0;
  }
  .tabs {
    text-align: center;
    width: 20%;
    transition: 0.3s ease;
  }
  .tabs:hover {
    background-color: #ededed;
  }
</style>
