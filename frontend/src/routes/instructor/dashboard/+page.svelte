<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../../stores/auth.js";
  import {
    fetchCourseByInstructor,
    fetchHiddenCoursesByInstructor,
    createCourse,
    getSubjects,
    hideCourse,
    publishCourse,
    unpublishCourse,
    unhideCourse,
    deleteCourse,
  } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import {
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
  } from "@sveltestrap/sveltestrap";
  import CourseList from "$lib/components/CourseList.svelte";
  import InstructorWorkspaceNav from "../InstructorWorkspaceNav.svelte";

  $: teacher = user;
  let courses = [];
  let hiddenCourses = [];
  let subjects = [];
  let loading = true;
  let showCreateModal = false;
  let isSubmitting = false;
  let formErrors = {};
  let formStatus = "";
  let formStatusType = "";
  // Tab: "all" | "published" | "draft" | "hidden"
  let activeTab = "all";
  let selectedCourseSlugs = new Set();
  let selectedHiddenSlugs = new Set();
  let bulkMode = false;
  let isBulkActing = false;
  let bulkStatus = "";
  let bulkStatusType = "";
  let lastActiveTab = "all";
  let showBulkDeleteConfirm = false;
  let bulkDeleteCandidates = [];
  let searchKeyword = "";
  let subjectFilter = "all";
  let levelFilter = "all";
  let sortOption = "updated_desc";

  let newCourse = {
    name: "",
    summary: "",
    teacher: "",
    overviewVideo: "",
    level: "Sơ cấp",
    subject: "",
    slug: "",
    image_url: "",
    price: 0,
    is_published: false,
  };

  onMount(async () => {
    try {
      const currentUser = await fetchUser();
      if (currentUser && currentUser.role === "instructor") {
        const [fetched, hidden] = await Promise.allSettled([
          fetchCourseByInstructor(currentUser._id),
          fetchHiddenCoursesByInstructor(currentUser._id),
        ]);
        courses = fetched.status === "fulfilled" ? fetched.value : [];
        hiddenCourses = hidden.status === "fulfilled" ? hidden.value : [];
        courses.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        subjects = await getSubjects();
      }
    } catch (error) {
      console.error("Error loading instructor dashboard:", error);
    } finally {
      loading = false;
    }
  });

  const resetCreateForm = () => {
    newCourse = {
      name: "",
      summary: "",
      teacher: "",
      overviewVideo: "",
      level: "Sơ cấp",
      subject: "",
      slug: "",
      image_url: "",
      price: 0,
      is_published: false,
    };
    formErrors = {};
    formStatus = "";
    formStatusType = "";
  };

  const toggleCreateModal = () => {
    showCreateModal = !showCreateModal;
    if (!showCreateModal) resetCreateForm();
  };

  const slugify = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const validateForm = () => {
    const errors = {};
    if (!newCourse.name.trim()) errors.name = "Tên khóa học là bắt buộc.";
    if (!newCourse.summary.trim())
      errors.summary = "Tóm tắt khóa học là bắt buộc.";
    if (!newCourse.subject) errors.subject = "Hãy chọn chủ đề.";
    if (!newCourse.level) errors.level = "Hãy chọn cấp độ.";
    if (!newCourse.slug.trim()) errors.slug = "Slug là bắt buộc.";
    formErrors = errors;
    return Object.keys(errors).length === 0;
  };

  const handleNameBlur = () => {
    if (!newCourse.slug.trim() && newCourse.name.trim()) {
      newCourse.slug = slugify(newCourse.name);
    }
  };

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    if (!$teacher?._id || !validateForm()) {
      formStatus =
        "Vui lòng hoàn thiện các trường bắt buộc trước khi tạo khóa học.";
      formStatusType = "error";
      return;
    }
    isSubmitting = true;
    formStatus = "Đang tạo khóa học...";
    formStatusType = "";
    try {
      const createdCourse = await createCourse({
        ...newCourse,
        teacher: $teacher._id,
        price: Number(newCourse.price) || 0,
      });
      showCreateModal = false;
      resetCreateForm();
      goto(`/course/${createdCourse.slug}/edit-course/curriculum`);
    } catch (error) {
      console.error("Error creating course:", error);
      formStatus = "Không thể tạo khóa học. Vui lòng thử lại.";
      formStatusType = "error";
    } finally {
      isSubmitting = false;
    }
  };

  // Khi card CourseItem dispatch "courseHidden" → chuyển sang hiddenCourses
  const handleCourseHidden = (event) => {
    const hidden = event.detail;
    courses = courses.filter((c) => c.slug !== hidden.slug);
    hiddenCourses = [hidden, ...hiddenCourses];
  };

  // Khi CourseItem dispatch "courseUpdated" (publish toggle)
  const handleCourseUpdated = (event) => {
    const updated = event.detail;
    courses = courses.map((c) =>
      c.slug === updated.slug ? { ...c, ...updated } : c,
    );
  };

  const handleRestoreHidden = async (course) => {
    try {
      await unhideCourse(course.slug);
      hiddenCourses = hiddenCourses.filter((c) => c.slug !== course.slug);
      courses = [{ ...course, visible: true }, ...courses];
    } catch (err) {
      console.error(err);
    }
  };

  const handleSoftDeleteHidden = async (course) => {
    if (
      !confirm(`Xóa mềm khóa học "${course.name}"? Admin vẫn có thể khôi phục.`)
    )
      return;
    try {
      await deleteCourse(course.slug);
      hiddenCourses = hiddenCourses.filter((c) => c.slug !== course.slug);
    } catch (err) {
      console.error(err);
    }
  };

  const setBulkStatus = (message, type = "") => {
    bulkStatus = message;
    bulkStatusType = type;
  };

  const clearBulkSelection = () => {
    selectedCourseSlugs = new Set();
    selectedHiddenSlugs = new Set();
  };

  const toggleBulkMode = () => {
    bulkMode = !bulkMode;
    if (!bulkMode) {
      clearBulkSelection();
      setBulkStatus("", "");
    }
  };

  const handleToggleCourseSelect = (event) => {
    const { slug, selected } = event.detail;
    const next = new Set(selectedCourseSlugs);
    if (selected) next.add(slug);
    else next.delete(slug);
    selectedCourseSlugs = next;
  };

  const handleToggleHiddenSelect = (slug) => {
    const next = new Set(selectedHiddenSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    selectedHiddenSlugs = next;
  };

  const toggleSelectAllVisible = () => {
    if (activeTab === "hidden") {
      const next = new Set(selectedHiddenSlugs);
      if (visibleCourses.every((c) => next.has(c.slug))) {
        visibleCourses.forEach((c) => next.delete(c.slug));
      } else {
        visibleCourses.forEach((c) => next.add(c.slug));
      }
      selectedHiddenSlugs = next;
      return;
    }

    const next = new Set(selectedCourseSlugs);
    if (visibleCourses.every((c) => next.has(c.slug))) {
      visibleCourses.forEach((c) => next.delete(c.slug));
    } else {
      visibleCourses.forEach((c) => next.add(c.slug));
    }
    selectedCourseSlugs = next;
  };

  const runBulkAction = async (action) => {
    if (isBulkActing) return;

    if (activeTab === "hidden") {
      const selected = filteredHiddenCourses.filter((c) =>
        selectedHiddenSlugs.has(c.slug),
      );
      if (!selected.length) {
        setBulkStatus("Vui lòng chọn ít nhất một khóa học đang ẩn.", "error");
        return;
      }

      isBulkActing = true;
      try {
        if (action === "unhide") {
          await Promise.all(selected.map((c) => unhideCourse(c.slug)));
          hiddenCourses = hiddenCourses.filter(
            (c) => !selectedHiddenSlugs.has(c.slug),
          );
          courses = [
            ...selected.map((c) => ({ ...c, visible: true })),
            ...courses,
          ];
          setBulkStatus(`Đã hiện lại ${selected.length} khóa học.`, "success");
        }

        if (action === "delete") {
          bulkDeleteCandidates = selected;
          showBulkDeleteConfirm = true;
          return;
        }

        selectedHiddenSlugs = new Set();
      } catch (error) {
        console.error(error);
        setBulkStatus(
          "Thao tác hàng loạt thất bại. Vui lòng thử lại.",
          "error",
        );
      } finally {
        isBulkActing = false;
      }
      return;
    }

    const selected = filteredTabCourses.filter((c) =>
      selectedCourseSlugs.has(c.slug),
    );
    if (!selected.length) {
      setBulkStatus("Vui lòng chọn ít nhất một khóa học.", "error");
      return;
    }

    isBulkActing = true;
    try {
      if (action === "publish") {
        await Promise.all(
          selected
            .filter((c) => !c.is_published)
            .map((c) => publishCourse(c.slug)),
        );
        courses = courses.map((c) =>
          selectedCourseSlugs.has(c.slug) ? { ...c, is_published: true } : c,
        );
        setBulkStatus(
          `Đã xuất bản ${selected.length} khóa học đã chọn.`,
          "success",
        );
      }

      // Keep legacy "draft" action key for backward compatibility.
      if (action === "unlist" || action === "draft") {
        const blocked = selected.filter(
          (c) => c.is_published && Number(c.totalStudentsEnrolled || 0) > 0,
        );
        const candidates = selected.filter(
          (c) => c.is_published && Number(c.totalStudentsEnrolled || 0) === 0,
        );

        if (!candidates.length) {
          setBulkStatus(
            "Không thể ngừng bán: các khóa đã chọn đều đang có học viên theo học.",
            "error",
          );
          selectedCourseSlugs = new Set();
          return;
        }

        await Promise.all(candidates.map((c) => unpublishCourse(c.slug)));
        const candidateSlugs = new Set(candidates.map((c) => c.slug));
        courses = courses.map((c) =>
          candidateSlugs.has(c.slug) ? { ...c, is_published: false } : c,
        );
        setBulkStatus(
          blocked.length
            ? `Đã ngừng bán ${candidates.length} khóa học, bỏ qua ${blocked.length} khóa do đang có học viên.`
            : `Đã ngừng bán ${candidates.length} khóa học.`,
          "success",
        );
      }

      if (action === "hide") {
        if (
          !confirm(
            `Bạn có chắc muốn ẩn ${selected.length} khóa học đã chọn? Học viên sẽ không còn nhìn thấy các khóa học này.`,
          )
        ) {
          isBulkActing = false;
          return;
        }

        await Promise.all(selected.map((c) => hideCourse(c.slug)));
        hiddenCourses = [
          ...selected.map((c) => ({ ...c, visible: false })),
          ...hiddenCourses,
        ];
        courses = courses.filter((c) => !selectedCourseSlugs.has(c.slug));
        setBulkStatus(`Đã ẩn ${selected.length} khóa học đã chọn.`, "success");
      }

      selectedCourseSlugs = new Set();
    } catch (error) {
      console.error(error);
      setBulkStatus("Thao tác hàng loạt thất bại. Vui lòng thử lại.", "error");
    } finally {
      isBulkActing = false;
    }
  };

  const executeBulkSoftDelete = async () => {
    if (!bulkDeleteCandidates.length) {
      showBulkDeleteConfirm = false;
      return;
    }

    isBulkActing = true;
    try {
      await Promise.all(bulkDeleteCandidates.map((c) => deleteCourse(c.slug)));
      const candidateSlugs = new Set(bulkDeleteCandidates.map((c) => c.slug));
      hiddenCourses = hiddenCourses.filter((c) => !candidateSlugs.has(c.slug));
      selectedHiddenSlugs = new Set();
      setBulkStatus(
        `Đã xóa mềm ${bulkDeleteCandidates.length} khóa học.`,
        "success",
      );
      showBulkDeleteConfirm = false;
      bulkDeleteCandidates = [];
    } catch (error) {
      console.error(error);
      setBulkStatus("Xóa mềm hàng loạt thất bại. Vui lòng thử lại.", "error");
    } finally {
      isBulkActing = false;
    }
  };

  const matchesKeyword = (course, keyword) => {
    if (!keyword) return true;
    const normalized = keyword.toLowerCase();
    return [course.name, course.summary, course.subject, course.level]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(normalized));
  };

  const sortCourses = (list, option) => {
    const sorted = [...list];
    switch (option) {
      case "updated_asc":
        sorted.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        break;
      case "name_asc":
        sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
        break;
      case "name_desc":
        sorted.sort((a, b) => (b.name || "").localeCompare(a.name || "", "vi"));
        break;
      case "students_desc":
        sorted.sort(
          (a, b) =>
            (b.totalStudentsEnrolled || 0) - (a.totalStudentsEnrolled || 0),
        );
        break;
      case "rating_desc":
        sorted.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "updated_desc":
      default:
        sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
    }
    return sorted;
  };

  const clearListControls = () => {
    searchKeyword = "";
    subjectFilter = "all";
    levelFilter = "all";
    sortOption = "updated_desc";
  };

  $: courseCount = courses.length;
  $: publishedCount = courses.filter((c) => c.is_published).length;
  $: unpublishedCount = courses.filter((c) => !c.is_published).length;
  $: totalStudents = courses.reduce(
    (t, c) => t + (c.totalStudentsEnrolled || 0),
    0,
  );
  $: ratedCourses = courses.filter((c) => (c.avgRating || 0) > 0);
  $: averageRating =
    ratedCourses.length > 0
      ? (
          ratedCourses.reduce((t, c) => t + (c.avgRating || 0), 0) /
          ratedCourses.length
        ).toFixed(1)
      : "0.0";
  $: tabCourses =
    activeTab === "published"
      ? courses.filter((c) => c.is_published)
      : activeTab === "draft"
        ? courses.filter((c) => !c.is_published)
        : courses;
  $: filteredTabCourses = sortCourses(
    tabCourses.filter(
      (c) =>
        matchesKeyword(c, searchKeyword) &&
        (subjectFilter === "all" || c.subject === subjectFilter) &&
        (levelFilter === "all" || c.level === levelFilter),
    ),
    sortOption,
  );
  $: filteredHiddenCourses = sortCourses(
    hiddenCourses.filter(
      (c) =>
        matchesKeyword(c, searchKeyword) &&
        (subjectFilter === "all" || c.subject === subjectFilter) &&
        (levelFilter === "all" || c.level === levelFilter),
    ),
    sortOption,
  );
  $: visibleCourses =
    activeTab === "hidden" ? filteredHiddenCourses : filteredTabCourses;
  $: activeFilterCount = [searchKeyword, subjectFilter, levelFilter].filter(
    (value) => value && value !== "all",
  ).length;
  $: visibleSelectedCount =
    activeTab === "hidden"
      ? visibleCourses.filter((c) => selectedHiddenSlugs.has(c.slug)).length
      : visibleCourses.filter((c) => selectedCourseSlugs.has(c.slug)).length;
  $: allVisibleSelected =
    activeTab === "hidden"
      ? visibleCourses.length > 0 &&
        visibleCourses.every((c) => selectedHiddenSlugs.has(c.slug))
      : visibleCourses.length > 0 &&
        visibleCourses.every((c) => selectedCourseSlugs.has(c.slug));
  $: if (activeTab !== lastActiveTab) {
    setBulkStatus("", "");
    clearBulkSelection();
    lastActiveTab = activeTab;
  }
