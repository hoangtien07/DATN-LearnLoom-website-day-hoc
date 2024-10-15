<script>
  import {
    Card,
    CardImg,
    CardBody,
    CardTitle,
    CardText,
  } from "@sveltestrap/sveltestrap";
  import { getTime } from "$lib/js/function.js";
  import StarRating from "svelte-star-rating";
  export let course; // Nhận dữ liệu khóa học từ component cha
  export let isEdit = false;
  // Config cho rating star
  const config = {
    fullColor: "#ffa500",
  };
  let linkCourse = "";
  if (isEdit) linkCourse = `/course/${course.slug}/edit-course/curriculum`;
  else linkCourse = `/course/${course.slug}`;
  // Ensure avgRating is a number and within range (e.g., 0-5)
  let validRating =
    typeof course.avgRating === "number" &&
    course.avgRating >= 0 &&
    course.avgRating <= 5
      ? course.avgRating
      : 0; // Default to 0 if invalid
</script>

<a href={linkCourse}>
  <Card>
    <CardImg src={course.image_url} alt={course.name} />
    <CardBody>
      <CardTitle>{course.name}</CardTitle>
      <CardText>{course.summary}</CardText>
      <div class="mt-2"></div>
      <div class="d-flex">
        <StarRating {config} rating={validRating} />
        <span class="ms-2">({Number(course.avgRating).toFixed(1)})</span>
      </div>
      <CardText
        ><span>Đã tham gia: {course.totalStudentsEnrolled}</span> <br />
        <span>Cập nhật lần cuối: {getTime(course.updatedAt)}</span></CardText
      >
      <!-- <Button color="primary" href={`/course/${course.slug}`}
        >Xem chi tiết</Button
      > -->
    </CardBody>
  </Card>
</a>

<style scoped>
  :global(.card) {
    padding: 8px;
    height: 440px;
  }
  a {
    transition: 0.3s ease;
  }
  a:hover {
    transform: scale(1.03);
  }
  :global(.card-text) {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3; /* Giới hạn 3 dòng */
    -webkit-box-orient: vertical;
  }
  :global(.card-title) {
    font-size: 18px;
    font-weight: 700;
  }
</style>
