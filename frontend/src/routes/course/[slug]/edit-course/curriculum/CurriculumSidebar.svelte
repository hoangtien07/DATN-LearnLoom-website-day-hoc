<script>
  import { createEventDispatcher, onMount } from "svelte";
  import {
    addSectionToCourse,
    addItemToSection,
    getItem,
    updateSection,
    deleteSection,
    deleteItem,
    updateCourse,
    fetchCourseBySlug,
  } from "$lib/js/api";
  import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
  } from "@sveltestrap/sveltestrap";

  export let course;
  const dispatch = createEventDispatcher();
  let editingSectionId = null;
  let showLessonModal = false; // Biến kiểm soát hiển thị modal
  let selectedLessonType = null; // Biến lưu trữ loại bài học được chọn
  let newLessonName = ""; // Biến lưu trữ tên bài học/bài tập
  let currentSectionIndex = null;

  // Hiển thị modal chọn loại bài học
  const showLessonTypeDialog = async (sectionIndex) => {
    currentSectionIndex = sectionIndex;
    showLessonModal = true; // Hiển thị modal
    selectedLessonType = null; // Reset loại bài học được chọn
    newLessonName = ""; // Reset tên bài học/bài tập
  };

  // Hàm xử lý khi người dùng chọn loại bài học
  const handleLessonTypeSelect = (type) => {
    selectedLessonType = type;
  };

  // Hàm xử lý khi người dùng nhấn nút "Tạo" trong modal
  const handleCreateLesson = async (sectionIndex) => {
    if (!selectedLessonType || newLessonName.trim() === "") {
      alert("Vui lòng chọn loại bài học và nhập tên bài học/bài tập.");
      return;
    }

    const newLesson = {
      itemType: selectedLessonType === "Quiz" ? "assignment" : "lesson",
      type: selectedLessonType,
      name: newLessonName,
    };

    try {
      await addItemToSection(
        course.slug,
        course.sections[currentSectionIndex]._id,
        newLesson
      );

      // Cập nhật dữ liệu course sau khi thêm bài học/bài tập
      course = await fetchCourseBySlug(course.slug);

      showLessonModal = false; // Đóng modal
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  // Lấy tên của bài học hoặc bài tập
  const getItemName = async (item) => {
    try {
      const response = await getItem(item.itemType, item.itemId);
      return response.name;
    } catch (error) {
      console.error("Error fetching item name:", error);
      return "Unknown Item";
    }
  };

  // Thêm một chương mới
  const addSection = async () => {
    const newSection = { name: "Chương mới", items: [] };
    await addSectionToCourse(course.slug, newSection);
    course = await fetchCourseBySlug(course.slug);
  };

  // Hàm xử lý khi bắt đầu sửa tên chương
  const handleEditSection = (sectionId) => {
    editingSectionId = sectionId;
  };

  // Hàm xử lý khi lưu tên chương
  const handleSaveSectionName = async (sectionId, newName) => {
    try {
      await updateSection(course.slug, sectionId, { name: newName });
      // Cập nhật lại course sau khi lưu
      course = await fetchCourseBySlug(course.slug);
    } catch (error) {
      console.error("Error updating section name:", error);
    } finally {
      editingSectionId = null;
    }
  };

  // Hàm xử lý khi xóa chương
  const handleDeleteSection = async (section) => {
    if (confirm(`Bạn có chắc chắn muốn xóa chương "${section.name}" ?`)) {
      try {
        await deleteSection(course.slug, section._id);
        // Cập nhật lại course sau khi xóa
        course = await fetchCourseBySlug(course.slug);
      } catch (error) {
        console.error("Error deleting section:", error);
      }
    }
  };

  // Thêm một bài học mới
  const addLesson = (sectionIndex) => {
    showLessonTypeDialog(sectionIndex);
    // Sau khi thêm bài học, emit sự kiện 'lessonAdded'
    dispatch("lessonAdded");
  };

  // Xóa bài học/bài tập
  const handleDeleteItem = async (sectionId, item) => {
    console.log(item);
    if (confirm(`Bạn có chắc chắn muốn xóa bài "${item.name}" ?`)) {
      try {
        await deleteItem(course.slug, sectionId, item.itemId);
        course = await fetchCourseBySlug(course.slug);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  // Trả về nội dung bài học được chọn
  const handleSelectLesson = (item) => {
    dispatch("selectLesson", item); // Gửi toàn bộ object item
  };

  // Fetch item names on mount
  onMount(async () => {
    for (const section of course.sections) {
      for (const item of section.items) {
        item.name = await getItemName(item);
      }
    }
  });
</script>

<!-- Modal chọn loại bài học -->
<Modal isOpen={showLessonModal} toggle={() => (showLessonModal = false)}>
  <ModalHeader toggle={() => (showLessonModal = false)}>
    Chọn loại bài học
  </ModalHeader>
  <ModalBody>
    <Input
      type="text"
      placeholder="Tên bài học/bài tập"
      bind:value={newLessonName}
    />
    <div class="lesson-options mt-3">
      <h3>Bài học</h3>
      <Button
        outline
        color="primary"
        on:click={() => handleLessonTypeSelect("TextLesson")}
        active={selectedLessonType === "TextLesson"}
      >
        TextLesson
      </Button>
      <Button
        outline
        color="primary"
        on:click={() => handleLessonTypeSelect("VideoLesson")}
        active={selectedLessonType === "VideoLesson"}
      >
        VideoLesson
      </Button>
      <Button
        outline
        color="primary"
        on:click={() => handleLessonTypeSelect("AudioLesson")}
        active={selectedLessonType === "AudioLesson"}
      >
        AudioLesson
      </Button>
      <div class="mt-1"></div>
      <Button
        outline
        color="primary"
        on:click={() => handleLessonTypeSelect("LiveLesson")}
        active={selectedLessonType === "LiveLesson"}
      >
        LiveLesson
      </Button>
    </div>
    <div class="assignment-options mt-3">
      <h3>Bài tập</h3>
      <Button
        outline
        color="primary"
        on:click={() => handleLessonTypeSelect("Quiz")}
        active={selectedLessonType === "Quiz"}
      >
        Quiz
      </Button>
    </div>
  </ModalBody>
  <ModalFooter>
    <Button
      color="primary"
      on:click={() => handleCreateLesson(currentSectionIndex)}
      disabled={!selectedLessonType || newLessonName.trim() === ""}
    >
      Tạo
    </Button>
    <Button color="secondary" on:click={() => (showLessonModal = false)}>
      Hủy
    </Button>
  </ModalFooter>
</Modal>
<div class="curriculum-sidebar">
  {#each course.sections as section, sectionIndex}
    <div class="section mb-3" data-index={sectionIndex}>
      {#if editingSectionId === section._id}
        <input
          type="text"
          bind:value={section.name}
          on:blur={() => handleSaveSectionName(section._id, section.name)}
        />
      {:else}
        <span>{section.name}</span>

        <Button
          on:click={() => handleEditSection(section._id)}
          outline
          size="sm"
          color="info">Sửa</Button
        >
        <!-- <button on:click={() => handleEditSection(section._id)}>Sửa</button> -->
      {/if}
      <Button
        on:click={() => handleDeleteSection(section)}
        outline
        size="sm"
        color="danger">Xóa</Button
      >
      <!-- <button on:click={() => handleDeleteSection(section)}>Xóa</button> -->
      <ul>
        {#each section.items as item, itemIndex}
          <li>
            <!-- svelte-ignore a11y-invalid-attribute -->
            <a
              href="#"
              class="item"
              on:click={(e) => {
                e.preventDefault();
                handleSelectLesson(item);
              }}
            >
              {#await getItemName(item)}
                Loading...
              {:then itemName}
                {itemName} ({item.itemType})
              {/await}
            </a>

            <Button
              on:click={() => handleDeleteItem(section._id, item)}
              outline
              size="sm"
              color="danger">Xóa</Button
            >
            <!-- <button on:click={() => handleDeleteItem(section._id, item)}>
              Xóa
            </button> -->
          </li>
        {/each}
      </ul>
      <div class="ms-4">
        <Button
          on:click={() => addLesson(sectionIndex)}
          outline
          size="sm"
          color="primary">Thêm Bài học</Button
        >
      </div>
    </div>
  {/each}
  <Button on:click={addSection} outline size="sm" color="primary"
    >Thêm Chương mới</Button
  >
</div>

<style>
  .curriculum-sidebar {
    background-color: #f1f1f1;
    padding: 20px 12px;
    border-radius: 8px;
    height: fit-content;
  }
  ul {
    margin-bottom: 8px;
  }
  input {
    border-radius: 8px;
    border: 1px solid #aaa;
  }
</style>
