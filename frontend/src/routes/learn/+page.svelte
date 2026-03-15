<script>
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { fade, slide } from "svelte/transition";
  import {
    getEnrolledCourses,
    getFavoriteCourses,
    addCourseToFavorites,
    removeCourseFromFavorites,
  } from "$lib/js/api";
  import { getTime } from "$lib/js/function";
  import { user, fetchUser } from "../../stores/auth";
  import { Progress } from "@sveltestrap/sveltestrap";

  const DASHBOARD_FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80";

  let enrolledCourses = [];
  let favoriteCourses = [];
  let continueLearningCourse = null;
  let isLoading = true;
  let completedCourses = 0;
  let uncompletedCourses = 0;
  const FAVORITES_BATCH_SIZE = 3;
  let favoriteVisibleCount = FAVORITES_BATCH_SIZE;
  let favoriteOrder = [];
  let openFavoriteSubjects = {};
  let draggedFavoriteId = "";
  let dragOverFavoriteId = "";

  let attendanceState = {
    lastCheckIn: "",
    streak: 0,
    history: [],
  };
  let attendanceMessage = "";

  const toDateKey = (dateInput = new Date()) => {
    const date = new Date(dateInput);
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    );
    return localDate.toISOString().slice(0, 10);
  };

  const dayLabel = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    return date.toLocaleDateString("vi-VN", { weekday: "short" });
  };

  const attendanceStorageKey = () =>
    $user?._id
      ? `learnloom:attendance:${$user._id}`
      : "learnloom:attendance:guest";

  const favoriteOrderStorageKey = () =>
    $user?._id
      ? `learnloom:favorites-order:${$user._id}`
      : "learnloom:favorites-order:guest";

  const saveAttendance = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      attendanceStorageKey(),
      JSON.stringify(attendanceState),
    );
  };

  const loadAttendance = () => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(attendanceStorageKey());
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      attendanceState = {
        lastCheckIn: parsed?.lastCheckIn || "",
        streak: Number(parsed?.streak) || 0,
        history: Array.isArray(parsed?.history) ? parsed.history : [],
      };
    } catch (error) {
      console.error("Attendance parse error:", error);
    }
  };

  const saveFavoriteOrder = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      favoriteOrderStorageKey(),
      JSON.stringify(favoriteOrder),
    );
  };

  const loadFavoriteOrder = () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(favoriteOrderStorageKey());
    if (!raw) {
      favoriteOrder = [];
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      favoriteOrder = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Favorite order parse error:", error);
      favoriteOrder = [];
    }
  };

  const isCheckedInToday = () => attendanceState.lastCheckIn === toDateKey();

  const checkInToday = () => {
    const today = toDateKey();
    if (attendanceState.lastCheckIn === today) {
      attendanceMessage = "Bạn đã điểm danh hôm nay rồi.";
      return;
    }

    const yesterday = toDateKey(Date.now() - 24 * 60 * 60 * 1000);

    attendanceState.streak =
      attendanceState.lastCheckIn === yesterday
        ? attendanceState.streak + 1
        : 1;
    attendanceState.lastCheckIn = today;
    attendanceState.history = [
      today,
      ...attendanceState.history.filter((d) => d !== today),
    ].slice(0, 30);

    saveAttendance();
    attendanceMessage = `Điểm danh thành công. Chuỗi học hiện tại: ${attendanceState.streak} ngày.`;
  };

  const getWeekAttendance = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const target = new Date(today);
      target.setDate(today.getDate() - (6 - idx));
      const key = toDateKey(target);
      return {
        key,
        label: dayLabel(key),
        checked: attendanceState.history.includes(key),
        isToday: key === toDateKey(today),
      };
    });
  };

  $: weekAttendance = getWeekAttendance();

  const getCourseImage = (course) =>
    course?.image_url || DASHBOARD_FALLBACK_IMAGE;

  const sortByRecentAccess = (courses = []) =>
    [...courses].sort(
      (a, b) => new Date(b.lastAccessed || 0) - new Date(a.lastAccessed || 0),
    );

  const formatProgress = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return Math.round(num);
  };

  const computeCourseStats = () => {
    completedCourses = enrolledCourses.filter(
      (course) => formatProgress(course.progress) >= 100,
    ).length;
    uncompletedCourses = enrolledCourses.length - completedCourses;
  };

  const pickContinueLearningCourse = () => {
    continueLearningCourse = sortByRecentAccess(enrolledCourses).find(
      (course) => formatProgress(course.progress) < 100,
    );

    if (!continueLearningCourse && enrolledCourses.length > 0) {
      continueLearningCourse = sortByRecentAccess(enrolledCourses)[0];
    }
  };

  const syncFavoriteStore = () => {
    if (!$user) return;
    $user.favoriteCourses = favoriteCourses.map((course) => course._id);
  };

  const fetchDashboardData = async () => {
    if (!$user) return;

    const [enrolledData, favoriteData] = await Promise.all([
      getEnrolledCourses($user._id),
      getFavoriteCourses($user._id),
    ]);

    enrolledCourses = Array.isArray(enrolledData) ? enrolledData : [];
    favoriteCourses = Array.isArray(favoriteData) ? favoriteData : [];

    loadFavoriteOrder();

    computeCourseStats();
    pickContinueLearningCourse();
    syncFavoriteStore();
  };

  const isFavoriteCourse = (courseId) =>
    favoriteCourses.some((course) => course._id === courseId);

  const toggleFavoriteCourse = async (course) => {
    if (!$user || !course?._id) return;

    const courseId = course._id;

    try {
      if (isFavoriteCourse(courseId)) {
        await removeCourseFromFavorites(courseId, $user._id);
        favoriteCourses = favoriteCourses.filter(
          (item) => item._id !== courseId,
        );
        favoriteOrder = favoriteOrder.filter((id) => id !== courseId);
      } else {
        await addCourseToFavorites(courseId, $user._id);
        const existed = favoriteCourses.find((item) => item._id === courseId);
        if (!existed) {
          favoriteCourses = [course, ...favoriteCourses];
          favoriteOrder = [
            courseId,
            ...favoriteOrder.filter((id) => id !== courseId),
          ];
        }
      }

      syncFavoriteStore();
      saveFavoriteOrder();
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    }
  };

  const removeFavoriteWithConfirm = async (course) => {
    if (!$user || !course?._id) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn bỏ yêu thích khóa học "${course.name}"?`,
    );

    if (!confirmed) return;

    try {
      await removeCourseFromFavorites(course._id, $user._id);
      favoriteCourses = favoriteCourses.filter(
        (item) => item._id !== course._id,
      );
      favoriteOrder = favoriteOrder.filter((id) => id !== course._id);
      syncFavoriteStore();
      saveFavoriteOrder();
    } catch (error) {
      console.error("Remove favorite failed:", error);
    }
  };

  const moveFavoriteBefore = (dragId, targetId) => {
    if (!dragId || !targetId || dragId === targetId) return;

    const current = [...favoriteOrder];
    const dragIndex = current.indexOf(dragId);
    const targetIndex = current.indexOf(targetId);

    if (dragIndex < 0 || targetIndex < 0) return;

    current.splice(dragIndex, 1);
    const insertAt = current.indexOf(targetId);
    current.splice(insertAt, 0, dragId);
    favoriteOrder = current;
    saveFavoriteOrder();
  };

  const handleDragStart = (courseId, event) => {
    draggedFavoriteId = courseId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", courseId);
  };

  const handleDragEnter = (targetId) => {
    dragOverFavoriteId = targetId;
  };

  const handleDragLeave = (targetId) => {
    if (dragOverFavoriteId === targetId) {
      dragOverFavoriteId = "";
    }
  };

  const handleDropOnFavorite = (targetId, event) => {
    event.preventDefault();
    const dragId =
      draggedFavoriteId || event.dataTransfer.getData("text/plain");
    moveFavoriteBefore(dragId, targetId);
    draggedFavoriteId = "";
    dragOverFavoriteId = "";
  };

  const handleDragEnd = () => {
    draggedFavoriteId = "";
    dragOverFavoriteId = "";
  };

  const toggleFavoriteSubject = (subjectName) => {
    openFavoriteSubjects = {
      ...openFavoriteSubjects,
      [subjectName]: !openFavoriteSubjects[subjectName],
    };
  };

  const groupFavoritesBySubject = (courses = []) => {
    const grouped = [];
    const lookup = new Map();

    courses.forEach((course) => {
      const key = course.subject || "Khác";

      if (!lookup.has(key)) {
        const group = {
          subject: key,
          items: [],
        };

        lookup.set(key, group);
        grouped.push(group);
      }

      lookup.get(key).items.push(course);
    });

    return grouped;
  };

  const showMoreFavorites = () => {
    favoriteVisibleCount = Math.min(
      favoriteVisibleCount + FAVORITES_BATCH_SIZE,
      favoriteCourses.length,
    );
  };

  const collapseFavorites = () => {
    favoriteVisibleCount = FAVORITES_BATCH_SIZE;
  };

  $: sortedFavoriteCourses = [...favoriteCourses].sort((a, b) => {
    const aIndex = favoriteOrder.indexOf(a._id);
    const bIndex = favoriteOrder.indexOf(b._id);

    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  $: {
    const currentIds = new Set(favoriteCourses.map((course) => course._id));
    const normalizedStored = favoriteOrder.filter((id) => currentIds.has(id));
    const missingIds = favoriteCourses
      .map((course) => course._id)
      .filter((id) => !normalizedStored.includes(id));

    const nextOrder = [...normalizedStored, ...missingIds];

    if (JSON.stringify(nextOrder) !== JSON.stringify(favoriteOrder)) {
      favoriteOrder = nextOrder;
      saveFavoriteOrder();
    }
  }

  $: {
    const maxCount = sortedFavoriteCourses.length || FAVORITES_BATCH_SIZE;
    if (favoriteVisibleCount > maxCount) {
      favoriteVisibleCount = maxCount;
    }
  }

  $: visibleFavoriteCourses = sortedFavoriteCourses.slice(
    0,
    favoriteVisibleCount,
  );
  $: favoriteGroups = groupFavoritesBySubject(visibleFavoriteCourses);
  $: hasMoreFavorites = sortedFavoriteCourses.length > favoriteVisibleCount;
  $: canCollapseFavorites = favoriteVisibleCount > FAVORITES_BATCH_SIZE;

  $: {
    const updatedState = { ...openFavoriteSubjects };
    for (const group of favoriteGroups) {
      if (updatedState[group.subject] === undefined) {
        updatedState[group.subject] = true;
      }
    }
    openFavoriteSubjects = updatedState;
  }

  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }

      if ($user) {
        loadAttendance();
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Error fetching learn dashboard:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <p>Đang tải dữ liệu...</p>
{:else if $user}
  <div class="learn-dashboard">
    <aside class="dashboard-sidebar">
      <section class="profile-card">
        <img src={$user.thumbnail} alt="Avatar" class="avatar" />
        <h2>{$user.username}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span>{enrolledCourses.length}</span>
            <small>Tổng khóa học</small>
          </div>
          <div class="stat-item">
            <span>{completedCourses}</span>
            <small>Đã hoàn thành</small>
          </div>
          <div class="stat-item">
            <span>{uncompletedCourses}</span>
            <small>Đang học</small>
          </div>
        </div>
      </section>

      <section class="attendance-card">
        <div class="attendance-header">
          <h3>Điểm danh học tập</h3>
          <p>Chuỗi hiện tại: <strong>{attendanceState.streak} ngày</strong></p>
        </div>

        <button
          type="button"
          class="checkin-btn"
          on:click={checkInToday}
          disabled={isCheckedInToday()}
        >
          {isCheckedInToday() ? "Đã điểm danh hôm nay" : "Điểm danh hôm nay"}
        </button>

        {#if attendanceMessage}
          <p class="attendance-note">{attendanceMessage}</p>
        {/if}

        <div class="week-strip">
          {#each weekAttendance as day}
            <div
              class="day-chip"
              class:checked={day.checked}
              class:today={day.isToday}
            >
              <span>{day.label}</span>
              <strong>{day.checked ? "✓" : "-"}</strong>
            </div>
          {/each}
        </div>
      </section>
    </aside>

    <div class="dashboard-content">
      {#if continueLearningCourse}
        <section class="continue-learning">
          <div class="section-head">
            <h2>Tiếp tục học</h2>
            <a href={`/course/${continueLearningCourse.slug}`}>Mở khóa học</a>
          </div>

          <div class="continue-card">
            <div class="progress-wrap">
              <Progress
                animated
                color="primary"
                max={100}
                striped
                value={formatProgress(continueLearningCourse.progress)}
              >
                {formatProgress(continueLearningCourse.progress)}%
              </Progress>
            </div>

            <div class="continue-body">
              <div class="continue-info">
                <h3>{continueLearningCourse.name}</h3>
                <p>
                  Lần học cuối:
                  {continueLearningCourse.lastAccessed
                    ? getTime(continueLearningCourse.lastAccessed)
                    : "Chưa có dữ liệu"}
                </p>
              </div>
              <img
                src={getCourseImage(continueLearningCourse)}
                alt={continueLearningCourse.name}
              />
            </div>

            <div class="continue-actions">
              <a href={`/course/${continueLearningCourse.slug}`}>Xem nội dung</a
              >
              <a href={`/course/${continueLearningCourse.slug}#reviews`}
                >Đánh giá</a
              >
              <a class="primary" href={`/course/${continueLearningCourse.slug}`}
                >Tiếp tục học</a
              >
            </div>
          </div>
        </section>
      {/if}

      <section class="enrolled-section">
        <div class="section-head">
          <h2>Các khóa học đã đăng ký</h2>
        </div>

        <div class="enrolled-grid">
          {#each enrolledCourses as course}
            <article class="course-card">
              <a href={`/course/${course.slug}`} class="cover-link">
                <img
                  src={getCourseImage(course)}
                  alt={course.name}
                  class="cover"
                />
              </a>

              <div class="course-card-body">
                <h3>
                  <a href={`/course/${course.slug}`}>{course.name}</a>
                </h3>
                <p>
                  Tiến độ: {formatProgress(course.progress)}% •
                  {course.lastAccessed
                    ? getTime(course.lastAccessed)
                    : "Chưa học"}
                </p>
                <div class="card-actions">
                  <a href={`/course/${course.slug}`}>Vào học</a>
                  <button
                    type="button"
                    class="fav-toggle"
                    class:is-favorite={isFavoriteCourse(course._id)}
                    on:click={() => toggleFavoriteCourse(course)}
                  >
                    <i
                      class={`bi ${isFavoriteCourse(course._id) ? "bi-heart-fill" : "bi-heart"}`}
                    ></i>
                    {isFavoriteCourse(course._id)
                      ? "Đã yêu thích"
                      : "Yêu thích"}
                  </button>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="favorites-section">
        <div class="section-head">
          <h2>Khóa học yêu thích</h2>
          <span class="favorites-count"
            >{sortedFavoriteCourses.length} khóa học</span
          >
        </div>

        {#if sortedFavoriteCourses.length === 0}
          <p class="empty-note">
            Bạn chưa có khóa học yêu thích. Hãy bấm Yêu thích ở danh sách trên.
          </p>
        {:else}
          <div class="favorites-accordion">
            {#each favoriteGroups as group (group.subject)}
              <section class="favorite-group">
                <button
                  type="button"
                  class="favorite-group-toggle"
                  class:is-open={openFavoriteSubjects[group.subject]}
                  on:click={() => toggleFavoriteSubject(group.subject)}
                >
                  <span>{group.subject}</span>
                  <span>{group.items.length} khóa học</span>
                  <i class="bi bi-chevron-down chevron"></i>
                </button>

                {#if openFavoriteSubjects[group.subject]}
                  <ul
                    class="favorites-list"
                    transition:slide|local={{ duration: 220 }}
                  >
                    {#each group.items as course (course._id)}
                      <li
                        class="favorite-row"
                        class:is-dragging={draggedFavoriteId === course._id}
                        class:is-drag-over={dragOverFavoriteId === course._id}
                        draggable="true"
                        on:dragstart={(event) =>
                          handleDragStart(course._id, event)}
                        on:dragend={handleDragEnd}
                        on:dragenter={() => handleDragEnter(course._id)}
                        on:dragleave={() => handleDragLeave(course._id)}
                        on:dragover|preventDefault
                        on:drop={(event) =>
                          handleDropOnFavorite(course._id, event)}
                        animate:flip={{ duration: 220, easing: (t) => t }}
                        in:fade|local={{ duration: 140 }}
                        out:fade|local={{ duration: 120 }}
                      >
                        <a
                          href={`/course/${course.slug}`}
                          class="favorite-item"
                        >
                          <img src={getCourseImage(course)} alt={course.name} />
                          <span>{course.name}</span>
                        </a>
                        <div class="favorite-row-actions">
                          <span class="drag-hint"
                            ><i class="bi bi-grip-vertical"></i> Kéo để ưu tiên</span
                          >
                          <button
                            type="button"
                            class="remove-favorite-btn"
                            on:click={() => removeFavoriteWithConfirm(course)}
                          >
                            <i class="bi bi-heartbreak"></i>
                            Bỏ yêu thích
                          </button>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </section>
            {/each}
          </div>

          {#if hasMoreFavorites || canCollapseFavorites}
            <div class="favorites-actions">
              {#if hasMoreFavorites}
                <button
                  type="button"
                  class="favorites-action-btn"
                  on:click={showMoreFavorites}
                >
                  Xem thêm
                </button>
              {/if}
              {#if canCollapseFavorites}
                <button
                  type="button"
                  class="favorites-action-btn secondary"
                  on:click={collapseFavorites}
                >
                  Thu gọn
                </button>
              {/if}
            </div>
          {/if}
        {/if}
      </section>
    </div>
  </div>
{:else}
  <p>Bạn cần đăng nhập để xem trang này.</p>
{/if}

<style>
  .learn-dashboard {
    margin-top: 0.9rem;
    display: grid;
    grid-template-columns: minmax(250px, 290px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .dashboard-sidebar {
    display: grid;
    gap: 0.85rem;
    position: sticky;
    top: 82px;
  }

  .profile-card,
  .attendance-card,
  .continue-learning,
  .enrolled-section,
  .favorites-section {
    background: #fff;
    border: 1px solid #dce6f8;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(15, 40, 90, 0.08);
  }

  .profile-card {
    padding: 1rem;
    text-align: center;
  }

  .avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e7eefc;
    margin-bottom: 0.5rem;
  }

  .profile-card h2 {
    margin: 0;
    font-size: 1.45rem;
    color: #112f63;
    font-weight: 800;
  }

  .stats-grid {
    margin-top: 0.8rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .stat-item {
    background: #f7faff;
    border: 1px solid #e0e9f8;
    border-radius: 10px;
    padding: 0.45rem;
  }

  .stat-item span {
    display: block;
    font-size: 1.15rem;
    font-weight: 800;
    color: #15386f;
  }

  .stat-item small {
    color: #63769b;
    font-size: 0.82rem;
  }

  .attendance-card {
    padding: 0.9rem;
  }

  .attendance-header h3 {
    margin: 0;
    font-size: 1.04rem;
    color: #17366d;
    font-weight: 800;
  }

  .attendance-header p {
    margin: 0.25rem 0 0.6rem;
    font-size: 0.88rem;
    color: #4f668f;
  }

  .checkin-btn {
    width: 100%;
    border: 1px solid #3b7cff;
    background: #1f63d8;
    color: #fff;
    border-radius: 10px;
    padding: 0.5rem 0.62rem;
    font-weight: 700;
    cursor: pointer;
  }

  .checkin-btn:disabled {
    background: #7ea6ea;
    border-color: #9ebcf0;
    cursor: default;
  }

  .attendance-note {
    margin: 0.52rem 0 0;
    font-size: 0.82rem;
    color: #365893;
  }

  .week-strip {
    margin-top: 0.7rem;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.3rem;
  }

  .day-chip {
    border: 1px solid #d9e4f8;
    border-radius: 9px;
    text-align: center;
    padding: 0.24rem 0.12rem;
    background: #f8fbff;
  }

  .day-chip span {
    display: block;
    font-size: 0.7rem;
    color: #5c6f92;
  }

  .day-chip strong {
    font-size: 0.84rem;
    color: #8ca0c2;
  }

  .day-chip.checked {
    background: #e8f3ff;
    border-color: #7fadf2;
  }

  .day-chip.checked strong {
    color: #1b62d8;
  }

  .day-chip.today {
    outline: 2px solid rgba(32, 100, 219, 0.2);
  }

  .dashboard-content {
    display: grid;
    gap: 0.9rem;
  }

  .continue-learning,
  .enrolled-section,
  .favorites-section {
    padding: 0.9rem;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.72rem;
  }

  .section-head h2 {
    margin: 0;
    font-size: 1.22rem;
    color: #133166;
    font-weight: 800;
  }

  .section-head a {
    text-decoration: none;
    color: #2457b8;
    font-size: 0.86rem;
    font-weight: 700;
  }

  .favorites-count {
    font-size: 0.84rem;
    color: #5f7397;
    font-weight: 700;
  }

  .continue-card {
    border: 1px solid #dce7f8;
    border-radius: 14px;
    overflow: hidden;
    background: #fbfdff;
  }

  .progress-wrap {
    padding: 0.42rem 0.55rem 0;
  }

  .continue-body {
    padding: 0.72rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 41%);
    gap: 0.7rem;
    align-items: center;
  }

  .continue-info h3 {
    margin: 0;
    font-size: 1.52rem;
    color: #163567;
  }

  .continue-info p {
    margin: 0.4rem 0 0;
    color: #5f7296;
  }

  .continue-body img {
    width: 100%;
    height: 160px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid #d7e4fb;
  }

  .continue-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid #e2e9f7;
  }

  .continue-actions a {
    text-align: center;
    text-decoration: none;
    color: #2f4977;
    font-weight: 700;
    padding: 0.62rem;
    border-right: 1px solid #e2e9f7;
    background: #fff;
  }

  .continue-actions a:last-child {
    border-right: none;
  }

  .continue-actions a.primary {
    background: #1f63d8;
    color: #fff;
  }

  .enrolled-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .course-card {
    border: 1px solid #dce6f8;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
  }

  .cover {
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
  }

  .cover-link {
    display: block;
  }

  .course-card-body {
    padding: 0.72rem;
  }

  .course-card-body h3 {
    margin: 0;
    font-size: 1rem;
    color: #163567;
    font-weight: 700;
  }

  .course-card-body h3 a {
    color: inherit;
    text-decoration: none;
  }

  .course-card-body p {
    margin: 0.35rem 0 0.62rem;
    font-size: 0.86rem;
    color: #617399;
  }

  .card-actions {
    display: flex;
    gap: 0.45rem;
    align-items: center;
  }

  .card-actions a,
  .fav-toggle {
    border: 1px solid #cddaf2;
    border-radius: 8px;
    padding: 0.34rem 0.58rem;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
    color: #204379;
    background: #fff;
  }

  .fav-toggle {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .fav-toggle.is-favorite {
    border-color: #f0c3d2;
    color: #b03f5f;
    background: #fff5f9;
  }

  .favorites-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.6rem;
  }

  .favorites-accordion {
    display: grid;
    gap: 0.6rem;
  }

  .favorite-group {
    border: 1px solid #dce6f8;
    border-radius: 12px;
    overflow: hidden;
    background: #fbfdff;
  }

  .favorite-group-toggle {
    width: 100%;
    border: none;
    background: #f6f9ff;
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.6rem;
    align-items: center;
    padding: 0.58rem 0.72rem;
    font-weight: 700;
    color: #1d3f73;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.18s ease;
  }

  .favorite-group-toggle:hover {
    background: #eef5ff;
  }

  .favorite-group-toggle .chevron {
    justify-self: end;
    transition: transform 0.2s ease;
  }

  .favorite-group-toggle.is-open .chevron {
    transform: rotate(180deg);
  }

  .favorite-row {
    min-width: 0;
    padding: 0.52rem;
    border-top: 1px solid #e5ecfa;
    display: grid;
    gap: 0.45rem;
    transition:
      background-color 0.18s ease,
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .favorite-row.is-dragging {
    opacity: 0.7;
    transform: scale(0.99);
  }

  .favorite-row.is-drag-over {
    background: #eef5ff;
    box-shadow: inset 0 0 0 1px #9cbcf0;
  }

  .favorite-item {
    border: 1px solid #dce6f8;
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: #1e3f74;
    background: #fff;
    font-weight: 700;
    font-size: 0.84rem;
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
  }

  .favorite-row-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .drag-hint {
    color: #5d7197;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
  }

  .remove-favorite-btn {
    border: 1px solid #f0c5cf;
    background: #fff6f8;
    color: #a43f5a;
    border-radius: 8px;
    padding: 0.32rem 0.56rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .favorite-item img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
  }

  .favorite-item span {
    display: block;
    padding: 0.65rem;
    line-height: 1.35;
    font-size: 1rem;
  }

  .favorites-actions {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
  }

  .favorites-action-btn {
    border: 1px solid #c6d7f5;
    background: #1f63d8;
    color: #fff;
    border-radius: 8px;
    padding: 0.38rem 0.72rem;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
  }

  .favorites-action-btn.secondary {
    background: #fff;
    color: #204379;
  }

  .empty-note {
    margin: 0;
    color: #607396;
    font-weight: 600;
  }

  @media (max-width: 1080px) {
    .learn-dashboard {
      grid-template-columns: 1fr;
    }

    .dashboard-sidebar {
      position: static;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .enrolled-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .dashboard-sidebar {
      grid-template-columns: 1fr;
    }

    .continue-body {
      grid-template-columns: 1fr;
    }

    .continue-body img {
      height: 180px;
    }

    .continue-actions {
      grid-template-columns: 1fr;
    }

    .continue-actions a {
      border-right: none;
      border-top: 1px solid #e2e9f7;
    }

    .continue-actions a:first-child {
      border-top: none;
    }

    .favorite-item {
      grid-template-columns: 120px minmax(0, 1fr);
    }

    .favorite-item img {
      height: 80px;
    }

    .favorite-item span {
      font-size: 0.9rem;
    }

    .favorite-row-actions {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
