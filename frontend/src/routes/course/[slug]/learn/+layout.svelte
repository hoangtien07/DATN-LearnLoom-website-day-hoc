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
  let showCurriculum = false;
  let showDiscussion = false;
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
          (enrollment) => enrollment.courseId === course._id
        );
        if (enrollment) {
          userProgress = enrollment.progress;
          completedItems = enrollment.completedItems; // Update completedItems
        }
      }

      // Fetch item names
      for (const section of course.sections) {
        for (const item of section.items) {
          item.name = await getItemName(item);
        }
      }
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
  const getItemName = async (item) => {
    try {
      const response = await getItem(item.itemType, item.itemId);
      return response.name;
    } catch (error) {
      console.error("Error fetching item name:", error);
      return "Unknown Item";
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
        (comment) => comment._id === editingCommentId
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
      section.items.some((item) => item.itemId === itemId)
    );
  };

  // Hàm lấy index của bài học hiện tại trong section
  const getCurrentItemIndex = () => {
    if (!course || !item) return -1;
    const sectionIndex = getCurrentSectionIndex();
    if (sectionIndex === -1) return -1;
    return course.sections[sectionIndex].items.findIndex(
      (item) => item.itemId === itemId
    );
  };

  // Hàm đánh dấu bài học đã hoàn thành
  const handleMarkCompleted = async () => {
    try {
      await updateCourseProgress(slug, itemId, $user._id); // Sử dụng itemId
      await fetchUser();
      const enrollment = $user.enrolledCourses.find(
        (enrollment) => enrollment.courseId === course._id
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
          `/course/${slug}/learn/${previousItem.itemType}/${previousItem.itemId}`
        );
      } else if (sectionIndex > 0) {
        // Nếu không có bài học/bài tập trước đó trong chương hiện tại, chuyển sang chương trước đó
        const previousSectionIndex = sectionIndex - 1;
        const previousSection = course.sections[previousSectionIndex];
        const previousItem =
          previousSection.items[previousSection.items.length - 1];
        goto(
          `/course/${slug}/learn/${previousItem.itemType}/${previousItem.itemId}`
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
</script>

<header>
  <button on:click={() => goto("/")}>Trang chủ</button>
  <button on:click={() => (showCurriculum = !showCurriculum)}> Mục lục </button>
  <h2>{item ? item.name : "Loading..."}</h2>
  <button on:click={() => (showDiscussion = !showDiscussion)}>
    Thảo luận
  </button>
</header>

<div class="body">
  {#if showCurriculum}
    <div class="curriculum">
      <h3>Mục lục</h3>
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
                  <li class:active={item.itemId === itemId}>
                    <label>
                      <input
                        type="checkbox"
                        checked={completedItems.includes(item.itemId)}
                        disabled
                      />
                      {#if (sectionIndex === 0 && index === 0) || (index === 0 && completedItems.includes(course.sections[sectionIndex - 1].items[course.sections[sectionIndex - 1].items.length - 1].itemId)) || (index > 0 && completedItems.includes(section.items[index - 1].itemId))}
                        <a
                          href={`/course/${slug}/learn/${item.itemType}/${item.itemId}`}
                        >
                          {item.name}
                          {checkComplete(item)}
                        </a>
                      {:else}
                        <span class="disabled-link">{item.name}</span>
                      {/if}
                    </label>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <main>
    {#if isLoading}
      <p>Loading item...</p>
    {:else if item}
      <div class="item-content">
        <slot {handleMarkCompleted} {goToNextItem} />
      </div>
      <div class="item-navigation">
        <button on:click={goToPreviousItem}>Bài trước</button>
        <button
          on:click={goToNextItem}
          class:finish={getCurrentSectionIndex() ===
            course.sections.length - 1 &&
            getCurrentItemIndex() ===
              course.sections[course.sections.length - 1].items.length - 1}
        >
          {#if getCurrentSectionIndex() === course.sections.length - 1 && getCurrentItemIndex() === course.sections[course.sections.length - 1].items.length - 1}
            Hoàn thành
          {:else}
            Bài tiếp theo
          {/if}
        </button>
      </div>
    {:else}
      <p>Item not found.</p>
    {/if}
  </main>

  {#if showDiscussion}
    <div class="discussion">
      <h3>Thảo luận</h3>
      {#if comments.length === 0}
        <p>Bài học này chưa có bình luận.</p>
      {:else}
        <ul>
          {#each comments as comment}
            <li>
              {#if editingCommentId === comment._id}
                <textarea bind:value={editingCommentContent} />
                <button on:click={handleSaveComment}>Lưu</button>
              {:else}
                <strong>{comment.author.username}</strong>: {comment.content}
                {#if comment.author._id === $user._id}
                  <button on:click={() => handleEditCommentStart(comment)}>
                    Sửa
                  </button>
                  <button on:click={() => handleDeleteComment(comment._id)}>
                    Xóa
                  </button>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if $user}
        <div class="add-comment">
          <textarea bind:value={newComment} placeholder="Nhập bình luận..." />
          <button on:click={handleAddComment}>Đăng</button>
        </div>
      {:else}
        <p>Vui lòng đăng nhập để bình luận.</p>
      {/if}
    </div>
  {/if}
</div>

<style scoped>
  :global(main) {
    max-width: none;
    width: 100%;
    margin: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #f0f0f0;
  }

  .body {
    display: flex;
  }

  .curriculum,
  .discussion {
    width: 350px;
    background-color: #fff;
    border-right: 1px solid #ccc;
    padding: 1rem;
    overflow-y: auto;
  }

  .curriculum ul,
  .discussion ul {
    list-style: none;
    padding: 0;
  }

  .curriculum li,
  .discussion li {
    margin-bottom: 0.5rem;
  }

  .section-title {
    cursor: pointer;
    font-weight: bold;
  }

  .section-title.collapsed .arrow {
    transform: rotate(90deg);
  }

  .arrow {
    display: inline-block;
    margin-left: 0.5rem;
    transition: transform 0.2s ease;
  }

  .active {
    font-weight: bold;
  }

  main {
    flex: 1;
    padding: 1rem;
  }

  .item-content {
    margin-bottom: 1rem;
  }

  .item-navigation {
    display: flex;
    justify-content: flex-end;
  }

  .add-comment textarea {
    width: 100%;
    height: 80px;
    resize: vertical;
    margin-bottom: 0.5rem;
  }
  .finish {
    background-color: green;
  }
  .disabled-link {
    color: #ccc;
    cursor: not-allowed;
  }
</style>
