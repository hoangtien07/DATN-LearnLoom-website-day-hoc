<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../../stores/auth.js";
  import {
    fetchCourseByInstructor,
    createCourse,
    getSubjects,
  } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import {
    Button,
    Form,
    Input,
    Modal,
    ModalBody,
    ModalHeader,
    Image,
  } from "@sveltestrap/sveltestrap";
  import CourseList from "$lib/components/CourseList.svelte";

  let open = false;
  const toggle = () => {
    open = !open;
  };

  $: teacher = user;
  let courses = [];
  let subjects = []; // Biến lưu trữ danh sách môn học
  let newCourse = {
    name: "",
    summary: "",
    teacher: "",
    overviewVideo: "",
    level: "",
    subject: "",
    slug: "",
    image_url: "",
    price: 0,
    is_published: false,
  };

  onMount(async () => {
    await fetchUser();
    if ($teacher && $teacher.role === "instructor") {
      courses = await fetchCourseByInstructor($teacher._id);

      // Sắp xếp khóa học theo updatedAt giảm dần
      courses.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    // Lấy danh sách môn học
    subjects = await getSubjects();
  });

  const handleCreateCourse = async () => {
    try {
      if (
        !newCourse.name ||
        !newCourse.summary ||
        !newCourse.subject ||
        !newCourse.level ||
        !newCourse.slug
      ) {
        console.log(newCourse);
        alert("Vui lòng điền đầy đủ thông tin khóa học.");
        return;
      }

      newCourse.teacher = $teacher._id;

      console.log(newCourse);

      const createdCourse = await createCourse(newCourse);

      showModal = false;

      goto(`/course/${createdCourse.slug}/edit-course/curriculum`);
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };
  let showModal = false;
  let showFilters = false; // Biến kiểm soát hiển thị bộ lọc
</script>

{#if $teacher && $teacher.role === "instructor"}
  <h1 class="mt-4">Teacher Dashboard</h1>
  <!-- Thông tin cá nhân -->
  <div class="teacher-info mt-4">
    <h3>Thông tin cá nhân</h3>
    <div class="d-flex mt-3">
      <div style="width:20%" class="d-flex flex-column">
        <div
          style="width:80px;height:80px;border-radius:50%;margin-left:60px; overflow:hidden;border: 4px solid #ddd"
        >
          <img src={$user.thumbnail} alt="" style="width: 100%;" />
          <!-- <Image theme="light" thumbnail alt="" src={$user.thumbnail} /> -->
        </div>
        <div class="mr-4 mt-3">
          <Button color="secondary" outline href="/profile"
            ><i class="bi bi-gear"></i> Chỉnh sửa thông tin</Button
          >
        </div>
      </div>
      <div style="flex:1">
        <p><b>Tên:</b> {$teacher.username}</p>
        <p><b>Email:</b> {$teacher.email}</p>
        <p><b>Tiểu sử:</b> {$teacher.bio ? $teacher.bio : "Chưa có"}</p>
      </div>
    </div>
  </div>

  <div class="mt-4">
    <Button color="dark" outline on:click={toggle}>Tạo khóa học mới</Button>
    <div class="mt-3"></div>
    <Modal isOpen={open} {toggle} size="lg">
      <ModalHeader {toggle}>Tạo khóa học mới</ModalHeader>
      <ModalBody>
        <Form on:submit={handleCreateCourse}>
          <div class="form-group">
            <label for="courseName">Tên khóa học:</label>
            <Input
              type="text"
              id="courseName"
              bind:value={newCourse.name}
              required
            />
          </div>
          <div class="form-group">
            <label for="courseSummary">Tóm tắt khóa học:</label>
            <Input
              type="textarea"
              id="courseSummary"
              bind:value={newCourse.summary}
              required
            />
          </div>
          <div class="form-group">
            <label for="courseSubject">Chủ đề:</label>
            <select id="courseSubject" bind:value={newCourse.subject} required>
              {#each subjects as subject}
                <option value={subject.name}>{subject.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="courseLevel">Cấp độ:</label>
            <select id="courseLevel" bind:value={newCourse.level} required>
              <option value="Sơ cấp">Sơ cấp</option>
              <option value="Trung cấp">Trung cấp</option>
              <option value="Chuyên gia">Chuyên gia</option>
            </select>
          </div>
          <div class="form-group">
            <label for="courseSlug">Slug:</label>
            <Input
              type="text"
              id="courseSlug"
              bind:value={newCourse.slug}
              required
            />
          </div>
          <div class="form-group">
            <label for="imageUrl">URL hình ảnh:</label>
            <Input type="text" id="imageUrl" bind:value={newCourse.image_url} />
          </div>
          <div class="form-group">
            <label for="price">Giá:</label>
            <Input type="number" id="price" bind:value={newCourse.price} />
          </div>
          <div class="form-group mb-3">
            <label for="overviewVideo">Video giới thiệu:</label>
            <Input
              type="text"
              id="overviewVideo"
              bind:value={newCourse.overviewVideo}
            />
          </div>
          <Button type="submit" color="primary" class="float-end"
            >Tạo khóa học</Button
          >
        </Form>
      </ModalBody>
    </Modal>
  </div>
  <CourseList {courses} isEdit="true" />
{:else}
  <h2>Bạn không có quyền truy cập trang này.</h2>
{/if}

<style>
  .teacher-info {
    border: 1px solid #ccc;
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 5px;
  }
  .form-group {
    margin-bottom: 10px;
  }

  label {
    display: block;
    margin-bottom: 5px;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    box-sizing: border-box;
    margin-bottom: 10px;
  }
</style>
