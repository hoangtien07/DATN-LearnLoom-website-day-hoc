<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { fetchCourses, deleteCourse, createCourse } from "$lib/js/api";
  import { user } from "../../../stores/auth.js";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    Form,
    FormGroup,
    Label,
    Input,
    Table,
  } from "@sveltestrap/sveltestrap";
  let searchQuery = "";
  // Hàm lọc danh sách khóa học dựa trên searchQuery
  $: filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  // Calculate startIndex based on currentPage and pageSize
  $: startIndex = (currentPage - 1) * pageSize;
  // Hàm xử lý khi submit form tìm kiếm
  const handleSearch = (event) => {
    event.preventDefault();
    // Thực hiện logic tìm kiếm ở đây, ví dụ: cập nhật danh sách khóa học
    // dựa trên searchQuery
  };
  let courses = [];
  let isLoading = true;
  let isDeleting = false;
  let currentPage = 1;
  let pageSize = 8;
  let showCreateModal = false;
  let newCourse = {
    name: "",
    summary: "",
    subject: "",
    level: "",
    slug: "",
    image_url: "",
    totalDuration: "",
    price: 0,
    is_published: false,
  };

  $: publishedCount = courses.filter((course) => course.is_published).length;
  $: draftCount = courses.length - publishedCount;

  // Cập nhật paginatedItems khi filteredCourses thay đổi
  $: paginatedItems = paginate({
    items: filteredCourses,
    pageSize,
    currentPage,
  });

  onMount(async () => {
    await loadCourses();
  });

  const loadCourses = async () => {
    try {
      courses = await fetchCourses();
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      isLoading = false;
    }
  };

  const handleDeleteCourse = async (courseSlug) => {
    if (confirm("Bạn có chắc chắn muốn xóa khóa học này?")) {
      try {
        isDeleting = true;
        await deleteCourse(courseSlug);
        courses = courses.filter((course) => course.slug !== courseSlug);
      } catch (error) {
        console.error("Error deleting course:", error);
      } finally {
        isDeleting = false;
      }
    }
  };

  const handleCreateCourse = async (event) => {
    event?.preventDefault();

    try {
      // Validate dữ liệu newCourse (bạn cần tự thêm logic validation)
      if (
        !newCourse.name ||
        !newCourse.summary ||
        !newCourse.subject ||
        !newCourse.level ||
        !newCourse.slug ||
        !newCourse.totalDuration
      ) {
        alert("Vui lòng điền đầy đủ thông tin khóa học.");
        return;
      }

      const parsedDuration = Number(newCourse.totalDuration);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        alert("Tổng thời lượng phải là số giờ lớn hơn 0.");
        return;
      }

      const payload = {
        ...newCourse,
        totalDuration: parsedDuration,
        teacher: $user?._id,
      };

      const createdCourse = await createCourse(payload);
      courses = [...courses, createdCourse]; // Thêm khóa học mới vào danh sách
      showCreateModal = false;
      goto(`/admin/course-management`); // Chuyển hướng đến trang quản lý khóa học
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };
</script>

