<script>
  import { onMount } from "svelte";
  import { fetchCourseByInstructor, getEnrolledStudents } from "$lib/js/api";
  import { user, fetchUser } from "../../../stores/auth";
  import InstructorWorkspaceNav from "../InstructorWorkspaceNav.svelte";

  let courses = [];
  let enrolledStudents = [];
  let selectedCourse = null;
  let loading = false;
  let initialLoading = true;
  let searchQuery = "";
  let progressFilter = "all";
  let sortBy = "progress-desc";
  let currentPage = 1;
  const studentsPerPage = 6;

  onMount(async () => {
    try {
      const currentUser = await fetchUser();
      if (currentUser && currentUser.role === "instructor") {
        courses = await fetchCourseByInstructor(currentUser._id);
        if (courses.length > 0) {
          selectedCourse = courses[0];
          await fetchStudentsForCourse(courses[0]._id);
        }
      }
    } catch (error) {
      console.error("Error loading gradebook:", error);
    } finally {
      initialLoading = false;
    }
  });

  const fetchStudentsForCourse = async (courseId) => {
    loading = true;
    try {
      enrolledStudents = await getEnrolledStudents(courseId);
      currentPage = 1;
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    } finally {
      loading = false;
    }
  };

  const handleCourseChange = async (course) => {
    selectedCourse = course;
    await fetchStudentsForCourse(course._id);
  };

  $: filteredStudents = enrolledStudents.filter((student) => {
    const progress = student.progress || 0;
    const matchSearch =
      student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (progressFilter === "all") return true;
    if (progressFilter === "not-started") return progress <= 0;
    if (progressFilter === "in-progress") return progress > 0 && progress < 100;
    if (progressFilter === "completed") return progress >= 100;
    return true;
  });

  $: sortedStudents = [...filteredStudents].sort((a, b) => {
    const nameA = (a.username || "").toLowerCase();
    const nameB = (b.username || "").toLowerCase();
    const progressA = a.progress || 0;
    const progressB = b.progress || 0;

    if (sortBy === "name-asc") return nameA.localeCompare(nameB, "vi");
    if (sortBy === "name-desc") return nameB.localeCompare(nameA, "vi");
    if (sortBy === "progress-asc") return progressA - progressB;
    return progressB - progressA;
  });

  $: totalPages = Math.ceil(sortedStudents.length / studentsPerPage);
  $: paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage,
  );

  $: totalCourses = courses.length;
  $: totalStudents = enrolledStudents.length;
  $: averageProgress =
    enrolledStudents.length > 0
      ? Math.round(
          enrolledStudents.reduce(
            (total, student) => total + (student.progress || 0),
            0,
          ) / enrolledStudents.length,
        )
      : 0;
  $: completedStudents = enrolledStudents.filter(
    (student) => (student.progress || 0) >= 100,
  ).length;

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  };
</script>

