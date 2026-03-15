<script>
  import { onMount } from "svelte";
  import { fetchCourseBySlug } from "$lib/js/api";
  import { page } from "$app/stores";
  import CourseEditNav from "./CourseEditNav.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";

  const slug = $page.params.slug;
  let course = null;
  let fetchError = "";

  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);
    } catch (error) {
      console.error("Error fetching data:", error);
      fetchError = "Không thể tải thông tin khóa học. Vui lòng thử lại.";
    }
  });

  const tabLabels = {
    curriculum: "Mục lục",
    settings: "Cài đặt",
    faq: "Hỏi đáp",
  };
  $: currentTab = Object.keys(tabLabels).find((key) =>
    $page.url.pathname.includes(`/edit-course/${key}`),
  );
  $: breadcrumbItems = [
    { label: "Dashboard giảng viên", href: "/instructor/dashboard" },
    {
      label: course?.name ?? "Khóa học",
      href: `/course/${slug}/edit-course/curriculum`,
    },
    {
      label: currentTab ? tabLabels[currentTab] : "Chỉnh sửa",
    },
  ];

  $: sectionCount = course?.sections?.length ?? 0;
  $: lessonCount =
    course?.sections?.reduce(
      (total, section) => total + (section.items?.length ?? 0),
      0,
    ) ?? 0;
  $: faqCount = course?.faqs?.length ?? 0;
</script>

<section class="course-edit-shell">
  {#if course}
    <Breadcrumbs items={breadcrumbItems} />
    <div class="course-edit-hero">
      <h1>Không gian chỉnh sửa khóa học</h1>
      <p>
        Tinh chỉnh nội dung, cấu hình hiển thị và FAQ trong cùng một workspace
        tập trung để xuất bản nhanh, nhất quán và rõ ràng hơn.
      </p>
      <div class="course-edit-meta">
        <span class="course-edit-meta-chip">{sectionCount} chương</span>
        <span class="course-edit-meta-chip">{lessonCount} mục bài học</span>
        <span class="course-edit-meta-chip">{faqCount} câu hỏi FAQ</span>
      </div>
    </div>

    <CourseEditNav courseName={course.name} />

    <div class="course-edit-workspace">
      <slot />
    </div>
  {:else if fetchError}
    <div class="course-edit-workspace">
      <div class="course-edit-empty">{fetchError}</div>
    </div>
  {:else}
    <div class="course-edit-workspace">
      <div class="course-edit-empty">
        Đang tải không gian chỉnh sửa khóa học...
      </div>
    </div>
  {/if}
</section>
