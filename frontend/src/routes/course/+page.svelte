<script>
  import { onMount } from "svelte";
  import { fetchFilteredCourses, getSubjects } from "$lib/js/api";
  import {
    Button,
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
  import Spinner from "$lib/components/Spinner.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorState from "$lib/components/ErrorState.svelte";

  let fetchError = "";

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
  const faqs = [
    {
      question: "Làm sao để chọn khóa học phù hợp?",
      answer:
        "Bạn có thể tìm theo môn học, cấp độ và thời lượng để thu hẹp lựa chọn theo mục tiêu học tập.",
    },
    {
      question: "Tôi có thể học thử trước khi mua không?",
      answer:
        "Nhiều khóa học có bài học xem trước miễn phí để bạn đánh giá nội dung trước khi đăng ký.",
    },
    {
      question: "Tôi có thể học trên điện thoại không?",
      answer:
        "Có, LearnLoom hỗ trợ trải nghiệm học tập tốt trên cả máy tính và thiết bị di động.",
    },
  ];

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

  // Tạo ID duy nhất từ tên nhóm + giá trị
  function generateId(group, value) {
    return `${group}-${value}`.replace(/\s+/g, "-").toLowerCase();
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
      fetchError = "";
      courses = await fetchFilteredCourses(filterCriteria);
    } catch (error) {
      console.error("Error fetching data:", error);
      fetchError =
        error?.response?.data?.message ||
        "Không tải được danh sách khóa học. Vui lòng thử lại.";
      courses = [];
    } finally {
      isLoading = false;
    }
  };

  const applyFilters = () => {
    navigateWithCurrentState();
  };

  const clearAllFilters = () => {
    selectedSubjects = [];
    selectedLevels = [];
    selectedDurations = [];
    selectedPrices = [];
    searchTerm = "";
    sort = "";
    applyFilters();
  };

  const handleSortChange = (event) => {
    sort = event.target.value;
    applyFilters();
  };

  // Debounce search input 300ms để tránh gửi request mỗi keystroke.
  let searchDebounceHandle = null;
  const handleSearchInput = () => {
    if (searchDebounceHandle) clearTimeout(searchDebounceHandle);
    searchDebounceHandle = setTimeout(() => applyFilters(), 300);
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

  $: totalActiveFilters =
    selectedSubjects.length +
    selectedLevels.length +
    selectedDurations.length +
    selectedPrices.length;
</script>

<section class="course-catalog">
  <aside class="filter-panel">
    <div class="panel-header">
      <h3>Tìm kiếm và bộ lọc</h3>
      {#if totalActiveFilters > 0 || searchTerm.trim()}
        <button
          type="button"
          class="clear-filter-btn"
          on:click={clearAllFilters}
        >
          Xóa tất cả
        </button>
      {/if}
    </div>

    <label class="search-wrap" for="course-search">
      <i class="bi bi-search"></i>
      <input
        id="course-search"
        class="search"
        type="text"
        bind:value={searchTerm}
        on:input={handleSearchInput}
        placeholder="Nhập tên khóa học..."
      />
    </label>

    <p class="active-filter-hint">
      {#if totalActiveFilters > 0 || searchTerm.trim()}
        Đang áp dụng {totalActiveFilters + (searchTerm.trim() ? 1 : 0)} điều kiện
      {:else}
        Chưa áp dụng bộ lọc
      {/if}
    </p>

    <div class="filter-group">
      <h4>Môn học</h4>
      <div class="filter-options filter-options-scroll">
        {#each subjects as subject}
          <label class="filter-option" for={generateId("subject", subject)}>
            <input
              id={generateId("subject", subject)}
              type="checkbox"
              bind:group={selectedSubjects}
              on:change={applyFilters}
              value={subject}
            />
            <span>{subject}</span>
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h4>Cấp độ</h4>
      <div class="filter-options">
        {#each levels as level}
          <label class="filter-option" for={generateId("level", level)}>
            <input
              id={generateId("level", level)}
              type="checkbox"
              bind:group={selectedLevels}
              on:change={applyFilters}
              value={level}
            />
            <span>{level}</span>
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h4>Thời lượng</h4>
      <div class="filter-options">
        {#each durations as duration}
          <label class="filter-option" for={generateId("duration", duration)}>
            <input
              id={generateId("duration", duration)}
              type="checkbox"
              bind:group={selectedDurations}
              on:change={applyFilters}
              value={duration}
            />
            <span>{duration}</span>
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h4>Giá</h4>
      <div class="filter-options">
        {#each prices as price}
          <label class="filter-option" for={generateId("price", price)}>
            <input
              id={generateId("price", price)}
              type="checkbox"
              bind:group={selectedPrices}
              on:change={applyFilters}
              value={price}
            />
            <span>{price}</span>
          </label>
        {/each}
      </div>
    </div>
  </aside>

  <div class="catalog-content">
    <div class="catalog-toolbar">
      <div>
        <h2>Khóa học</h2>
        <p>
          {#if isLoading}
            <Spinner size={14} inline label="Đang tải" /> Đang tải danh sách khóa
            học...
          {:else if fetchError}
            &nbsp;
          {:else}
            Hiển thị {filteredCourses.length} khóa học phù hợp
          {/if}
        </p>
      </div>

      <div class="sort-wrap">
        <label for="sort">Sắp xếp theo</label>
        <select id="sort" bind:value={sort} on:change={handleSortChange}>
          <option value="">Mặc định</option>
          <option value="popular">Phổ biến</option>
          <option value="newest">Mới nhất</option>
          <option value="rating">Đánh giá</option>
        </select>
      </div>
    </div>

    {#if fetchError}
      <ErrorState
        title="Không tải được khóa học"
        message={fetchError}
        onRetry={fetchCoursesByCriteria}
      />
    {:else if !isLoading && filteredCourses.length === 0}
      <EmptyState
        icon="bi-search"
        title="Không có khóa học phù hợp"
        description="Thử xóa bớt bộ lọc hoặc thay đổi từ khóa tìm kiếm."
        ctaLabel="Xóa bộ lọc"
        onCta={clearAllFilters}
      />
    {:else}
      <CourseAll {filterCriteria} courses={filteredCourses} {sort} />
    {/if}
  </div>
</section>

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
  .course-catalog {
    margin-top: 1.2rem;
    display: grid;
    grid-template-columns: minmax(260px, 310px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .filter-panel {
    border: 1px solid #d8e5ff;
    background: #ffffff;
    border-radius: 16px;
    padding: 0.95rem;
    box-shadow: 0 10px 26px rgba(15, 40, 90, 0.08);
    position: sticky;
    top: 84px;
    max-height: calc(100vh - 100px);
    overflow: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.55rem;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #123066;
  }

  .clear-filter-btn {
    background: transparent;
    border: none;
    color: #1d4ed8;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #cfddfb;
    background: #f8fbff;
    border-radius: 12px;
    padding: 0.45rem 0.6rem;
    margin-bottom: 0.5rem;
    color: #4e6590;
  }

  .search {
    flex: 1;
    border: none;
    background: transparent;
    line-height: 1.25;
    padding: 0;
    min-width: 0;
  }

  .search:focus {
    outline: none;
  }

  .active-filter-hint {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    color: #5a6f96;
    font-weight: 600;
  }

  .filter-group {
    margin-bottom: 0.8rem;
  }

  .filter-group h4 {
    margin: 0 0 0.4rem;
    font-size: 0.92rem;
    color: #153267;
    font-weight: 700;
  }

  .filter-options {
    display: grid;
    gap: 0.28rem;
  }

  .filter-options-scroll {
    max-height: 190px;
    overflow: auto;
    padding-right: 4px;
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    color: #2c3f64;
    font-size: 0.9rem;
    padding: 0.16rem 0;
    cursor: pointer;
  }

  .catalog-content {
    min-width: 0;
  }

  .catalog-toolbar {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.85rem;
    padding: 0.85rem 0.95rem;
    border: 1px solid #dce7fb;
    border-radius: 14px;
    background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
  }

  .catalog-toolbar h2 {
    margin: 0;
    font-size: 1.18rem;
    color: #142f5f;
    font-weight: 800;
  }

  .catalog-toolbar p {
    margin: 0.12rem 0 0;
    font-size: 0.86rem;
    color: #59709a;
    font-weight: 600;
  }

  .sort-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .sort-wrap label {
    font-size: 0.84rem;
    font-weight: 700;
    color: #1d3b73;
  }

  .sort-wrap select {
    border: 1px solid #c7d8fb;
    border-radius: 10px;
    background: #fff;
    color: #17356a;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.42rem 0.62rem;
  }

  .sort-wrap select:focus {
    outline: 2px solid rgba(41, 104, 255, 0.2);
  }

  @media (max-width: 960px) {
    .course-catalog {
      grid-template-columns: 1fr;
      gap: 0.8rem;
    }

    .filter-panel {
      position: static;
      max-height: none;
    }

    .catalog-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .sort-wrap {
      justify-content: space-between;
    }

    .sort-wrap select {
      width: 100%;
      max-width: 220px;
    }
  }

  @media (max-width: 640px) {
    .catalog-toolbar {
      padding: 0.72rem 0.72rem;
    }

    .catalog-toolbar h2 {
      font-size: 1.05rem;
    }
  }
</style>
