<script>
  import { onMount } from "svelte";
  import {
    fetchCourseBySlug,
    getItem,
    updateCourseProgress,
    getComments,
    addComment,
    updateComment,
    deleteComment,
  } from "$lib/js/api";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { user, fetchUser } from "../../../../stores/auth";

  const slug = $page.params.slug;
  let itemId;
  let course = null;
  let item = null;
  let isLoading = true;
  let userProgress = 0;
  let showCurriculum = true;
  let showDiscussion = false;
  let isMobileView = false;
  let newComment = "";
  let comments = [];
  let completedItems = [];
  let editingCommentId = null;
  let editingCommentContent = "";

  $: completedItems;
  $: itemId = $page.params.lessonId || $page.params.assignmentId; // Lấy itemId từ lessonId hoặc assignmentId
  $: itemType = $page.params.lessonId ? "lesson" : "assignment";
  $: if (itemId) {
    loadItem(itemId);
    loadCurriculum();
  }

  const normalizeItemId = (value) => {
    if (!value) return "";
    if (typeof value === "object") {
      return String(value._id || value.id || "");
    }
    return String(value);
  };

  const getItemFallbackName = (sectionItem, index) => {
    const normalizedType = (sectionItem?.itemType || "lesson").toLowerCase();
    return normalizedType === "assignment"
      ? `Bài tập ${index + 1}`
      : `Bài học ${index + 1}`;
  };

  const getDisplayItemName = (sectionItem, index) => {
    const rawName =
      sectionItem?.name ||
      sectionItem?.itemId?.name ||
      sectionItem?.itemId?.title;

    if (
      typeof rawName === "string" &&
      rawName.trim() &&
      rawName.trim().toLowerCase() !== "undefined"
    ) {
      return rawName.trim();
    }

    return getItemFallbackName(sectionItem, index);
  };

  onMount(() => {
    const syncViewport = () => {
      isMobileView = window.innerWidth < 1024;
      if (!isMobileView) {
        showCurriculum = true;
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  });

  onMount(async () => {
    try {
      isLoading = true;

      course = await fetchCourseBySlug(slug);
      item = await getItem(itemType, itemId); // Lấy item dựa trên itemType
      comments = await getComments(itemType, itemId);

      loadCurriculum();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      isLoading = false;
    }
  });

  const loadCurriculum = async () => {
    try {
      if (!$user) {
        await fetchUser(); // Wait for user data to load
      }
      if (!course) {
        course = await fetchCourseBySlug(slug);
      }
      // Check enrollment status
      if ($user && $user.enrolledCourses) {
        const enrollment = $user.enrolledCourses.find(
          (enrollment) => enrollment.courseId === course._id,
        );
        if (enrollment) {
          userProgress = enrollment.progress;
          completedItems = enrollment.completedItems; // Update completedItems
        }
      }

      // Fetch item names with safe fallback so first render never shows undefined
      for (const section of course.sections) {
        const resolvedItems = await Promise.all(
          section.items.map(async (sectionItem, index) => {
            const normalizedItemId = normalizeItemId(sectionItem.itemId);
            const initialName = getDisplayItemName(sectionItem, index);

            if (initialName !== getItemFallbackName(sectionItem, index)) {
              return {
                ...sectionItem,
                itemId: normalizedItemId,
                name: initialName,
                itemType: (sectionItem.itemType || "lesson").toLowerCase(),
              };
            }

            const fetchedName = await getItemName(
              sectionItem.itemType,
              normalizedItemId,
              initialName,
            );

            return {
              ...sectionItem,
              itemId: normalizedItemId,
              name: fetchedName,
              itemType: (sectionItem.itemType || "lesson").toLowerCase(),
            };
          }),
        );

        section.items = resolvedItems;
      }

      course = course;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Hàm tải bài học/bài tập dựa trên itemId và itemType
  const loadItem = async (itemId) => {
    try {
      isLoading = true;
      item = await getItem(itemType, itemId);
      comments = await getComments(itemType, itemId);
    } catch (error) {
      console.error("Error fetching item data:", error);
    } finally {
      isLoading = false;
    }
  };

  // Hàm lấy tên của bài học hoặc bài tập từ item ID
  const getItemName = async (rawItemType, rawItemId, fallbackName) => {
    try {
      const itemType = (rawItemType || "lesson").toLowerCase();
      const itemId = normalizeItemId(rawItemId);

      if (!itemType || !itemId) {
        return fallbackName;
      }

      const response = await getItem(itemType, itemId);
      const responseName = response?.name || response?.title;

      if (typeof responseName === "string" && responseName.trim()) {
        return responseName.trim();
      }

      return fallbackName;
    } catch (error) {
      console.error("Error fetching item name:", error);
      return fallbackName;
    }
  };

  // Hàm thêm bình luận mới
  const handleAddComment = async () => {
    if (newComment.trim() === "") return;

    try {
      await addComment(itemType, itemId, $user._id, newComment, course._id);
      comments = await getComments(itemType, itemId);
      newComment = "";
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Hàm xử lý khi bắt đầu sửa bình luận
  const handleEditCommentStart = (comment) => {
    editingCommentId = comment._id;
    editingCommentContent = comment.content;
  };

  // Hàm xử lý khi lưu bình luận đã sửa
  const handleSaveComment = async () => {
    try {
      await updateComment(editingCommentId, editingCommentContent);
      // Cập nhật bình luận trong mảng comments
      const commentIndex = comments.findIndex(
        (comment) => comment._id === editingCommentId,
      );
      if (commentIndex !== -1) {
        comments[commentIndex].content = editingCommentContent;
        comments = comments; // Trigger re-render
      }
    } catch (error) {
      console.error("Error updating comment:", error);
    } finally {
      editingCommentId = null;
      editingCommentContent = "";
    }
  };

  // Hàm xóa bình luận
  const handleDeleteComment = async (commentId) => {
    if (confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      try {
        await deleteComment(commentId);
        comments = comments.filter((comment) => comment._id !== commentId);
      } catch (error) {
        console.error("Error deleting comment:", error);
      }
    }
  };

  // Hàm lấy index của section hiện tại
  const getCurrentSectionIndex = () => {
    if (!course || !item) return -1;
    return course.sections.findIndex((section) =>
      section.items.some((item) => item.itemId === itemId),
    );
  };

  // Hàm lấy index của bài học hiện tại trong section
  const getCurrentItemIndex = () => {
    if (!course || !item) return -1;
    const sectionIndex = getCurrentSectionIndex();
    if (sectionIndex === -1) return -1;
    return course.sections[sectionIndex].items.findIndex(
      (item) => item.itemId === itemId,
    );
  };

  // Hàm đánh dấu bài học đã hoàn thành
  const handleMarkCompleted = async () => {
    try {
      await updateCourseProgress(slug, itemId, $user._id); // Sử dụng itemId
      await fetchUser();
      const enrollment = $user.enrolledCourses.find(
        (enrollment) => enrollment.courseId === course._id,
      );
      if (enrollment) {
        completedItems = enrollment.completedItems;
      }
    } catch (error) {
      console.error("Error marking item as completed:", error);
    }
  };

  // Hàm chuyển đến bài học tiếp theo
  const goToNextItem = () => {
    handleMarkCompleted();

    const sectionIndex = getCurrentSectionIndex();
    const lessonIndex = getCurrentItemIndex();

    if (sectionIndex !== -1 && lessonIndex !== -1) {
      // Kiểm tra xem có bài học tiếp theo trong cùng một chương không
      if (lessonIndex < course.sections[sectionIndex].items.length - 1) {
        const nextItem = course.sections[sectionIndex].items[lessonIndex + 1];

        if (nextItem.itemType === "lesson") {
          // Nếu item tiếp theo là bài học
          goto(`/course/${slug}/learn/lesson/${nextItem.itemId}`);
        } else if (nextItem.itemType === "assignment") {
          // Nếu item tiếp theo là bài tập
          goto(`/course/${slug}/learn/assignment/${nextItem.itemId}`);
        }
      } else if (sectionIndex < course.sections.length - 1) {
        // Nếu không có bài học tiếp theo trong chương hiện tại, chuyển sang chương tiếp theo
        const nextSectionIndex = sectionIndex + 1;
        const nextItem = course.sections[nextSectionIndex].items[0];

        if (nextItem.itemType === "lesson") {
          goto(`/course/${slug}/learn/lesson/${nextItem.itemId}`);
        } else if (nextItem.itemType === "assignment") {
          goto(`/course/${slug}/learn/assignment/${nextItem.itemId}`);
        }
      } else {
        // Nếu đã là bài học cuối cùng của khóa học
        alert("Bạn đã hoàn thành khóa học!");
        goto(`/course/${slug}`); // Quay lại trang khóa học
      }
    }
  };

  // Hàm chuyển đến bài học/bài tập trước đó
  const goToPreviousItem = () => {
    const sectionIndex = getCurrentSectionIndex();
    const itemIndex = getCurrentItemIndex();

    if (sectionIndex !== -1 && itemIndex !== -1) {
      // Kiểm tra xem có bài học/bài tập trước đó trong cùng một chương không
      if (itemIndex > 0) {
        const previousItem = course.sections[sectionIndex].items[itemIndex - 1];
        goto(
          `/course/${slug}/learn/${previousItem.itemType}/${previousItem.itemId}`,
        );
      } else if (sectionIndex > 0) {
        // Nếu không có bài học/bài tập trước đó trong chương hiện tại, chuyển sang chương trước đó
        const previousSectionIndex = sectionIndex - 1;
        const previousSection = course.sections[previousSectionIndex];
        const previousItem =
          previousSection.items[previousSection.items.length - 1];
        goto(
          `/course/${slug}/learn/${previousItem.itemType}/${previousItem.itemId}`,
        );
      } else {
        // Nếu đã là bài học/bài tập đầu tiên của khóa học
        alert("Đây đã là bài đầu tiên!");
      }
    }
  };

  // Hàm ẩn/hiện danh sách bài học trong chương
  const toggleSectionVisibility = (sectionIndex) => {
    course.sections[sectionIndex].collapsed =
      !course.sections[sectionIndex].collapsed;
    course = course; // Trigger re-render
  };

  // Hàm kiểm tra đã học chưa để tích hoàn thành trong giao diện
  const checkComplete = (item) => {
    return completedItems.includes(item.itemId);
  };

  const getCommentAvatar = (comment) => {
    return (
      comment?.author?.thumbnail ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        comment?.author?.username || "User",
      )}&background=0056d2&color=fff`
    );
  };
</script>

<div class="learn-shell">
  <header class="learn-topbar">
    <div class="topbar-left">
      <button class="btn-ghost" on:click={() => goto("/")}>Trang chủ</button>
      <button
        class="btn-ghost"
        on:click={() => (showCurriculum = !showCurriculum)}
      >
        Mục lục
      </button>
      <div class="topbar-title">
        <h2>{item?.name || item?.title || "Đang tải nội dung..."}</h2>
        {#if userProgress}
          <span>Tiến độ: {Math.round(userProgress)}%</span>
        {/if}
      </div>
    </div>
    <button
      class="btn-primary"
      on:click={() => (showDiscussion = !showDiscussion)}
    >
      {showDiscussion ? "Đóng thảo luận" : "Thảo luận"}
    </button>
  </header>

  <div class="learn-grid">
    <aside class="curriculum" class:open={showCurriculum}>
      <h3>Mục lục khóa học</h3>
      {#if course?.sections?.length}
        <ul>
          {#each course.sections as section, sectionIndex}
            <li>
              <button
                class="section-title"
                class:collapsed={section.collapsed}
                on:click={() => toggleSectionVisibility(sectionIndex)}
              >
                {section.name}
                {#if section.collapsed}
                  <span class="arrow">▶</span>
                {:else}
                  <span class="arrow">▼</span>
                {/if}
              </button>
              {#if !section.collapsed}
                <ul>
                  {#each section.items as item, index}
                    <li
                      class:active={normalizeItemId(item.itemId) ===
                        normalizeItemId(itemId)}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={completedItems.includes(
                            normalizeItemId(item.itemId),
                          )}
                          disabled
                        />
                        {#if (sectionIndex === 0 && index === 0) || (index === 0 && completedItems.includes(normalizeItemId(course.sections[sectionIndex - 1].items[course.sections[sectionIndex - 1].items.length - 1].itemId))) || (index > 0 && completedItems.includes(normalizeItemId(section.items[index - 1].itemId)))}
                          <a
                            href={`/course/${slug}/learn/${item.itemType}/${normalizeItemId(item.itemId)}`}
                          >
                            {getDisplayItemName(item, index)}
                          </a>
                        {:else}
                          <span class="disabled-link"
                            >{getDisplayItemName(item, index)}</span
                          >
                        {/if}
                      </label>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty-note">Đang tải mục lục...</p>
      {/if}
    </aside>

    <main class="learn-main">
      {#if isLoading}
        <div class="learn-card"><p>Đang tải nội dung bài học...</p></div>
      {:else if item}
        <div class="learn-card item-content">
          <slot {handleMarkCompleted} {goToNextItem} />
        </div>
        <div class="item-navigation">
          <button class="btn-ghost" on:click={goToPreviousItem}
            >Bài trước</button
          >
          <button
            class="btn-primary"
            on:click={goToNextItem}
            class:finish={getCurrentSectionIndex() ===
              course.sections.length - 1 &&
              getCurrentItemIndex() ===
                course.sections[course.sections.length - 1].items.length - 1}
          >
            {#if getCurrentSectionIndex() === course.sections.length - 1 && getCurrentItemIndex() === course.sections[course.sections.length - 1].items.length - 1}
              Hoàn thành khóa học
            {:else}
              Bài tiếp theo
            {/if}
          </button>
        </div>
      {:else}
        <div class="learn-card"><p>Không tìm thấy nội dung.</p></div>
      {/if}
    </main>
  </div>

  <aside class="discussion" class:open={showDiscussion}>
    <div class="discussion-header">
      <h3>Thảo luận</h3>
      <button class="btn-ghost" on:click={() => (showDiscussion = false)}>
        Đóng
      </button>
    </div>
    {#if comments.length === 0}
      <p class="empty-note">Bài học này chưa có bình luận.</p>
    {:else}
      <ul>
        {#each comments as comment}
          <li>
            {#if editingCommentId === comment._id}
              <textarea bind:value={editingCommentContent} />
              <button class="btn-primary" on:click={handleSaveComment}
                >Lưu</button
              >
            {:else}
              <div class="comment-item">
                <img
                  src={getCommentAvatar(comment)}
                  alt="avatar"
                  class="comment-avatar"
                />
                <p>
                  <strong>{comment.author.username}</strong>: {comment.content}
                </p>
              </div>
              {#if comment.author._id === $user._id}
                <div class="comment-actions">
                  <button on:click={() => handleEditCommentStart(comment)}>
                    Sửa
                  </button>
                  <button on:click={() => handleDeleteComment(comment._id)}>
                    Xóa
                  </button>
                </div>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if $user}
      <div class="add-comment">
        <textarea bind:value={newComment} placeholder="Nhập bình luận..." />
        <button class="btn-primary" on:click={handleAddComment}
          >Đăng bình luận</button
        >
      </div>
    {:else}
      <p class="empty-note">Vui lòng đăng nhập để bình luận.</p>
    {/if}
  </aside>

  {#if isMobileView && (showCurriculum || showDiscussion)}
    <button
      class="overlay"
      aria-label="Đóng panel"
      on:click={() => {
        showCurriculum = false;
        showDiscussion = false;
      }}
    ></button>
  {/if}
</div>

<style scoped>
  .learn-shell {
    position: relative;
    min-height: calc(100vh - 84px);
    color: var(--learn-text);
    background: linear-gradient(180deg, #f7f9fd 0%, #f0f4fb 100%);
  }

  .learn-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    margin-bottom: 1rem;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .topbar-title {
    min-width: 0;
    margin-left: 0.5rem;
  }

  .topbar-title h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--learn-text);
  }

  .topbar-title span {
    font-size: 0.85rem;
    color: var(--learn-text-muted);
  }

  .learn-grid {
    display: grid;
    grid-template-columns: minmax(270px, 320px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .curriculum {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 115px);
    overflow-y: auto;
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    padding: 1rem;
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
  }

  .curriculum h3 {
    margin: 0 0 0.85rem;
    font-size: 1rem;
    font-weight: 700;
  }

  .curriculum ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .curriculum li {
    margin-bottom: 0.3rem;
  }

  .section-title {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-radius: var(--learn-radius-sm);
    color: var(--learn-text);
    background: var(--learn-surface-soft);
    font-size: 0.95rem;
    font-weight: 700;
  }

  .section-title:hover {
    background: #edf3ff;
  }

  .arrow {
    font-size: 0.85rem;
    color: var(--learn-text-muted);
  }

  .curriculum label {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.45rem 0.7rem;
    border-radius: var(--learn-radius-sm);
    transition: background-color 0.2s ease;
  }

  .curriculum label:hover {
    background: #f4f7ff;
  }

  .curriculum a,
  .disabled-link {
    color: var(--learn-text);
    font-size: 0.92rem;
    line-height: 1.35;
  }

  .disabled-link {
    color: #9ba8bd;
    cursor: not-allowed;
  }

  .curriculum .active label {
    background: #e7f0ff;
    border: 1px solid #c6d9ff;
  }

  .learn-main {
    min-width: 0;
  }

  .learn-card {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    padding: 1rem;
  }

  .item-content {
    margin-bottom: 0.85rem;
  }

  .item-navigation {
    position: sticky;
    bottom: 0;
    z-index: 3;
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.75rem;
  }

  .btn-ghost,
  .btn-primary,
  .comment-actions button {
    height: 38px;
    border-radius: 999px;
    padding: 0 0.95rem;
    font-size: 0.9rem;
    font-weight: 600;
    border: 1px solid transparent;
  }

  .btn-ghost,
  .comment-actions button {
    color: var(--learn-text);
    border-color: var(--learn-border);
    background: var(--learn-surface);
  }

  .btn-ghost:hover,
  .comment-actions button:hover {
    background: #eef3ff;
  }

  .btn-primary {
    color: #fff;
    background: var(--learn-primary);
  }

  .btn-primary:hover {
    background: var(--learn-primary-hover);
  }

  .discussion {
    position: fixed;
    top: 72px;
    right: 0;
    height: calc(100vh - 72px);
    width: min(410px, 92vw);
    background: var(--learn-surface);
    border-left: 1px solid var(--learn-border);
    box-shadow: var(--learn-shadow-md);
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    opacity: 0;
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
    z-index: 20;
    padding: 1rem;
    overflow: hidden;
  }

  .discussion.open {
    transform: translateX(0);
    opacity: 1;
  }

  .discussion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
  }

  .discussion h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .discussion ul {
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;
  }

  .discussion li {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-sm);
    background: var(--learn-surface-soft);
    padding: 0.6rem;
    margin-bottom: 0.55rem;
  }

  .comment-item {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
  }

  .comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--learn-border);
    flex-shrink: 0;
  }

  .discussion li p {
    margin: 0;
    line-height: 1.4;
  }

  .comment-actions {
    margin-top: 0.45rem;
    display: flex;
    gap: 0.4rem;
  }

  .discussion textarea,
  .add-comment textarea {
    width: 100%;
    border: 1px solid var(--learn-border);
    border-radius: 12px;
    padding: 0.7rem;
    resize: vertical;
    min-height: 88px;
    margin-bottom: 0.45rem;
    color: var(--learn-text);
  }

  .add-comment {
    margin-top: 0.5rem;
  }

  .finish {
    background-color: var(--learn-success);
  }

  .empty-note {
    color: var(--learn-text-muted);
    font-size: 0.92rem;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 30, 53, 0.48);
    z-index: 15;
  }

  @media (max-width: 1023px) {
    .learn-grid {
      grid-template-columns: 1fr;
    }

    .curriculum {
      position: fixed;
      left: 0;
      top: 72px;
      height: calc(100vh - 72px);
      width: min(360px, 90vw);
      max-height: calc(100vh - 72px);
      border-radius: 0;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      z-index: 20;
    }

    .curriculum.open {
      transform: translateX(0);
    }
  }

  @media (max-width: 720px) {
    .learn-topbar {
      flex-wrap: wrap;
    }

    .topbar-left {
      width: 100%;
      flex-wrap: wrap;
    }

    .topbar-title {
      width: 100%;
      margin-left: 0;
    }

    .item-navigation {
      justify-content: space-between;
    }
  }
</style>