{#if $user && $user.role === "instructor"}
  <section class="instructor-shell">
    <div class="instructor-hero">
      <h1>Gradebook</h1>
      <p>
        Chọn khóa học, theo dõi tiến độ từng học viên và phát hiện nhanh những
        nhóm cần hỗ trợ thêm.
      </p>
      <div class="instructor-hero-meta">
        <span class="instructor-hero-chip"
          >{totalCourses} khóa học đang giảng dạy</span
        >
        <span class="instructor-hero-chip"
          >{totalStudents} học viên trong khóa đang chọn</span
        >
        <span class="instructor-hero-chip"
          >Tiến độ trung bình {averageProgress}%</span
        >
      </div>
    </div>

    <InstructorWorkspaceNav />

    <div class="admin-stats-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Khóa học đang giảng dạy</p>
        <p class="admin-stat-value">{totalCourses}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Học viên của khóa đã chọn</p>
        <p class="admin-stat-value">{totalStudents}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Tiến độ trung bình</p>
        <p class="admin-stat-value">{averageProgress}%</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Đã hoàn thành</p>
        <p class="admin-stat-value">{completedStudents}</p>
      </article>
    </div>

    <section class="instructor-search-panel">
      <div>
        <p class="instructor-kicker">Chọn khóa học</p>
        <h2 class="course-edit-section-title">Không gian theo dõi tiến độ</h2>
        <p class="course-edit-section-subtitle">
          Mỗi khóa học sẽ hiển thị danh sách học viên đã đăng ký và mức hoàn
          thành hiện tại.
        </p>
      </div>

      {#if initialLoading}
        <div class="admin-empty-state">Đang tải dữ liệu gradebook...</div>
      {:else if courses.length === 0}
        <div class="admin-empty-state">
          Bạn chưa có khóa học nào để theo dõi gradebook.
        </div>
      {:else}
        <div class="instructor-search-list">
          {#each courses as course}
            <button
              class:selected={selectedCourse?._id === course._id}
              class="instructor-course-button"
              on:click={() => handleCourseChange(course)}
            >
              <strong>{course.name}</strong>
              <span>{course.totalStudentsEnrolled || 0} học viên</span>
            </button>
          {/each}
        </div>

        <div class="instructor-form-field">
          <label for="searchStudents">Tìm học viên</label>
          <input
            id="searchStudents"
            class="instructor-input"
            type="text"
            bind:value={searchQuery}
            placeholder="Tìm theo tên hoặc email"
          />
        </div>

        <div class="instructor-form-field">
          <label for="progressFilter">Lọc theo tiến độ</label>
          <select
            id="progressFilter"
            class="instructor-select"
            bind:value={progressFilter}
            on:change={() => (currentPage = 1)}
          >
            <option value="all">Tất cả</option>
            <option value="not-started">Chưa bắt đầu</option>
            <option value="in-progress">Đang học</option>
            <option value="completed">Đã hoàn thành</option>
          </select>
        </div>

        <div class="instructor-form-field">
          <label for="sortBy">Sắp xếp</label>
          <select
            id="sortBy"
            class="instructor-select"
            bind:value={sortBy}
            on:change={() => (currentPage = 1)}
          >
            <option value="progress-desc">Tiến độ cao đến thấp</option>
            <option value="progress-asc">Tiến độ thấp đến cao</option>
            <option value="name-asc">Tên A-Z</option>
            <option value="name-desc">Tên Z-A</option>
          </select>
        </div>
      {/if}
    </section>

    {#if selectedCourse}
      <section class="instructor-surface-wrap">
        <div class="course-edit-toolbar">
          <div>
            <h2 class="course-edit-section-title">{selectedCourse.name}</h2>
            <p class="course-edit-section-subtitle">
              Danh sách học viên và tiến độ học tập của khóa học đang được chọn.
            </p>
          </div>
        </div>

        {#if loading}
          <div class="admin-empty-state">Đang tải danh sách học viên...</div>
        {:else if sortedStudents.length === 0}
          <div class="admin-empty-state">
            {searchQuery || progressFilter !== "all"
              ? "Không tìm thấy học viên phù hợp với bộ lọc hiện tại."
              : "Chưa có học viên nào đăng ký khóa học này."}
          </div>
        {:else}
          <div class="admin-table-wrap">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Học viên</th>
                  <th>Email</th>
                  <th>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {#each paginatedStudents as student, index}
                  <tr>
                    <td>{(currentPage - 1) * studentsPerPage + index + 1}</td>
                    <td>
                      <div class="instructor-student-cell">
                        {#if student.thumbnail}
                          <img
                            src={student.thumbnail}
                            alt={student.username}
                            class="instructor-student-avatar"
                          />
                        {:else}
                          <div class="instructor-avatar-fallback">
                            {student.username?.slice(0, 1)?.toUpperCase() ||
                              "U"}
                          </div>
                        {/if}
                        <div>
                          <strong>{student.username}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{student.email}</td>
                    <td>
                      <div class="instructor-progress-track">
                        <div
                          class="instructor-progress-bar"
                          style={`width: ${Math.max(0, Math.min(student.progress || 0, 100))}%`}
                        ></div>
                      </div>
                      <small>{student.progress || 0}% hoàn thành</small>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if totalPages > 1}
            <div class="instructor-pagination">
              <button
                class="instructor-page-btn"
                disabled={currentPage === 1}
                on:click={() => goToPage(currentPage - 1)}
              >
                Trước
              </button>
              {#each Array(totalPages) as _, index}
                <button
                  class:active={currentPage === index + 1}
                  class="instructor-page-btn"
                  on:click={() => goToPage(index + 1)}
                >
                  {index + 1}
                </button>
              {/each}
              <button
                class="instructor-page-btn"
                disabled={currentPage === totalPages}
                on:click={() => goToPage(currentPage + 1)}
              >
                Sau
              </button>
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  </section>
{:else}
  <section class="instructor-shell">
    <div class="admin-card">
      <h2>Bạn không có quyền truy cập trang này.</h2>
    </div>
  </section>
{/if}

<style>
  .instructor-course-button.selected {
    border-color: rgba(25, 135, 84, 0.28);
    background: linear-gradient(
      135deg,
      rgba(25, 135, 84, 0.14),
      rgba(255, 255, 255, 0.96)
    );
  }

  .instructor-page-btn.active {
    background: #173f35;
    color: #fff;
    border-color: #173f35;
  }

  .instructor-student-cell {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .instructor-student-avatar {
    width: 2.75rem;
    height: 2.75rem;
    object-fit: cover;
    border-radius: 50%;
    border: 2px solid #dbe7ff;
  }
</style>
