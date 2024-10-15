<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { fetchCourses, deleteCourse, createCourse } from "$lib/js/api";
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
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    price: 0,
    is_published: false,
  };
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

  const handleCreateCourse = async () => {
    try {
      // Validate dữ liệu newCourse (bạn cần tự thêm logic validation)
      if (
        !newCourse.name ||
        !newCourse.summary ||
        !newCourse.subject ||
        !newCourse.level ||
        !newCourse.slug
      ) {
        alert("Vui lòng điền đầy đủ thông tin khóa học.");
        return;
      }

      const createdCourse = await createCourse(newCourse);
      courses = [...courses, createdCourse]; // Thêm khóa học mới vào danh sách
      showCreateModal = false;
      goto(`/admin/course-management`); // Chuyển hướng đến trang quản lý khóa học
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };
</script>

<h1 class="mt-3">Quản lý Khóa học</h1>

<div class="course-actions d-flex justify-content-between my-4">
  <div style="width:50%">
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
  <p>Đang tải danh sách khóa học...</p>
{:else if courses.length === 0}
  <p>Chưa có khóa học nào.</p>
{:else}
  <Table striped bordered hover responsive>
    <thead>
      <tr>
        <th>STT</th> <th>ID</th>
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
          <td>{course.price}</td>
          <td>{course.is_published ? "Đã xuất bản" : "Chưa xuất bản"}</td>
          <td>
            <Button
              color="primary"
              outline
              size="sm"
              href={`/admin/course-management/${course.slug}/edit`}
            >
              Chỉnh sửa
            </Button>
            <Button
              color="danger"
              outline
              size="sm"
              on:click={() => handleDeleteCourse(course.slug)}
            >
              Xóa
            </Button>
          </td>
        </tr>
      {/each}
    </tbody>
  </Table>

  <LightPaginationNav
    totalItems={filteredCourses.length}
    {pageSize}
    {currentPage}
    limit={5}
    on:setPage={(e) => (currentPage = e.detail.page)}
  />
{/if}

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
</style>