<section class="admin-shell">
  <div class="admin-hero">
    <h1>Quản lý khóa học</h1>
    <p>
      Quản trị danh sách khóa học, theo dõi trạng thái xuất bản và cập nhật nội
      dung đào tạo theo từng chủ đề.
    </p>
  </div>

  <div class="admin-stats-grid">
    <article class="admin-stat-card">
      <p class="admin-stat-label">Tổng khóa học</p>
      <p class="admin-stat-value">{courses.length}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Đã xuất bản</p>
      <p class="admin-stat-value">{publishedCount}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Bản nháp</p>
      <p class="admin-stat-value">{draftCount}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Hiển thị mỗi trang</p>
      <p class="admin-stat-value">{pageSize}</p>
    </article>
  </div>

  <div class="admin-card">
    <div class="admin-toolbar">
      <div class="toolbar-search">
        <Input
          type="text"
          placeholder="Tìm kiếm khóa học..."
          bind:value={searchQuery}
        />
      </div>
      <Button color="primary" on:click={() => (showCreateModal = true)}
        >Tạo khóa học mới</Button
      >
    </div>

    {#if isLoading}
      <div class="admin-empty-state">Đang tải danh sách khóa học...</div>
    {:else if courses.length === 0}
      <div class="admin-empty-state">Chưa có khóa học nào.</div>
    {:else if filteredCourses.length === 0}
      <div class="admin-empty-state">Không tìm thấy khóa học phù hợp.</div>
    {:else}
      <div class="admin-table-wrap">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>STT</th>
              <th>ID</th>
              <th>Tên khóa học</th>
              <th>Chủ đề</th>
              <th>Cấp độ</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedItems as course, index}
              <tr>
                <td>{startIndex + index + 1}</td>
                <td>{course._id}</td>
                <td>{course.name}</td>
                <td>{course.subject}</td>
                <td>{course.level}</td>
                <td>{Number(course.price || 0).toLocaleString()} VND</td>
                <td>{course.is_published ? "Đã xuất bản" : "Chưa xuất bản"}</td>
                <td>
                  <div class="admin-page-actions">
                    <Button
                      color="primary"
                      outline
                      size="sm"
                      href={`/course/${course.slug}/edit-course/settings?from=admin`}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button
                      color="danger"
                      outline
                      size="sm"
                      on:click={() => handleDeleteCourse(course.slug)}
                      disabled={isDeleting}
                    >
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </Table>
      </div>

      <div class="mt-3">
        <LightPaginationNav
          totalItems={filteredCourses.length}
          {pageSize}
          {currentPage}
          limit={5}
          on:setPage={(e) => (currentPage = e.detail.page)}
        />
      </div>
    {/if}
  </div>
</section>

<!-- Modal tạo khóa học mới -->
<Modal isOpen={showCreateModal} toggle={() => (showCreateModal = false)}>
  <ModalHeader toggle={() => (showCreateModal = false)}
    >Tạo khóa học mới</ModalHeader
  >
  <ModalBody>
    <Form on:submit={handleCreateCourse}>
      <FormGroup>
        <Label for="name">Tên khóa học:</Label>
        <Input type="text" id="name" bind:value={newCourse.name} required />
      </FormGroup>
      <FormGroup>
        <Label for="summary">Tóm tắt:</Label>
        <Input
          type="textarea"
          id="summary"
          bind:value={newCourse.summary}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="subject">Chủ đề:</Label>
        <Input
          type="text"
          id="subject"
          bind:value={newCourse.subject}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="level">Cấp độ:</Label>
        <Input type="select" id="level" bind:value={newCourse.level} required>
          <option value="Sơ cấp">Sơ cấp</option>
          <option value="Trung cấp">Trung cấp</option>
          <option value="Nâng cao">Nâng cao</option>
        </Input>
      </FormGroup>
      <FormGroup>
        <Label for="slug">Slug:</Label>
        <Input type="text" id="slug" bind:value={newCourse.slug} required />
      </FormGroup>
      <FormGroup>
        <Label for="image_url">URL hình ảnh:</Label>
        <Input type="text" id="image_url" bind:value={newCourse.image_url} />
      </FormGroup>
      <FormGroup>
        <Label for="price">Giá:</Label>
        <Input type="number" id="price" bind:value={newCourse.price} />
      </FormGroup>
      <FormGroup>
        <Label for="totalDuration">Tổng thời lượng (giờ):</Label>
        <Input
          type="number"
          id="totalDuration"
          min="0.1"
          step="0.1"
          bind:value={newCourse.totalDuration}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="is_published">Trạng thái:</Label>
        <Input
          type="checkbox"
          id="is_published"
          bind:checked={newCourse.is_published}
        />
      </FormGroup>
      <Button type="submit" color="primary">Tạo khóa học</Button>
    </Form>
  </ModalBody>
</Modal>

<style>
  :global(.admin-toolbar .toolbar-search .form-control) {
    border: none;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  :global(.admin-toolbar .toolbar-search .form-control:focus) {
    box-shadow: none;
  }
</style>
