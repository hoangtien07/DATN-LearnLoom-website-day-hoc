<script>
  import { onMount } from "svelte";
  import { fetchCourseByInstructor, getEnrolledStudents } from "$lib/js/api";
  import { user, fetchUser } from "../../../stores/auth";
  import {
    Table,
    Pagination,
    PaginationItem,
    PaginationLink,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Input,
  } from "@sveltestrap/sveltestrap";

  let courses = [];
  let selectedCourseId = null;
  let enrollments = [];
  let currentPage = 1;
  let itemsPerPage = 10;
  let isOpen = false; // Biến kiểm soát trạng thái dropdown
  let searchQuery = ""; // Biến lưu trữ nội dung tìm kiếm

  onMount(async () => {
    if (!$user) $user = fetchUser();
    if ($user && $user.role === "instructor") {
      courses = await fetchCourseByInstructor($user._id);
    }
  });

  const handleCourseSelect = async (courseId) => {
    selectedCourseId = courseId;
    currentPage = 1; // Reset trang hiện tại khi chọn khóa học mới

    try {
      // Gọi API để lấy danh sách học viên đã đăng ký
      enrollments = await getEnrolledStudents(courseId);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách học viên:", error);
      // Xử lý lỗi, ví dụ: hiển thị thông báo lỗi cho người dùng
    }

    isOpen = false; // Đóng dropdown sau khi chọn khóa học
  };

  // Tính toán index bắt đầu và kết thúc cho phân trang
  $: startIndex = (currentPage - 1) * itemsPerPage;
  $: endIndex = startIndex + itemsPerPage;

  // Lấy danh sách enrollments cho trang hiện tại
  $: currentEnrollments = enrollments.slice(startIndex, endIndex);

  // Hàm lọc danh sách khóa học dựa trên searchQuery
  $: filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Hàm xử lý khi focus vào input
  const handleInputFocus = () => {
    isOpen = true; // Mở dropdown khi focus vào input
  };
</script>

{#if $user && $user.role === "instructor"}
  <h1>Gradebook</h1>

  <div class="course-selector">
    <Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
      <DropdownToggle tag="div" class="d-inline-block">
        <Input
          type="text"
          placeholder="Tìm kiếm khóa học..."
          bind:value={searchQuery}
          on:focus={handleInputFocus}
        />
      </DropdownToggle>
      <DropdownMenu>
        {#each filteredCourses as course}
          <DropdownItem on:click={() => handleCourseSelect(course._id)}>
            {course.name}
          </DropdownItem>
        {/each}
      </DropdownMenu>
    </Dropdown>
  </div>

  {#if selectedCourseId}
    {#if enrollments.length > 0}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>STT</th>
            <th>Học viên</th>
            <th>Email</th>
            <th>Ảnh đại diện</th>
            <th>Tiến độ</th>
          </tr>
        </thead>
        <tbody>
          {#each currentEnrollments as enrollment, index}
            <tr>
              <td>{startIndex + index + 1}</td>
              <td>{enrollment.username}</td>
              <td>{enrollment.email}</td>
              <td>
                {#if enrollment.thumbnail}
                  <img
                    src={enrollment.thumbnail}
                    alt="Avatar"
                    width="50"
                    height="50"
                    style="margin: 0 auto;display:block;
                    border-radius:50%"
                  />
                {:else}
                  <p>Không có ảnh</p>
                {/if}
              </td>
              <td>{enrollment.progress}%</td>
            </tr>
          {/each}
        </tbody>
      </Table>

      <!-- Phân trang -->
      <Pagination aria-label="Phân trang">
        <PaginationItem disabled={currentPage === 1}>
          <PaginationLink previous href="#" on:click={() => currentPage--} />
        </PaginationItem>
        {#each Array(Math.ceil(enrollments.length / itemsPerPage)) as _, i}
          <PaginationItem active={currentPage === i + 1}>
            <PaginationLink href="#" on:click={() => (currentPage = i + 1)}
              >{i + 1}</PaginationLink
            >
          </PaginationItem>
        {/each}
        <PaginationItem
          disabled={currentPage ===
            Math.ceil(enrollments.length / itemsPerPage)}
        >
          <PaginationLink next href="#" on:click={() => currentPage++} />
        </PaginationItem>
      </Pagination>
    {:else}
      <p>Chưa có học viên đăng ký khóa học này.</p>
    {/if}
  {:else}
    <p>Vui lòng chọn một khóa học.</p>
  {/if}
{:else}
  <h2>Bạn không có quyền truy cập trang này.</h2>
{/if}

<style>
  .course-selector {
    margin-bottom: 20px;
  }
  th,
  td {
    text-align: center;
  }
</style>
