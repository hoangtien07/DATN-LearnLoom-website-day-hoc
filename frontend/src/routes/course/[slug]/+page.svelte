<script>
  import { browser } from "$app/environment";
  import {
    fetchCourses,
    fetchCourseBySlug,
    getItem,
    enrollCourse,
    getReviews,
    createOrder,
    createVnpayPaymentUrl,
    addCourseToFavorites,
    removeCourseFromFavorites,
  } from "$lib/js/api";
  import { Button } from "@sveltestrap/sveltestrap";
  import { getYoutubeVideoId } from "$lib/js/function";
  import { user, fetchUser } from "../../../stores/auth";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Reviews from "./Reviews.svelte";

  let course = {};
  let reviews = [];
  let slug = "";
  let lastLoadedSlug = "";
  let loadRequestId = 0;
  let isLoading = true;
  let isEnrolled = false;
  let userProgress = 0;
  let completedItems = [];
  let isFavorite = false;
  let personalizedCourses = [];
  let featuredCourses = [];
  let allCoursesCache = [];

  const normalizeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatPrice = (price) => {
    const amount = normalizeNumber(price, 0);
    if (amount <= 0) return "Miễn phí";
    return `${amount.toLocaleString("vi-VN")} VND`;
  };

  const getImageUrl = (item) =>
    item?.image_url ||
    "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80";

  const calcFeatureScore = (item) => {
    const rating = normalizeNumber(item.avgRating, 0);
    const studentCount = normalizeNumber(item.totalStudentsEnrolled, 0);
    const recentWeight = new Date(item.updatedAt || 0).getTime() / 100000000000;

    return rating * 3 + Math.log10(studentCount + 1) * 2 + recentWeight;
  };

  const buildSuggestedCourses = (allCourses) => {
    if (!Array.isArray(allCourses) || !course?._id) {
      personalizedCourses = [];
      featuredCourses = [];
      return;
    }

    const normalized = allCourses.filter(
      (item) =>
        item &&
        item._id !== course._id &&
        item.slug &&
        item.visible !== false &&
        item.is_deleted !== true,
    );

    const enrolledIds = new Set(
      Array.isArray($user?.enrolledCourses)
        ? $user.enrolledCourses.map((item) => item.courseId)
        : [],
    );
    const favoriteIds = new Set(
      Array.isArray($user?.favoriteCourses) ? $user.favoriteCourses : [],
    );

    const preferenceSources = allCourses.filter(
      (item) => enrolledIds.has(item._id) || favoriteIds.has(item._id),
    );

    const subjectPreference = new Map();
    const levelPreference = new Map();

    preferenceSources.forEach((item) => {
      if (item.subject) {
        subjectPreference.set(
          item.subject,
          (subjectPreference.get(item.subject) || 0) + 1,
        );
      }
      if (item.level) {
        levelPreference.set(
          item.level,
          (levelPreference.get(item.level) || 0) + 1,
        );
      }
    });

    const personalizedRanked = [...normalized]
      .map((item) => {
        const sameSubject = item.subject === course.subject ? 1.8 : 0;
        const sameLevel = item.level === course.level ? 1.2 : 0;
        const subjectBoost = (subjectPreference.get(item.subject) || 0) * 2.2;
        const levelBoost = (levelPreference.get(item.level) || 0) * 1.5;
        const personalizationBonus = subjectBoost + levelBoost;

        return {
          ...item,
          _personalizedScore:
            calcFeatureScore(item) +
            sameSubject +
            sameLevel +
            personalizationBonus,
        };
      })
      .sort((a, b) => b._personalizedScore - a._personalizedScore);

    personalizedCourses = personalizedRanked.slice(0, 4);

    const selectedPersonalizedIds = new Set(
      personalizedCourses.map((item) => item._id),
    );

    featuredCourses = [...normalized]
      .filter((item) => !selectedPersonalizedIds.has(item._id))
      .map((item) => ({ ...item, _featureScore: calcFeatureScore(item) }))
      .sort((a, b) => b._featureScore - a._featureScore)
      .slice(0, 4);
  };

  // Hàm lấy danh sách đánh giá
  const fetchReviews = async (courseId = course?._id) => {
    if (!courseId) {
      reviews = [];
      return;
    }

    try {
      reviews = await getReviews(courseId);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      reviews = [];
    }
  };

  // Backend trả về populated data ở `item.itemData` (giữ `item.itemId` là string
  // để FE routing/xóa/toggle không bị break). Chỉ fallback gọi getItem nếu thiếu.
  const hydrateSectionItemNames = async (sections = []) => {
    await Promise.all(
      sections.map(async (section) => {
        if (!Array.isArray(section.items)) return;
        await Promise.all(
          section.items.map(async (item) => {
            const populated = item.itemData;
            if (populated && typeof populated === "object" && populated.name) {
              item.name = populated.name;
              item.isPreview = !!populated.isPreview;
              item.isLocked = !!populated.isLocked;
              return;
            }
            item.name = await getItemName(item);
            item.isLocked = true; // Thiếu populated data → coi như locked (BR-01 gate).
          }),
        );
      }),
    );
  };

  const updateEnrollmentState = () => {
    isEnrolled = false;
    userProgress = 0;
    completedItems = [];

    if (!$user || !Array.isArray($user.enrolledCourses)) return;

    const enrollment = $user.enrolledCourses.find(
      (entry) => entry.courseId === course._id,
    );

    if (!enrollment) return;

    isEnrolled = true;
    userProgress = enrollment.progress || 0;
    completedItems = Array.isArray(enrollment.completedItems)
      ? enrollment.completedItems
      : [];
  };

  const loadCoursePage = async (targetSlug) => {
    const requestId = ++loadRequestId;
    isLoading = true;

    try {
      const loadedCourse = await fetchCourseBySlug(targetSlug);

      if (!$user) {
        await fetchUser();
      }

      const coursePool =
        allCoursesCache.length > 0 ? allCoursesCache : await fetchCourses();
      allCoursesCache = coursePool;

      if (requestId !== loadRequestId) return;

      course = loadedCourse;
      updateEnrollmentState();
      isFavorite = Array.isArray($user?.favoriteCourses)
        ? $user.favoriteCourses.includes(course._id)
        : false;
      buildSuggestedCourses(coursePool);

      await Promise.all([
        fetchReviews(course._id),
        hydrateSectionItemNames(course.sections || []),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      course = {};
      reviews = [];
      personalizedCourses = [];
      featuredCourses = [];
    } finally {
      if (requestId === loadRequestId) {
        isLoading = false;
      }
    }
  };

  const handleNavigateCourse = async (targetSlug) => {
    if (!targetSlug || targetSlug === slug) return;
    await goto(`/course/${targetSlug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fallback name theo loại khi BE không trả populated data (hiếm).
  const fallbackName = (itemType) =>
    itemType === "assignment" ? "Bài kiểm tra" : "Bài học";

  // Lấy tên qua getItem — chỉ dùng khi populated data thiếu (VD course cũ data dirty).
  // Với guest / chưa enrolled → API trả 401/403 → dùng fallback tên chung.
  const getItemName = async (item) => {
    try {
      const response = await getItem(item.itemType, item.itemId);
      return response?.name || fallbackName(item.itemType);
    } catch (error) {
      // 401/403 là hành vi đúng của BR-01 — không phải bug. Im lặng fallback.
      return fallbackName(item.itemType);
    }
  };

  // Function to handle enrollment
  const handleEnroll = async () => {
    // Ensure user is logged in
    if (!$user) {
      goto("/login?redirectTo=/course/" + slug);
      return;
    }
    try {
      if (course.price > 0) {
        const redirectUrl = `${window.location.origin}/course/${slug}`;
        const orderResponse = await createOrder({
          courseId: course._id,
          redirectUrl,
        });

        if (orderResponse.success && orderResponse.orderId) {
          const paymentResponse = await createVnpayPaymentUrl(
            orderResponse.orderId,
          );
          if (paymentResponse.success && paymentResponse.paymentUrl) {
            window.location = paymentResponse.paymentUrl;
            return;
          }

          console.error("VNPay URL creation failed:", paymentResponse.message);
          alert("Không thể khởi tạo thanh toán. Vui lòng thử lại.");
        } else {
          console.error("Order creation failed:", orderResponse.message);
          alert("Không thể tạo đơn thanh toán. Vui lòng thử lại.");
        }
      } else {
        await enrollCourse(slug, $user._id);
        isEnrolled = true;
        // Refresh user data after enrollment
        await fetchUser();
        alert("Bạn đã đăng ký khóa học thành công!");
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Đã xảy ra lỗi khi đăng ký khóa học.");
    }
  };

  $: slug = $page.params.slug;
  $: overviewVideoId = getYoutubeVideoId(course?.overviewVideo);

  $: if (browser && slug && slug !== lastLoadedSlug) {
    lastLoadedSlug = slug;
    loadCoursePage(slug);
  }

  // Function to get the next uncompleted item
  const getNextUncompletedItem = () => {
    // Tìm kiếm bài học chưa hoàn thành
    for (const section of course.sections) {
      for (const item of section.items) {
        if (!completedItems.includes(item.itemId)) {
          return item;
        }
      }
    }

    // Nếu tất cả bài học đã hoàn thành, trả về bài học cuối cùng của khóa học
    if (completedItems.length > 0) {
      const lastSection = course.sections[course.sections.length - 1];
      const lastItem = lastSection.items[lastSection.items.length - 1];
      return lastItem;
    }

    // Nếu không có bài học nào (khóa học trống), trả về null
    return null;
  };

  // Handle "Continue Learning" button click
  const handleContinueLearning = () => {
    const nextItem = getNextUncompletedItem();
    if (!nextItem) return;
    const url = `/course/${course.slug}/learn/${nextItem.itemType}/${nextItem.itemId}`;
    goto(url);
  };

  // Hàm thêm khóa học vào mục yêu thích
  const handleToggleFavorite = async () => {
    try {
      if (!$user) {
        goto("/login?redirectTo=/course/" + slug);
        return;
      }

      if (!Array.isArray($user.favoriteCourses)) {
        $user.favoriteCourses = [];
      }

      if ($user.favoriteCourses.includes(course._id)) {
        // Xóa khỏi danh sách yêu thích
        await removeCourseFromFavorites(course._id, $user._id);
        $user.favoriteCourses = $user.favoriteCourses.filter(
          (id) => id !== course._id,
        );
        isFavorite = false;
      } else {
        // Thêm vào danh sách yêu thích
        await addCourseToFavorites(course._id, $user._id);
        $user.favoriteCourses.push(course._id);
        isFavorite = true;
      }
    } catch (error) {
      console.error("Lỗi khi thay đổi trạng thái yêu thích:", error);
      // Xử lý lỗi hiển thị cho người dùng
    }
  };
</script>

{#if isLoading}
  <p>Loading course...</p>
{:else if course && course.sections && Array.isArray(course.sections)}
  <div class="course-container mt-1">
    <header class="course-header">
      <div class="course-info">
        <p class="course-kicker">Khóa học trực tuyến</p>
        <h1>{course.name}</h1>
        <p class="teacher">Giảng viên: {course.teacher.username}</p>
        <p class="summary">{course.summary}</p>
        <div class="course-meta-chip-list">
          <span class="meta-chip"
            ><i class="bi bi-bar-chart"></i> {course.level}</span
          >
          <span class="meta-chip"
            ><i class="bi bi-journal-bookmark"></i> {course.subject}</span
          >
          <span class="meta-chip"
            ><i class="bi bi-cash-coin"></i> {formatPrice(course.price)}</span
          >
        </div>
      </div>
      <div class="course-media-panel">
        <div class="video-wrap">
          {#if overviewVideoId}
            <iframe
              src={`https://www.youtube.com/embed/${overviewVideoId}`}
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          {:else}
            <div class="video-placeholder">
              <img src={course.image_url} alt={course.name} />
            </div>
          {/if}
        </div>

        <div class="course-actions">
          {#if !$user}
            <Button
              on:click={() => goto("/login?redirectTo=/course/" + slug)}
              color="primary">Đăng ký khóa học</Button
            >
          {:else if !isEnrolled}
            <Button color="success" disabled>{formatPrice(course.price)}</Button
            >
            <Button on:click={handleEnroll} outline color="primary"
              >Đăng ký khóa học</Button
            >
          {:else}
            <Button on:click={handleContinueLearning} color="primary"
              >Tiếp tục học</Button
            >
          {/if}

          <button
            class="favorite-btn"
            class:is-active={isFavorite}
            on:click={handleToggleFavorite}
            aria-label="Lưu khóa học yêu thích"
          >
            <i class={`bi ${isFavorite ? "bi-heart-fill" : "bi-heart"}`}></i>
            {isFavorite ? "Đã lưu yêu thích" : "Lưu vào yêu thích"}
          </button>
        </div>
      </div>
    </header>

    <div class="course-content">
      <div class="course-main-content">
        <h2>Nội dung khóa học</h2>
        {@html course.description}
      </div>
      <div class="curriculum-sidebar">
        <h3>Mục lục</h3>
        {#if isEnrolled}
          <p>Tiến trình: {userProgress}%</p>
        {/if}
        {#each course.sections as section, sectionIndex}
          <div class="section" data-index={sectionIndex}>
            <p>{section.name}</p>
            <ul>
              {#each section.items as item}
                {@const canOpen =
                  isEnrolled || item.isPreview || !item.isLocked}
                <li
                  class:completed={completedItems.includes(item.itemId)}
                  class:locked={!canOpen}
                >
                  {#if canOpen}
                    <a
                      href="/course/{course.slug}/learn/{item.itemType}/{item.itemId}"
                      class="item"
                    >
                      <i
                        class="bi {item.itemType === 'lesson'
                          ? 'bi-play-circle'
                          : 'bi-patch-question'}"
                      ></i>
                      {item.name || "Nội dung"}
                      {#if item.isPreview && !isEnrolled}
                        <span class="preview-badge">Preview</span>
                      {/if}
                    </a>
                  {:else}
                    <span class="item locked-item" title="Đăng ký khóa học để mở">
                      <i class="bi bi-lock"></i>
                      {item.name || "Nội dung"}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
    <Reviews
      {course}
      {isEnrolled}
      {userProgress}
      user={$user}
      {reviews}
      on:reviewSubmitted={fetchReviews}
    />

    {#if personalizedCourses.length > 0}
      <section class="course-recommendations">
        <div class="section-heading">
          <div>
            <h2>Dành cho bạn</h2>
            <p>Đề xuất theo lịch sử học, yêu thích và chủ đề bạn quan tâm.</p>
          </div>
          <a href="/course">Xem toàn bộ</a>
        </div>
        <div class="recommendation-grid">
          {#each personalizedCourses as item}
            <a
              href={`/course/${item.slug}`}
              class="recommend-card"
              on:click|preventDefault={() => handleNavigateCourse(item.slug)}
            >
              <img src={getImageUrl(item)} alt={item.name} />
              <div class="recommend-content">
                <h3>{item.name}</h3>
                <p>{item.summary || "Khóa học được đề xuất cho bạn."}</p>
                <div class="recommend-meta">
                  <span
                    ><i class="bi bi-star-fill"></i>
                    {normalizeNumber(item.avgRating).toFixed(1)}</span
                  >
                  <span
                    ><i class="bi bi-people"></i>
                    {normalizeNumber(item.totalStudentsEnrolled)}</span
                  >
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if featuredCourses.length > 0}
      <section class="course-recommendations featured">
        <div class="section-heading">
          <div>
            <h2>Khóa học nổi bật</h2>
            <p>
              Những khóa học có đánh giá tốt và được nhiều học viên quan tâm.
            </p>
          </div>
        </div>
        <div class="recommendation-grid">
          {#each featuredCourses as item}
            <a
              href={`/course/${item.slug}`}
              class="recommend-card"
              on:click|preventDefault={() => handleNavigateCourse(item.slug)}
            >
              <img src={getImageUrl(item)} alt={item.name} />
              <div class="recommend-content">
                <h3>{item.name}</h3>
                <p>
                  {item.summary || "Khóa học nổi bật trong thời gian gần đây."}
                </p>
                <div class="recommend-meta">
                  <span
                    ><i class="bi bi-star-fill"></i>
                    {normalizeNumber(item.avgRating).toFixed(1)}</span
                  >
                  <span>{formatPrice(item.price)}</span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </div>
{:else}
  <p>Loading course...</p>
{/if}

<style>
  /* Add relevant CSS styling here */
  .course-container {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .course-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    text-align: left;
    background: radial-gradient(
        120% 180% at 0% 0%,
        rgba(255, 255, 255, 0.08) 0%,
        rgba(255, 255, 255, 0) 40%
      ),
      linear-gradient(135deg, #1f4ea5 0%, #0f2f65 100%);
    color: #fff;
    border-radius: 18px;
    padding: 1.2rem;
  }

  .course-info {
    flex: 1;
    min-width: 0;
    padding-right: 0.6rem;
  }

  .course-kicker {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    opacity: 0.85;
    font-weight: 700;
  }

  .course-info h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.15;
  }

  .teacher {
    margin: 0.45rem 0 0;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .summary {
    margin: 0.7rem 0;
    color: rgba(255, 255, 255, 0.94);
    max-width: 70ch;
  }

  .course-meta-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.33rem 0.6rem;
    background: rgba(255, 255, 255, 0.17);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .course-media-panel {
    width: 400px;
    max-width: 100%;
    background: rgba(4, 21, 57, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 16px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  .video-wrap {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
  }

  .video-wrap iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .video-placeholder {
    position: absolute;
    inset: 0;
  }
  .video-placeholder img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .course-actions {
    display: grid;
    gap: 0.5rem;
  }

  .course-actions :global(.btn) {
    width: 100%;
    border-radius: 10px;
    font-weight: 700;
    padding: 0.54rem 0.7rem;
  }

  .course-actions :global(.btn-success:disabled) {
    opacity: 1;
    background: rgba(37, 182, 120, 0.88);
    border-color: rgba(124, 240, 189, 0.35);
    color: #ecfff6;
  }

  .course-actions :global(.btn-outline-primary) {
    border-color: rgba(162, 198, 255, 0.65);
    color: #e6f0ff;
    background: rgba(255, 255, 255, 0.04);
  }

  .course-actions :global(.btn-outline-primary:hover) {
    background: rgba(22, 89, 208, 0.3);
    border-color: rgba(177, 210, 255, 0.9);
    color: #fff;
  }

  .favorite-btn {
    border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-radius: 10px;
    padding: 0.54rem 0.62rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  .favorite-btn.is-active {
    background: rgba(255, 94, 139, 0.23);
    border-color: rgba(255, 160, 188, 0.6);
  }

  .favorite-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .course-content {
    margin-top: 0.3rem;
    display: flex;
    gap: 1rem;
  }

  .course-main-content {
    flex: 1;
    margin-right: 0;
    min-width: 0;
    background: #fff;
    border: 1px solid #dce7f7;
    border-radius: 14px;
    padding: 1rem;
    box-shadow: 0 8px 22px rgba(15, 40, 90, 0.06);
  }

  .course-main-content h2 {
    margin: 0 0 0.8rem;
    font-size: 1.3rem;
    color: #122f63;
    font-weight: 700;
  }

  .curriculum-sidebar {
    flex-basis: 360px;
    max-width: 390px;
    height: fit-content;
    border: 1px solid #dbe5f5;
    padding: 0.9rem;
    border-radius: 14px;
    background: #fff;
    position: sticky;
    top: 82px;
    box-shadow: 0 8px 24px rgba(15, 40, 90, 0.08);
  }

  .curriculum-sidebar h3 {
    margin: 0;
    font-size: 1.6rem;
    color: #18376e;
    font-weight: 800;
  }

  .curriculum-sidebar p {
    margin-bottom: 2px;
  }

  .curriculum-sidebar ul {
    margin: 0;
    padding-left: 1rem;
  }

  .curriculum-sidebar li {
    margin-bottom: 0.32rem;
  }

  .section {
    border-top: 1px solid #e4ecf8;
    padding-top: 0.6rem;
    margin-top: 0.6rem;
  }

  .section > p {
    margin: 0 0 0.4rem;
    color: #163467;
    font-weight: 700;
  }

  .completed {
    text-decoration: line-through;
    color: #1f7a3f;
  }

  .course-recommendations {
    margin-top: 0.8rem;
    border: 1px solid #dce7f7;
    border-radius: 16px;
    background: #fff;
    padding: 1rem;
    box-shadow: 0 8px 22px rgba(15, 40, 90, 0.06);
  }

  .course-recommendations.featured {
    background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }

  .section-heading h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #123065;
    font-weight: 800;
  }

  .course-recommendations h2 {
    line-height: 1.2;
  }

  .section-heading p {
    margin: 0.2rem 0 0;
    color: #607296;
    font-size: 0.92rem;
  }

  .section-heading a {
    color: #1c52b5;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .recommendation-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .recommend-card {
    border: 1px solid #d9e5f9;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .recommend-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 40, 90, 0.12);
    border-color: #c3d7f8;
  }

  .recommend-card img {
    width: 100%;
    height: 136px;
    object-fit: cover;
  }

  .recommend-content {
    padding: 0.72rem;
  }

  .recommend-content h3 {
    margin: 0;
    font-size: 1rem;
    color: #163566;
    font-weight: 700;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .recommend-content p {
    margin: 0.4rem 0;
    font-size: 0.86rem;
    color: #5c6f93;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.6em;
  }

  .recommend-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: #1f3f73;
    font-size: 0.83rem;
    font-weight: 700;
  }

  .recommend-meta i {
    color: #f4b101;
  }

  @media (max-width: 1160px) {
    .course-header {
      flex-direction: column;
      align-items: stretch;
    }

    .course-media-panel {
      width: 100%;
    }

    .course-content {
      flex-direction: column;
    }

    .curriculum-sidebar {
      position: static;
      max-width: none;
      width: 100%;
    }

    .recommendation-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .course-header,
    .course-main-content,
    .course-recommendations {
      padding: 0.75rem;
    }

    .course-info h1 {
      font-size: 1.34rem;
    }

    .summary {
      max-width: none;
    }

    .recommendation-grid {
      grid-template-columns: 1fr;
    }

    .section-heading {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
