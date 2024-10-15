<script>
  import { fetchCourses } from "$lib/js/api";
  import { onMount } from "svelte";

  import {
    ButtonGroup,
    Button,
    Image,
    Container,
    Row,
    Col,
    Accordion,
    AccordionItem,
  } from "@sveltestrap/sveltestrap";
  import heroImg from "$lib/images/hero.png";
  import featuresImg from "$lib/images/home-features.png";
  import curriculumImg1 from "$lib/images/character/tải xuống (33).png";
  import curriculumImg2 from "$lib/images/character/tải xuống (2).png";
  import CourseItem from "../lib/components/CourseItem.svelte";

  let courses = [];
  let faqs = [
    {
      question: "LearnLoom cung cấp những loại khóa học nào?",
      answer:
        "Có rất nhiều khóa học học trên LearnLoom, như lập trình, thiết kế, marketing...",
    },
    {
      question: "Làm sao để đăng ký một khóa học trên LearnLoom?",
      answer:
        "Bạn cần đăng nhập và đăng ký khóa học bằng cách nhấp vào nút 'Đăng ký' trên trang khóa học.",
    },
    {
      question:
        "Các khóa học trên LearnLoom có tự học hay do giảng viên hướng dẫn?",
      answer:
        "Có các khóa học theo hình thức tự học hoặc có giảng viên hướng dẫn.",
    },
    {
      question: "Thời lượng của các khóa học là bao lâu?",
      answer:
        "Thời lượng khóa học thay đổi từ vài tuần đến vài tháng tùy thuộc vào nội dung.",
    },
    {
      question: "Tôi có nhận được chứng chỉ sau khi hoàn thành khóa học không?",
      answer:
        "Hiện tại hệ thống chưa có nhưng tính năng này đang được chúng tôi hoàn thiện.",
    },
    {
      question: "Nếu tôi không hài lòng với khóa học thì sao?",
      answer:
        "Chúng tôi sẵn sàng lắng nghe ý kiến của bạn và phản hồi lại với giảng viên.",
    },
  ];

  onMount(async () => {
    courses = await fetchCourses();
    // Sắp xếp khóa học theo số lượng học viên đăng ký giảm dần
    courses = courses
      .sort((a, b) => b.totalStudentsEnrolled - a.totalStudentsEnrolled)
      .slice(0, 8); // Lấy 8 khóa học đầu tiên
  });
</script>

<svelte:head>
  <title>LearnLoom</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<section class="hero d-flex">
  <div class="hero-content">
    <h1 class="hero-title">Chinh phục kỹ năng mới với LearnLoom</h1>
    <p class="mt-4">
      Bạn có đang gặp khó khăn với việc học tập hoặc muốn theo kịp các môn học
      của mình?
    </p>
    <Button color="dark" class="mt-4"
      ><a href="/course"
        >Bắt đầu ngay <i class="bi bi-arrow-right-circle-fill ms-2"></i></a
      ></Button
    >
  </div>
  <div>
    <!-- svelte-ignore a11y-img-redundant-alt -->
    <img src={heroImg} alt="Hero Image" class="hero-img" />
  </div>
</section>

<section class="curriculum">
  <div class="curr-title d-flex">
    <div class="curr-title-left">
      <h2>Học các kỹ năng mới với LearnLoom</h2>
      <!-- <h2>Một cái nhìn chi tiết về chúng tôi</h2> -->
    </div>
    <div class="curr-title-right">
      <p>Khám phá các khóa học phù hợp với bạn</p>
      <Button color="dark" class="mt-2"
        ><a href="/course"
          >Bắt đầu ngay <i class="bi bi-arrow-right-circle-fill ms-2"></i></a
        ></Button
      >
    </div>
  </div>
  <div class="curriculum-list d-flex">
    <div class="curriculum-item">
      <h4>
        Học theo nhịp độ của riêng bạn với các lớp học trực tuyến và bài tập
        thực hành
      </h4>
    </div>
    <div class="curriculum-item">
      <h4>
        Giảng viên tại LearnLoom là những chuyên gia giàu kinh nghiệm, sẵn sàng
        chia sẻ kiến thức và đam mê với bạn
      </h4>
    </div>
  </div>
  <div
    class="curr-body d-flex align-items-center justify-content-center my-4 mb-5 pt-2 pb-5 position-relative"
  >
    <img src={curriculumImg2} alt="curriculum" />
    <div class="curr-features">
      <h4 class="mb-4 text-center">
        Các tính năng đặc biệt dành riêng cho bạn:
      </h4>
      <div class="d-flex flex-column px-5">
        <ButtonGroup vertical>
          <Button outline color="dark">Giảng viên chất lượng</Button>
          <Button outline color="dark">Hỗ trợ trọn đời</Button>
          <Button outline color="dark">Video bài giảng</Button>
          <Button outline color="dark">Thực hành với bài kiểm tra</Button>
          <Button outline color="dark">Chat AI</Button>
        </ButtonGroup>
      </div>
    </div>
    <img src={curriculumImg1} alt="curriculum" />
  </div>
