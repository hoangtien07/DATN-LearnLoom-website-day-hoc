<script>
  import { onMount } from "svelte";
  import { getEnrolledCourses, getFavoriteCourses } from "$lib/js/api";
  import { getTime } from "$lib/js/function";
  import { user, fetchUser } from "../../stores/auth";
  import CourseList from "$lib/components/CourseList.svelte";
  import { Progress, Image, Button } from "@sveltestrap/sveltestrap";

  let enrolledCourses = [];
  let continueLearningCourse = null;
  // let favoriteCourses = [];
  // let recommendedCourses = [];
  let isLoading = true;
  let completedCourses = 0;
  let uncompletedCourses = 0;

  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }

      if ($user) {
        enrolledCourses = await getEnrolledCourses($user._id);
        // favoriteCourses = await getFavoriteCourses($user._id);
        // recommendedCourses = await getRecommendedCourses($user._id);
        console.log(enrolledCourses);

        // Tìm khóa học có lastAccessed gần nhất
        continueLearningCourse = enrolledCourses.reduce((latest, course) => {
          if (
            !latest ||
            (new Date(course.lastAccessed) > new Date(latest.lastAccessed) &&
              course.progress < 100)
          ) {
            return course;
          }
          return latest;
        }, null);

        // Tính số khóa học hoàn thành và chưa hoàn thành
        completedCourses = enrolledCourses.filter(
          (course) => course.progress === 100
        ).length;
        uncompletedCourses = enrolledCourses.length - completedCourses;
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <p>Đang tải dữ liệu...</p>
{:else if $user}
  <div class="d-flex mt-3">
    <div class="info">
      <img src={$user.thumbnail} alt="Avatar" class="avatar mb-3" />
      <h3>{$user.username}</h3>
      <div class="course-stats mt-2">
        <p>Tổng số khóa học: {enrolledCourses.length}</p>
        <p>Hoàn thành: {completedCourses}</p>
        <p>Chưa hoàn thành: {uncompletedCourses}</p>
      </div>
    </div>
    <div class="learn-page">
      {#if continueLearningCourse}
        <section class="continue-learning mb-5">
          <h2>Tiếp tục học</h2>

          <div class="card shadow-sm my-3" style="height: fit-content;">
            <div class="progress-bar-container">
              <Progress
                animated
                bar={false}
                barClassName=""
                color="primary"
                max={100}
                multi={false}
                striped={false}
                value={continueLearningCourse.progress}
                >{continueLearningCourse.progress}%</Progress
              >
            </div>
            <div class="d-flex align-items-center p-3">
              <div class="course-info">
                <h5 class="mb-1">{continueLearningCourse.name}</h5>
                <p class="text-muted mt-2">
                  Lần học cuối: {getTime(continueLearningCourse.lastAccessed)}
                </p>
              </div>
              <div class="image-placeholder" style="width:50%;margin-left:80px">
                <!-- Thay thế hình ảnh placeholder bằng hình ảnh thực tế nếu có -->
                <Image
                  src={continueLearningCourse.image_url}
                  alt="Course Image"
                  thumbnail
                />
              </div>
            </div>
            <div class="d-flex border-top">
              <Button
                color="light"
                href="/course/{continueLearningCourse.slug}"
                class="flex-fill">Xem nội dung khóa học</Button
              >
              <Button
                color="light"
                href="/course/{continueLearningCourse.slug}"
                class="flex-fill">Đánh giá</Button
              >
              <Button color="primary" class="flex-fill">Tiếp tục học</Button>
            </div>
          </div>
        </section>
      {/if}

      <h2>Các khóa học đã đăng ký</h2>
      <CourseList courses={enrolledCourses} />

      <!-- <h2>Khóa học yêu thích</h2> -->
      <!-- <CourseList courses={favoriteCourses} /> -->

      <!-- <h2>Khóa học gợi ý</h2> -->
      <!-- <CourseList courses={recommendedCourses} /> -->
    </div>
  </div>
{:else}
  <p>Bạn cần đăng nhập để xem trang này.</p>
{/if}

<style>
  .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 40%;
    background-color: #dedccd;
    border-radius: 12px;
    padding: 20px;
    margin-right: 20px;
    height: fit-content;
  }
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .avatar {
    border-radius: 50%;
    border: 4px solid #eee;
  }
</style>