</script>

{#if $teacher && $teacher.role === "instructor"}
  <section class="instructor-shell">
    <div class="instructor-hero">
      <h1>Instructor Workspace</h1>
      <p>
        Theo dõi hiệu suất khóa học, cập nhật hồ sơ giảng viên và khởi tạo khóa
        học mới từ một bảng điều khiển tập trung.
      </p>
      <div class="instructor-hero-meta">
        <span class="instructor-hero-chip"
          >{publishedCount}/{courseCount} khóa học đã xuất bản</span
        >
        <span class="instructor-hero-chip"
          >{totalStudents} học viên đang theo học</span
        >
        <span class="instructor-hero-chip"
          >Đánh giá trung bình {averageRating} ({ratedCourses.length} khóa có đánh
          giá)</span
        >
      </div>
    </div>

    <InstructorWorkspaceNav />

    <div class="admin-stats-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Tổng số khóa học</p>
        <p class="admin-stat-value">{courseCount}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Đã xuất bản</p>
        <p class="admin-stat-value">{publishedCount}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Học viên tích cực</p>
        <p class="admin-stat-value">{totalStudents}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Đánh giá trung bình</p>
        <p class="admin-stat-value">{averageRating}</p>
      </article>
    </div>

    <div class="instructor-section-grid">
      <article class="instructor-card">
        <p class="instructor-kicker">Hồ sơ giảng viên</p>
        <div class="instructor-profile-head">
          {#if $teacher.thumbnail}
            <img
              class="instructor-avatar"
              src={$teacher.thumbnail}
              alt={$teacher.username}
            />
          {:else}
            <div class="instructor-avatar-fallback">N/A</div>
          {/if}
          <div>
            <h3>{$teacher.username}</h3>
            <p class="instructor-helper">{$teacher.email}</p>
          </div>
        </div>
        <div class="instructor-profile-meta">
          <p>
            <strong>Tiểu sử:</strong>
            {$teacher.bio || "Chưa có mô tả hồ sơ."}
          </p>
          <p><strong>Vai trò:</strong> Giảng viên</p>
        </div>
        <div class="instructor-inline-stats">
          <span class="instructor-inline-stat"
            >{courseCount} khóa học đang quản lý</span
          >
          <span class="instructor-inline-stat"
            >{publishedCount} khóa học đang mở bán</span
          >
        </div>
        <a class="course-edit-btn outline" href="/profile">Chỉnh sửa hồ sơ</a>
      </article>

      <article class="instructor-card">
        <p class="instructor-kicker">Hành động nhanh</p>
        <div class="instructor-action-list">
          <button
            class="course-edit-btn primary action-button"
            on:click={toggleCreateModal}
          >
            <i class="bi bi-plus-circle-fill"></i>
            <span>Tạo khóa học mới</span>
          </button>
          <a class="instructor-action-link" href="/instructor/gradebook">
            <strong>Mở Gradebook</strong>
            <span
              >Theo dõi danh sách học viên, tiến độ và trạng thái học tập.</span
            >
          </a>
          <a class="instructor-action-link" href="/instructor/earnings">
            <strong>Xem Earnings</strong>
            <span
              >Kiểm tra doanh thu, hóa đơn và xu hướng thu nhập gần đây.</span
            >
          </a>
        </div>
      </article>
    </div>

    <!-- Tabs danh sách khóa học -->
    <div class="instructor-surface-wrap">
      <div class="course-edit-toolbar">
        <div>
          <h2 class="course-edit-section-title">Danh sách khóa học</h2>
          <p class="course-edit-section-subtitle">
            Truy cập nhanh vào từng khóa học để tiếp tục biên tập nội dung và
            cập nhật trạng thái.
          </p>
        </div>
        {#if !loading && visibleCourses.length}
          <button
            type="button"
            class={`course-edit-btn ${bulkMode ? "danger" : "outline"}`}
            on:click={toggleBulkMode}
          >
            <i class={`bi ${bulkMode ? "bi-x-circle" : "bi-list-check"}`}></i>
            {bulkMode ? "Thoát thao tác hàng loạt" : "Thao tác hàng loạt"}
          </button>
        {/if}
      </div>

      <nav class="instructor-nav-tabs" aria-label="Lọc khóa học">
        <button
          class="instructor-tab-btn"
          class:active={activeTab === "all"}
          on:click={() => (activeTab = "all")}
        >
          Tất cả <span class="tab-count">{courseCount}</span>
        </button>
        <button
          class="instructor-tab-btn"
          class:active={activeTab === "published"}
          on:click={() => (activeTab = "published")}
        >
          Đã xuất bản <span class="tab-count">{publishedCount}</span>
        </button>
        <button
          class="instructor-tab-btn"
          class:active={activeTab === "draft"}
          on:click={() => (activeTab = "draft")}
        >
          Bản nháp <span class="tab-count">{unpublishedCount}</span>
        </button>
        <button
          class="instructor-tab-btn"
          class:active={activeTab === "hidden"}
          on:click={() => (activeTab = "hidden")}
        >
          Đã ẩn <span class="tab-count">{hiddenCourses.length}</span>
        </button>
      </nav>

      <div class="course-list-controls">
        <div class="control-field search-field">
          <label for="dashboard-course-search">Tìm nhanh</label>
          <input
            id="dashboard-course-search"
            class="instructor-input"
            type="text"
            placeholder="Tên, mô tả, chủ đề, cấp độ..."
            bind:value={searchKeyword}
          />
        </div>

        <div class="control-field">
          <label for="dashboard-course-subject">Chủ đề</label>
          <select
            id="dashboard-course-subject"
            class="instructor-select"
            bind:value={subjectFilter}
          >
            <option value="all">Tất cả chủ đề</option>
            {#each subjects as subject}
              <option value={subject.name}>{subject.name}</option>
            {/each}
          </select>
        </div>

        <div class="control-field">
          <label for="dashboard-course-level">Cấp độ</label>
          <select
            id="dashboard-course-level"
            class="instructor-select"
            bind:value={levelFilter}
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="Sơ cấp">Sơ cấp</option>
            <option value="Trung cấp">Trung cấp</option>
            <option value="Chuyên gia">Chuyên gia</option>
          </select>
        </div>

        <div class="control-field">
          <label for="dashboard-course-sort">Sắp xếp</label>
          <select
            id="dashboard-course-sort"
            class="instructor-select"
            bind:value={sortOption}
          >
            <option value="updated_desc">Mới cập nhật</option>
            <option value="updated_asc">Cũ cập nhật trước</option>
            <option value="name_asc">Tên A-Z</option>
            <option value="name_desc">Tên Z-A</option>
            <option value="students_desc">Nhiều học viên nhất</option>
            <option value="rating_desc">Đánh giá cao nhất</option>
          </select>
        </div>

        <div class="controls-actions">
          <button
            type="button"
            class="course-edit-btn outline"
            on:click={clearListControls}
            disabled={!activeFilterCount && sortOption === "updated_desc"}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <p class="list-result-meta">
        Hiển thị <strong>{visibleCourses.length}</strong> khóa học trong mục này
        {#if activeFilterCount > 0}
          ({activeFilterCount} bộ lọc đang bật)
        {/if}
      </p>

      {#if bulkMode && !loading && visibleCourses.length}
        <div class="bulk-action-bar">
          <div class="bulk-action-left">
            <button
              type="button"
              class="bulk-select-toggle"
              on:click={toggleSelectAllVisible}
              disabled={isBulkActing}
            >
              <i
                class={`bi ${allVisibleSelected ? "bi-check-square-fill" : "bi-square"}`}
              ></i>
              {allVisibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <span class="bulk-selected-count">
              Đã chọn {visibleSelectedCount} khóa học
            </span>
          </div>

          <div class="bulk-action-right">
            {#if activeTab !== "hidden"}
              <button
                class="bulk-btn publish"
                disabled={isBulkActing}
                on:click={() => runBulkAction("publish")}>Xuất bản</button
              >
              <button
                class="bulk-btn unlist"
                disabled={isBulkActing}
                on:click={() => runBulkAction("unlist")}>Ngừng bán</button
              >
              <button
                class="bulk-btn hide"
                disabled={isBulkActing}
                on:click={() => runBulkAction("hide")}>Ẩn</button
              >
            {:else}
              <button
                class="bulk-btn publish"
                disabled={isBulkActing}
                on:click={() => runBulkAction("unhide")}>Hiện lại</button
              >
              <button
                class="bulk-btn danger"
                disabled={isBulkActing}
                on:click={() => runBulkAction("delete")}>Xóa mềm</button
              >
            {/if}
            <button
              class="bulk-btn reset"
              disabled={isBulkActing || !visibleSelectedCount}
              on:click={clearBulkSelection}>Bỏ chọn</button
            >
          </div>
        </div>
      {/if}

      {#if bulkStatus}
        <p class={`course-edit-status ${bulkStatusType}`}>{bulkStatus}</p>
      {/if}

      {#if loading}
        <div class="admin-empty-state">Đang tải danh sách khóa học...</div>
      {:else if activeTab !== "hidden"}
        {#if filteredTabCourses.length === 0}
          <div class="admin-empty-state">
            Không có khóa học nào trong mục này.
          </div>
        {:else}
          <!-- Forwarding events từ CourseItem qua CourseList -->
          <CourseList
            courses={filteredTabCourses}
            isEdit="true"
            selectable={bulkMode}
            {selectedCourseSlugs}
            on:courseHidden={handleCourseHidden}
            on:courseUpdated={handleCourseUpdated}
            on:toggleSelect={handleToggleCourseSelect}
          />
        {/if}
      {:else}
        <!-- Tab: Đã ẩn -->
        {#if filteredHiddenCourses.length === 0}
          <div class="admin-empty-state">Không có khóa học nào đang bị ẩn.</div>
        {:else}
          <div class="hidden-courses-list">
            {#each filteredHiddenCourses as hc (hc.slug)}
              <article class="hidden-course-card">
                <button
                  type="button"
                  class="hidden-select-toggle"
                  class:show={bulkMode}
                  class:is-selected={selectedHiddenSlugs.has(hc.slug)}
                  on:click={() => handleToggleHiddenSelect(hc.slug)}
                  aria-label={selectedHiddenSlugs.has(hc.slug)
                    ? "Bỏ chọn khóa học ẩn"
                    : "Chọn khóa học ẩn"}
                >
                  <i
                    class={`bi ${
                      selectedHiddenSlugs.has(hc.slug)
                        ? "bi-check-circle-fill"
                        : "bi-circle"
                    }`}
                  ></i>
                </button>
                <img
                  class="hidden-course-img"
                  src={hc.image_url}
                  alt={hc.name}
                />
                <div class="hidden-course-info">
                  <h3>{hc.name}</h3>
                  <p class="hidden-course-meta">
                    <span class="course-status-badge draft">Đã ẩn</span>
                    <span class="ms-2">{hc.subject} · {hc.level}</span>
                  </p>
                  <p class="instructor-helper" style="font-size:0.82rem">
                    Cập nhật: {new Date(hc.updatedAt).toLocaleDateString(
                      "vi-VN",
                    )}
                  </p>
                </div>
                <div class="hidden-course-actions">
                  <button
                    class="cia-btn publish"
                    on:click={() => handleRestoreHidden(hc)}
                  >
                    <i class="bi bi-eye"></i> Hiện lại
                  </button>
                  <button
                    class="cia-btn hide"
                    on:click={() =>
                      goto(`/course/${hc.slug}/edit-course/settings`)}
                  >
                    <i class="bi bi-pencil-square"></i> Sửa
                  </button>
                  <button
                    class="cia-btn unpublish"
                    on:click={() => handleSoftDeleteHidden(hc)}
                  >
                    <i class="bi bi-trash"></i> Xóa
                  </button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Modal tạo khóa học -->
    <Modal isOpen={showCreateModal} toggle={toggleCreateModal} size="lg">
      <ModalHeader toggle={toggleCreateModal}>Tạo khóa học mới</ModalHeader>
      <ModalBody>
        <form on:submit={handleCreateCourse}>
          <div class="instructor-form-grid">
            <div class="instructor-form-field">
              <label for="courseName">Tên khóa học</label>
              <input
                id="courseName"
                class="instructor-input"
                type="text"
                bind:value={newCourse.name}
                on:blur={handleNameBlur}
                placeholder="Ví dụ: JavaScript từ cơ bản đến thực chiến"
              />
              {#if formErrors.name}
                <p class="instructor-error">{formErrors.name}</p>
              {/if}
            </div>

            <div class="instructor-form-field">
              <label for="courseSlug">Slug</label>
              <input
                id="courseSlug"
                class="instructor-input"
                type="text"
                bind:value={newCourse.slug}
                placeholder="javascript-tu-co-ban"
              />
              <p class="instructor-helper">
                Tự tạo khi để trống và rời khỏi trường tên khóa học.
              </p>
              {#if formErrors.slug}
                <p class="instructor-error">{formErrors.slug}</p>
              {/if}
            </div>
          </div>

          <div class="instructor-form-field">
            <label for="courseSummary">Tóm tắt khóa học</label>
            <textarea
              id="courseSummary"
              class="instructor-textarea"
              bind:value={newCourse.summary}
              placeholder="Mô tả ngắn để học viên hiểu nhanh giá trị của khóa học"
            ></textarea>
            {#if formErrors.summary}
              <p class="instructor-error">{formErrors.summary}</p>
            {/if}
          </div>

          <div class="instructor-form-grid">
            <div class="instructor-form-field">
              <label for="courseSubject">Chủ đề</label>
              <select
                id="courseSubject"
                class="instructor-select"
                bind:value={newCourse.subject}
              >
                <option value="">Chọn chủ đề</option>
                {#each subjects as subject}
                  <option value={subject.name}>{subject.name}</option>
                {/each}
              </select>
              {#if formErrors.subject}
                <p class="instructor-error">{formErrors.subject}</p>
              {/if}
            </div>

            <div class="instructor-form-field">
              <label for="courseLevel">Cấp độ</label>
              <select
                id="courseLevel"
                class="instructor-select"
                bind:value={newCourse.level}
              >
                <option value="Sơ cấp">Sơ cấp</option>
                <option value="Trung cấp">Trung cấp</option>
                <option value="Chuyên gia">Chuyên gia</option>
              </select>
              {#if formErrors.level}
                <p class="instructor-error">{formErrors.level}</p>
              {/if}
            </div>
          </div>

          <div class="instructor-form-grid">
            <div class="instructor-form-field">
              <label for="imageUrl">Ảnh đại diện</label>
              <input
                id="imageUrl"
                class="instructor-input"
                type="text"
                bind:value={newCourse.image_url}
                placeholder="https://..."
              />
            </div>

            <div class="instructor-form-field">
              <label for="overviewVideo">Video giới thiệu</label>
              <input
                id="overviewVideo"
                class="instructor-input"
                type="text"
                bind:value={newCourse.overviewVideo}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div class="instructor-form-field field-narrow">
            <label for="price">Giá (VND)</label>
            <input
              id="price"
              class="instructor-input"
              type="number"
              min="0"
              bind:value={newCourse.price}
            />
          </div>

          {#if formStatus}
            <p class={`course-edit-status ${formStatusType}`}>{formStatus}</p>
          {/if}

          <div class="modal-actions">
            <button
              type="button"
              class="course-edit-btn outline"
              on:click={toggleCreateModal}
            >
              Hủy
            </button>
            <button
              type="submit"
              class="course-edit-btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang tạo..." : "Tạo khóa học"}
            </button>
          </div>
        </form>
      </ModalBody>
    </Modal>

    <Modal
      isOpen={showBulkDeleteConfirm}
      toggle={() => {
        if (isBulkActing) return;
        showBulkDeleteConfirm = false;
      }}
      size="lg"
    >
      <ModalHeader
        toggle={() => {
          if (isBulkActing) return;
          showBulkDeleteConfirm = false;
        }}
      >
        Xác nhận xóa mềm hàng loạt
      </ModalHeader>
      <ModalBody>
        <p class="bulk-confirm-note">
          Bạn sắp xóa mềm <strong>{bulkDeleteCandidates.length}</strong> khóa học.
          Admin vẫn có thể khôi phục các khóa học này.
        </p>
        <div class="bulk-preview-list">
          {#each bulkDeleteCandidates.slice(0, 8) as c}
            <div class="bulk-preview-item">• {c.name}</div>
          {/each}
          {#if bulkDeleteCandidates.length > 8}
            <div class="bulk-preview-more">
              ...và {bulkDeleteCandidates.length - 8} khóa học khác
            </div>
          {/if}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          class="course-edit-btn outline"
          on:click={() => (showBulkDeleteConfirm = false)}
          disabled={isBulkActing}
        >
          Hủy
        </button>
        <button
          type="button"
          class="course-edit-btn danger"
          on:click={executeBulkSoftDelete}
          disabled={isBulkActing}
        >
          {isBulkActing ? "Đang xóa..." : "Xác nhận xóa mềm"}
        </button>
      </ModalFooter>
    </Modal>
  </section>
{:else}
  <section class="instructor-shell">
    <div class="admin-card">
      <h2>Bạn không có quyền truy cập trang này.</h2>
    </div>
  </section>
{/if}

<style>
  .action-button {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 40px;
  }

  .action-button i {
    font-size: 0.94rem;
    line-height: 1;
  }

  .action-button span {
    display: inline-block;
    line-height: 1.1;
  }

  .field-narrow {
    max-width: 220px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  /* ---- Course tabs ---- */
  .instructor-nav-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid #e0e9ff;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .instructor-tab-btn {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    padding: 8px 16px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #4b6286;
    cursor: pointer;
    margin-bottom: -2px;
    transition:
      color 0.15s,
      border-color 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .instructor-tab-btn.active {
    color: #1d4ed8;
    border-bottom-color: #1d4ed8;
  }

  .tab-count {
    background: #e0edff;
    color: #1d4ed8;
    border-radius: 20px;
    padding: 1px 8px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .instructor-tab-btn.active .tab-count {
    background: #1d4ed8;
    color: #fff;
  }

  .course-list-controls {
    display: grid;
    grid-template-columns:
      minmax(210px, 1.35fr)
      repeat(3, minmax(145px, 1fr))
      auto;
    gap: 0.7rem;
    align-items: end;
    margin: 0 0 0.75rem;
  }

  .control-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .control-field label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #4b6286;
  }

  .controls-actions {
    display: flex;
    justify-content: flex-end;
    align-items: end;
  }

  .controls-actions .course-edit-btn {
    white-space: nowrap;
    min-height: 40px;
  }

  .list-result-meta {
    margin: 0 0 0.85rem;
    font-size: 0.84rem;
    color: #4b6286;
  }

  .list-result-meta strong {
    color: #102247;
  }

  /* ---- Hidden courses list ---- */
  .hidden-courses-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hidden-course-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    flex-wrap: wrap;
    position: relative;
  }

  .hidden-select-toggle {
    display: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    background: #fff;
    color: #6b7280;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .hidden-select-toggle.show {
    display: inline-flex;
  }

  .hidden-select-toggle:hover,
  .hidden-select-toggle.is-selected {
    border-color: #2563eb;
    color: #2563eb;
  }

  .hidden-course-img {
    width: 88px;
    height: 58px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .hidden-course-info {
    flex: 1;
    min-width: 160px;
  }

  .hidden-course-info h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #10234a;
    margin: 0 0 4px;
  }

  .hidden-course-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82rem;
    color: #4b6286;
    margin: 0;
  }

  .hidden-course-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* Reuse cia-btn from CourseItem */
  .cia-btn {
    padding: 5px 12px;
    border: none;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: background 0.15s;
  }
  .cia-btn.publish {
    background: #d1fae5;
    color: #065f46;
  }
  .cia-btn.publish:hover {
    background: #a7f3d0;
  }
  .cia-btn.hide {
    background: #e0edff;
    color: #1d4ed8;
  }
  .cia-btn.hide:hover {
    background: #c7dcff;
  }
  .cia-btn.unpublish {
    background: #fee2e2;
    color: #991b1b;
  }
  .cia-btn.unpublish:hover {
    background: #fecaca;
  }

  .course-status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .course-status-badge.draft {
    background: #fef3c7;
    color: #92400e;
  }

  .bulk-action-bar {
    margin: 0 0 0.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid #dbeafe;
    background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
    border-radius: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .bulk-action-left,
  .bulk-action-right {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .bulk-select-toggle {
    border: 1px solid #bfdbfe;
    background: #fff;
    color: #1d4ed8;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 0.83rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .bulk-selected-count {
    font-size: 0.82rem;
    color: #334155;
    font-weight: 600;
  }

  .bulk-btn {
    border: none;
    border-radius: 8px;
    padding: 6px 11px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .bulk-btn.publish {
    background: #d1fae5;
    color: #065f46;
  }

  .bulk-btn.unlist {
    background: #fef3c7;
    color: #92400e;
  }

  .bulk-btn.hide {
    background: #e0edff;
    color: #1e40af;
  }

  .bulk-btn.danger {
    background: #fee2e2;
    color: #991b1b;
  }

  .bulk-btn.reset {
    background: #f3f4f6;
    color: #374151;
  }

  .bulk-btn:disabled,
  .bulk-select-toggle:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .bulk-confirm-note {
    margin: 0 0 0.6rem;
    color: #334155;
    font-size: 0.92rem;
  }

  .bulk-preview-list {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.65rem 0.75rem;
    background: #f8fafc;
    max-height: 260px;
    overflow: auto;
  }

  .bulk-preview-item {
    font-size: 0.88rem;
    color: #1e293b;
    margin-bottom: 0.32rem;
  }

  .bulk-preview-more {
    margin-top: 0.2rem;
    font-size: 0.84rem;
    color: #64748b;
    font-style: italic;
  }

  .action-button {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 40px;
  }

  .field-narrow {
    max-width: 220px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .course-list-controls {
      grid-template-columns: 1fr;
    }

    .controls-actions {
      justify-content: flex-start;
    }

    .field-narrow {
      max-width: 100%;
    }
    .hidden-course-card {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