</section>
<div class="line my-5"></div>
<section class="popular-courses">
  <h2 class="text-center">Các khóa học nổi bật</h2>
  <div class="course-list mt-5">
    {#each courses as course}
      <CourseItem {course} />
    {/each}
  </div>
  <div class="d-flex justify-content-center mt-3">
    <Button color="dark" class="mt-3"
      ><a href="/course"
        >Xem toàn bộ khóa học <i class="bi bi-arrow-right-circle-fill ms-2"
        ></i></a
      ></Button
    >
  </div>
</section>

<section class="features" style="margin-bottom: 80px;">
  <Image
    fluid
    thumbnail={false}
    figure={false}
    src={featuresImg}
    alt="features"
  />
</section>

<Container class="my-5">
  <Row>
    <Col md="6">
      <div class="faq-intro pt-4">
        <span class="badge bg-light text-dark">FAQ</span>
        <h2 class="mt-3">Hỏi đáp về LearnLoom và các khóa học</h2>
        <p>Bạn có câu hỏi nào về LearnLoom?</p>
        <Button color="dark" class="mt-2"
          >Cho chúng tôi biết ngay <i class="bi bi-arrow-right-circle-fill ms-2"
          ></i></Button
        >
      </div>
    </Col>

    <Col md="6">
      <Accordion flush>
        {#each faqs as faq}
          <AccordionItem header={faq.question}>
            {faq.answer}
          </AccordionItem>
        {/each}
      </Accordion>
    </Col>
  </Row>
</Container>

<!-- <section class="testimonials">
  <h2>What Our Students Say</h2>
  <div class="testimonial-list">
    <div class="testimonial-item">
      <p>
        "CourseCo helped me improve my skills tremendously. The mentors are
        amazing!"
      </p>
      <h3>- Alex T.</h3>
    </div>
    <div class="testimonial-item">
      <p>
        "I love the interactive lessons and the flexibility to learn at my own
        pace."
      </p>
      <h3>- Mary J.</h3>
    </div>
    <div class="testimonial-item">
      <p>
        "The courses here are certified, which has boosted my career prospects."
      </p>
      <h3>- John S.</h3>
    </div>
  </div>
</section> -->

<style>
  h1 {
    width: 100%;
  }
  h2 {
    font-size: 52px;
    font-weight: 600;
  }
  a {
    color: inherit;
  }
  .hero {
    margin-top: 40px;
    align-items: center;
  }
  .hero-title {
    font-weight: 800;
    font-size: 62px;
    text-align: left;
  }
  .hero-content p {
    padding-right: 280px;
  }
  .hero-img {
    height: 520px;
  }
  .curr-title-left {
    width: 80%;
  }

  /*  */
  .curriculum {
    margin-top: 60px;
  }
  .curr-title-left {
    flex: 4;
  }
  .curr-title-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .curriculum-list {
    justify-content: space-between;
    margin-top: 40px;
  }
  .curriculum-item {
    padding: 40px;
    border-radius: 8px;
  }
  .curriculum-item:first-child {
    width: 40%;
    background-color: #aee5ff;
  }
  .curriculum-item:last-child {
    width: 56%;
    background-color: #c3ffd2;
  }
  .curr-body {
    background-color: #f8f6f3;
    border-radius: 8px;
  }
  .curriculum img {
    height: 400px;
    margin-top: 40px;
  }
  .line {
    width: 100%;
    height: 1px;
    background-color: #333;
  }
  .course-list {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(240px, 1fr)
    ); /* Hiển thị nhiều khóa học trên 1 dòng, min-width 240px */
    grid-gap: 20px;
    align-items: stretch;
  }
  .features {
    margin-top: 100px;
  }

  /* faqs */
  .faq-intro {
    text-align: left;
  }
  .badge {
    font-size: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
  }
  h2 {
    font-weight: bold;
    font-size: 2rem;
  }
  p {
    font-size: 1rem;
    margin-top: 1rem;
  }
</style>
