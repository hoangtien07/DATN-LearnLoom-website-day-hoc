<script>
  import { onMount } from "svelte";
  import {
    fetchCourseBySlug,
    getItem,
    enrollCourse,
    getReviews,
    createOrder,
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
  const slug = $page.params.slug;
  let isLoading = true;
  let isEnrolled = false;
  let userProgress = 0;
  let completedItems = [];
  let isFavorite = false;

  // Hàm lấy danh sách đánh giá
  const fetchReviews = async () => {
    try {
      reviews = await getReviews(course._id); // Update the parent's reviews array
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  // Lấy tên của bài học hoặc bài tập từ item ID
  const getItemName = async (item) => {
    try {
      const response = await getItem(item.itemType, item.itemId);
      return response.name;
    } catch (error) {
      console.error("Error fetching item name:", error);
      return "Unknown Item";
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
        console.log(course.teacher._id);
        const response = await createOrder({
          courseId: course._id,
          userId: $user._id,
          teacherId: course.teacher._id,
          price: course.price,
          redirectUrl: `http://localhost:5173/course/${slug}`,
          courseName: course.name,
        });
        if (response.success) {
          window.location = `http://localhost:8888/order/create_payment_url?courseId=${course._id}&userId=${$user._id}&teacherId=${course.teacher._id}&price=${course.price}&redirectUrl=${encodeURIComponent(`http://localhost:5173/course/${slug}`)}&courseName=${encodeURIComponent(course.name)}&slug=${encodeURIComponent(slug)}`;
        } else {
          console.error("Order creation failed:", response.message);
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

  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);

      if (!$user) {
        await fetchUser(); // Wait for user data to load
      }
      // Check enrollment status
      if ($user && $user.enrolledCourses) {
        const enrollment = $user.enrolledCourses.find(
          (enrollment) => enrollment.courseId === course._id
        );
        if (enrollment) {
          isEnrolled = true;
          userProgress = enrollment.progress;
          completedItems = enrollment.completedItems;
        }
      }

      // Check if the course is in the user's favorites
      if ($user && $user.favoriteCourses) {
        isFavorite = $user.favoriteCourses.includes(course._id);
      }

      // Fetch initial reviews
      await fetchReviews();

      // Fetch item names
      for (const section of course.sections) {
        for (const item of section.items) {
          item.name = await getItemName(item);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      isLoading = false;
    }
  });

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
    console.log(nextItem);
    const url = `/course/${course.slug}/learn/${nextItem.itemType}/${nextItem.itemId}`;
    goto(url);
  };

  // Hàm thêm khóa học vào mục yêu thích
  const handleToggleFavorite = async () => {
    try {
      if ($user.favoriteCourses.includes(course._id)) {
        // Xóa khỏi danh sách yêu thích
        await removeCourseFromFavorites(course._id, $user._id);
        $user.favoriteCourses = $user.favoriteCourses.filter(
          (id) => id !== course._id
        );
      } else {
        // Thêm vào danh sách yêu thích
        await addCourseToFavorites(course._id, $user._id);
        $user.favoriteCourses.push(course._id);
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
        <h1 style="text-align: left;">{course.name}</h1>
        <p class="teacher">Giảng viên: {course.teacher.username}</p>
        <p class="summary">{course.summary}</p>
        <p class="level">Cấp độ: {course.level}</p>
        <p class="subject">Môn học: {course.subject}</p>
        <!-- Thêm thông tin khác của khóa học tại đây -->
      </div>
      <div class="course-image d-flex flex-column p-2" style="flex:1">
        <iframe
          max-width="100%"
          height="auto"
          src="https://www.youtube.com/embed/{getYoutubeVideoId(
            course.overviewVideo
          )}"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <div class="mt-2"></div>
        {#if !$user}
          <Button
            on:click={() => goto("/login?redirectTo=/course/" + slug)}
            outline
            color="primary">Đăng ký khóa học</Button
          >
        {:else if !isEnrolled}
          {#if course.price > 0}
            <Button color="success" disabled>
              Giá: {course.price} VND</Button
            >
          {:else}
            <Button color="success" disabled>Miễn phí</Button>
          {/if}
          <Button on:click={handleEnroll} outline color="primary"
            >Đăng ký khóa học</Button
          >
        {:else}
          <Button on:click={handleContinueLearning} outline color="primary"
            >Tiếp tục học</Button
          >
          <!-- <button on:click={handleContinueLearning}>Tiếp tục học</button> -->
        {/if}
      </div>
    </header>

    <div class="course-content">
      <div class="course-main-content">
        <!--  nội dung chính của khóa học tại đây -->
        <b style="font-size: 18px;">Nội dung khóa học</b>
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
              {#each section.items as item, itemIndex}
                {#if completedItems.includes(item.itemId)}
                  <li>
                    {#if item.itemType === "lesson"}
                      <a
                        href="/course/{course.slug}/learn/lesson/{item.itemId}"
                        class="item"
                      >
                        {#await getItemName(item)}
                          Loading...
                        {:then itemName}
                          {itemName} ({item.itemType})
                        {/await}
                      </a>
                    {:else}
                      <a
                        href="/course/{course.slug}/learn/assignment/{item.itemId}"
                        class="item"
                      >
                        {#await getItemName(item)}
                          Loading...
                        {:then itemName}
                          {itemName} ({item.itemType})
                        {/await}
                      </a>
                    {/if}
                  </li>
                {:else}
                  <li class:completed={completedItems.includes(item.itemId)}>
                    <p>
                      {#await getItemName(item)}
                        Loading...
                      {:then itemName}
                        {itemName} ({item.itemType})
                      {/await}
                    </p>
                  </li>
                {/if}
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
    <Reviews
      {course}
      {isEnrolled}
      user={$user}
      {reviews}
      on:reviewSubmitted={fetchReviews}
    />
  </div>
{:else}
  <p>Loading course...</p>
{/if}

<style>
  /* Add relevant CSS styling here */
  .course-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .course-header {
    display: flex;
    align-items: center;
    gap: 20px;
    text-align: left;
  }

  .course-image {
    width: 400px;
    height: fit-content;
    background-color: #fff;
    color: #000;
    border-radius: 8px;
    top: 0;
  }

  .course-info {
    width: 60%;
    text-align-last: left;
    padding-right: 40px;
  }

  .course-content {
    margin-top: 40px;
    display: flex;
    gap: 20px;
  }
  .course-main-content {
    flex: 1;
    margin-right: 60px;
  }

  .curriculum-sidebar {
    flex-basis: 35%;
    height: fit-content;
    border: 1px solid #ccc;
    padding: 20px;
    position: relative;
    border-radius: 12px;
  }
  .curriculum-sidebar p {
    margin-bottom: 2px;
  }

  .completed {
    text-decoration: line-through;
    color: green;
  }
  .course-header {
    background-color: #1d1d1d;
    color: #fff;
    border-radius: 20px;
    padding: 20px;
  }
</style>
