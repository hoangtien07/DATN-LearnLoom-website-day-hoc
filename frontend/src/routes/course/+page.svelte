<script>
  import { onMount } from "svelte";
  import { fetchFilteredCourses, getSubjects } from "$lib/js/api";
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
  import CourseAll from "../CourseAll.svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  let sort = "";

  // Các giá trị bộ lọc
  let subjects = [];

  const levels = ["Sơ cấp", "Trung cấp", "Chuyên gia"];
  const durations = [
    "Ít hơn 5 giờ",
    "5-10 giờ",
    "10-20 giờ",
    "20-40 giờ",
    "Hơn 40 giờ",
  ];
  const prices = ["Miễn phí", "Có trả phí"];

  // Các mảng để lưu giá trị checkbox được chọn
  let selectedSubjects = [];
  let selectedLevels = [];
  let selectedDurations = [];
  let selectedPrices = [];

  // Khai báo khác
  let courses = [];
  let filterCriteria = {
    subjects: [],
    levels: [],
    durations: [],
    prices: [],
  };
  let isLoading = true;

  let searchTerm = "";
  let filteredCourses = [];
  let lastHandledQuery = "";

  const durationLabelToParam = {
    "Ít hơn 5 giờ": "0-5 giờ",
    "5-10 giờ": "5-10 giờ",
    "10-20 giờ": "10-20 giờ",
    "20-40 giờ": "20-40 giờ",
    "Hơn 40 giờ": "Hơn 40 giờ",
  };

  const durationParamToLabel = Object.fromEntries(
    Object.entries(durationLabelToParam).map(([label, param]) => [
      param,
      label,
    ]),
  );

  // Tạo ID duy nhất từ tên giá trị
  function generateId(value) {
    return value.replace(/\s+/g, "-").toLowerCase();
  }

  const parseCsvParam = (params, key) => {
    const raw = params.get(key);
    return raw
      ? raw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  };

  const parseFiltersFromUrl = () => {
    if (!browser) return;

    const params = new URLSearchParams($page.url.search);
    selectedSubjects = parseCsvParam(params, "subjects");
    selectedLevels = parseCsvParam(params, "levels");
    selectedDurations = parseCsvParam(params, "durations").map(
      (value) => durationParamToLabel[value] || value,
    );
    selectedPrices = parseCsvParam(params, "prices");
    searchTerm = params.get("search") || "";
    sort = params.get("sort") || "";

    filterCriteria = {
      subjects: selectedSubjects,
      levels: selectedLevels,
      durations: selectedDurations,
      prices: selectedPrices,
    };
  };

  const buildQueryFromCurrentState = () => {
    const query = new URLSearchParams();

    if (selectedSubjects.length)
      query.set("subjects", selectedSubjects.join(","));
    if (selectedLevels.length) query.set("levels", selectedLevels.join(","));
    if (selectedDurations.length) {
      const mappedDurations = selectedDurations.map(
        (value) => durationLabelToParam[value] || value,
      );
      query.set("durations", mappedDurations.join(","));
    }
    if (selectedPrices.length) query.set("prices", selectedPrices.join(","));
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (sort) query.set("sort", sort);

    return query;
  };

  const navigateWithCurrentState = () => {
    if (!browser) return;

    const targetQuery = buildQueryFromCurrentState().toString();
    const currentQuery = $page.url.searchParams.toString();

    if (targetQuery === currentQuery) return;

    goto(targetQuery ? `/course?${targetQuery}` : "/course", {
      replaceState: true,
      noScroll: true,
    });
  };

  const fetchCoursesByCriteria = async () => {
    try {
      isLoading = true;
      courses = await fetchFilteredCourses(filterCriteria);
    } catch (error) {
      console.error("Error fetching data:", error);
      courses = [];
    } finally {
      isLoading = false;
    }
  };

  const applyFilters = () => {
    navigateWithCurrentState();
  };

  const handleSortChange = (event) => {
    sort = event.target.value;
    applyFilters();
  };

  const handleSearchInput = () => {
    applyFilters();
  };

  // Cập nhật danh sách khóa học khi bộ lọc thay đổi
  $: filterCriteria = {
    subjects: selectedSubjects,
    levels: selectedLevels,
    durations: selectedDurations,
    prices: selectedPrices,
  };

  // Xử lý thay đổi phía client
  $: if (browser) {
    filterCriteria = {
      subjects: selectedSubjects,
      levels: selectedLevels,
      durations: selectedDurations,
      prices: selectedPrices,
    };
  }

  $: if (browser && $page.url.pathname === "/course") {
    const currentQuery = $page.url.searchParams.toString();
    if (currentQuery !== lastHandledQuery) {
      lastHandledQuery = currentQuery;
      parseFiltersFromUrl();
      fetchCoursesByCriteria();
    }
  }

  $: filteredCourses = searchTerm
    ? courses.filter((course) =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : courses;

  $: if (sort === "popular") {
    filteredCourses = [...filteredCourses].sort(
      (a, b) => (b.totalStudentsEnrolled || 0) - (a.totalStudentsEnrolled || 0),
    );
  } else if (sort === "newest") {
    filteredCourses = [...filteredCourses].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
  } else if (sort === "rating") {
    filteredCourses = [...filteredCourses].sort(
      (a, b) => (b.avgRating || 0) - (a.avgRating || 0),
    );
  }

  onMount(async () => {
    subjects = await getSubjects();
    subjects = subjects.map((subject) => subject.name);
    if (browser) {
      parseFiltersFromUrl();
      lastHandledQuery = $page.url.searchParams.toString();
    }

    await fetchCoursesByCriteria();
  });

  // Thêm faqs

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
</script>

<div class="d-flex mt-5">
  <div class="filter-nav">
    <!-- Ô tìm kiếm -->
    <div>
      <h4>Tìm kiếm</h4>
      <input
        class="search"
        type="text"
        bind:value={searchTerm}
        on:input={handleSearchInput}
        placeholder="Nhập tên khóa học..."
      />
    </div>

    <h4 class="mb-1 mt-1">Bộ lọc</h4>

    <!-- Bộ lọc Môn học -->
    <div>
      <h4>Môn học</h4>
      {#each subjects as subject}
        <div>
          <input
            type="checkbox"
            bind:group={selectedSubjects}
            on:change={applyFilters}
            value={subject}
            id={generateId(subject)}
          />
          <label for={generateId(subject)}>{subject}</label>
        </div>
      {/each}
    </div>

    <!-- Bộ lọc Cấp độ -->
    <div>
      <h4>Cấp độ</h4>
      {#each levels as level}
        <div>
          <input
            type="checkbox"
            bind:group={selectedLevels}
            on:change={applyFilters}
            value={level}
            id={generateId(level)}
          />
          <label for={generateId(level)}>{level}</label>
        </div>
      {/each}
    </div>

    <!-- Bộ lọc Thời lượng -->
    <div>
      <h4>Thời lượng</h4>
      {#each durations as duration}
        <div>
          <input
            type="checkbox"
            bind:group={selectedDurations}
            on:change={applyFilters}
            value={duration}
            id={generateId(duration)}
          />
          <label for={generateId(duration)}>{duration}</label>
        </div>
      {/each}
    </div>

    <!-- Bộ lọc Giá -->
    <div>
      <h4>Giá</h4>
      {#each prices as price}
        <div>
          <input
            type="checkbox"
            bind:group={selectedPrices}
            on:change={applyFilters}
            value={price}
            id={generateId(price)}
          />
          <label for={generateId(price)}>{price}</label>
        </div>
      {/each}
    </div>
  </div>

  <!-- Hiển thị danh sách khóa học -->
  <div class="all-course">
    <div class="sort-bar mb-4 text-end">
      <label for="sort">Sắp xếp theo:</label>
      <select id="sort" bind:value={sort} on:change={handleSortChange}>
        <option value="">Mặc định</option>
        <option value="popular">Phổ biến</option>
        <option value="newest">Mới nhất</option>
        <option value="rating">Đánh giá</option>
      </select>
    </div>
    <CourseAll {filterCriteria} courses={filteredCourses} {sort} />
  </div>
</div>

<Container class="my-5 pt-5">
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

<style>
  .filter-nav {
    margin-right: 40px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
    margin-right: 24px;
    height: fit-content;
  }
  .all-course {
    flex: 1;
  }
  .search {
    border: 1px solid #aaa;
    line-height: 24px;
    border-radius: 8px;
    padding: 4px 8px;
    margin-bottom: 16px;
  }
  .filter-nav label {
    margin-left: 4px;
  }
  .sort-bar {
    padding: 8px;
    border: 1px solid #aaa;
    width: fit-content;
    /* float: right; */
    border-radius: 8px;
    background-color: #f8f8f8;
  }
  .sort-bar option {
    background-color: inherit;
  }
  h4 {
    font-size: 18px;
  }
  .filter-nav label {
    font-size: 16px;
  }
</style>
