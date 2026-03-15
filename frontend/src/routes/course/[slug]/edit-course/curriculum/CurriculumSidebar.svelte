<script>
  import { createEventDispatcher, onMount } from "svelte";
  import {
    addSectionToCourse,
    addItemToSection,
    getItem,
    updateSection,
    deleteSection,
    deleteItem,
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
  let showLessonModal = false;
  let selectedLessonType = null;
  let newLessonName = "";
  let currentSectionIndex = null;
  let itemNames = {};
  let statusMessage = "";
  let statusVariant = "";
  let itemsHydrateKey = "";
  let isHydratingItems = false;

  const showLessonTypeDialog = async (sectionIndex) => {
    currentSectionIndex = sectionIndex;
    showLessonModal = true;
    selectedLessonType = null;
    newLessonName = "";
  };

  const handleLessonTypeSelect = (type) => {
    selectedLessonType = type;
  };

  const handleCreateLesson = async (sectionIndex) => {
    if (!selectedLessonType || newLessonName.trim() === "") {
      setStatus("Vui lòng chọn loại bài học và nhập tên.", "error");
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
        newLesson,
      );
      course = await fetchCourseBySlug(course.slug);
      await hydrateItemNames();
      showLessonModal = false;
      setStatus("Đã thêm mục nội dung mới vào chương.", "success");
    } catch (error) {
      console.error("Error adding item:", error);
      setStatus("Không thể thêm nội dung. Vui lòng thử lại.", "error");
    }
  };

  const getItemName = async (itemType, itemId) => {
    try {
      const response = await getItem(itemType, itemId);
      return response.name;
    } catch (error) {
      console.error("Error fetching item name:", error);
      return "Unknown Item";
    }
  };

  const setStatus = (message, variant = "") => {
    statusMessage = message;
    statusVariant = variant;
  };

  const hydrateItemNames = async () => {
    if (isHydratingItems) {
      return;
    }

    if (!course?.sections?.length) {
      itemNames = {};
      itemsHydrateKey = "";
      return;
    }

    const nextKey = course.sections
      .map((section) =>
        (section.items || []).map((item) => item.itemId).join("|"),
      )
      .join("||");

    if (nextKey === itemsHydrateKey) {
      return;
    }

    isHydratingItems = true;

    const entries = [];
    for (const section of course.sections) {
      for (const item of section.items || []) {
        const key = item.itemId;
        if (!itemNames[key]) {
          entries.push([key, item.itemType]);
        }
      }
    }

    if (!entries.length) {
      itemsHydrateKey = nextKey;
      isHydratingItems = false;
      return;
    }

    try {
      const resolved = await Promise.all(
        entries.map(async ([id, type]) => [id, await getItemName(type, id)]),
      );

      itemNames = {
        ...itemNames,
        ...Object.fromEntries(resolved),
      };

      itemsHydrateKey = nextKey;
    } finally {
      isHydratingItems = false;
    }
  };

  const addSection = async () => {
    const newSection = { name: "Chương mới", items: [] };
    try {
      await addSectionToCourse(course.slug, newSection);
      course = await fetchCourseBySlug(course.slug);
      setStatus("Đã tạo chương mới.", "success");
    } catch (error) {
      console.error("Error adding section:", error);
      setStatus("Không thể thêm chương mới.", "error");
    }
  };

  const handleEditSection = (sectionId) => {
    editingSectionId = sectionId;
  };

  const handleSaveSectionName = async (sectionId, newName) => {
    try {
      await updateSection(course.slug, sectionId, { name: newName });
      course = await fetchCourseBySlug(course.slug);
      setStatus("Đã cập nhật tên chương.", "success");
    } catch (error) {
      console.error("Error updating section name:", error);
      setStatus("Không thể cập nhật tên chương.", "error");
    } finally {
      editingSectionId = null;
    }
  };

  const handleDeleteSection = async (section) => {
    if (confirm(`Bạn có chắc chắn muốn xóa chương "${section.name}" ?`)) {
      try {
        await deleteSection(course.slug, section._id);
        course = await fetchCourseBySlug(course.slug);
        setStatus("Đã xóa chương.", "success");
      } catch (error) {
        console.error("Error deleting section:", error);
        setStatus("Không thể xóa chương.", "error");
      }
    }
  };

  const addLesson = (sectionIndex) => {
    showLessonTypeDialog(sectionIndex);
    dispatch("lessonAdded");
  };

  const handleDeleteItem = async (sectionId, item) => {
    const itemName = itemNames[item.itemId] || "mục nội dung";
    if (confirm(`Bạn có chắc chắn muốn xóa "${itemName}" ?`)) {
      try {
        await deleteItem(course.slug, sectionId, item.itemId);
        course = await fetchCourseBySlug(course.slug);
        setStatus("Đã xóa mục nội dung.", "success");
      } catch (error) {
        console.error("Error deleting item:", error);
        setStatus("Không thể xóa mục nội dung.", "error");
      }
    }
  };

  const handleSelectLesson = (item) => {
    dispatch("selectLesson", item);
  };

  onMount(async () => {
    await hydrateItemNames();
  });

  $: if (course?.sections) {
    hydrateItemNames();
  }
</script>

<!-- Modal chọn loại bài học -->
<Modal isOpen={showLessonModal} toggle={() => (showLessonModal = false)}>
  <ModalHeader toggle={() => (showLessonModal = false)}>
    Tạo mục nội dung mới
  </ModalHeader>
  <ModalBody>
    <p class="modal-help">
      Đặt tên trước, sau đó chọn loại bài học hoặc bài tập.
    </p>
    <Input
      type="text"
      placeholder="Tên bài học/bài tập"
      bind:value={newLessonName}
    />
    <div class="lesson-options mt-3">
      <h3>Loại bài học</h3>
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
      <h3>Loại bài tập</h3>
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
  <div class="course-edit-toolbar">
    <div>
      <p class="sidebar-title">Cấu trúc nội dung</p>
      <p class="sidebar-subtitle">
        Quản lý chương và các bài học bên trong khóa học.
      </p>
    </div>
    <button class="course-edit-btn primary" on:click={addSection}
      >Thêm chương</button
    >
  </div>

  {#if statusMessage}
    <p class={`course-edit-status ${statusVariant}`}>{statusMessage}</p>
  {/if}

  {#each course.sections as section, sectionIndex}
    <article class="section" data-index={sectionIndex}>
      <div class="section-head">
        {#if editingSectionId === section._id}
          <input
            type="text"
            class="course-edit-input section-name-input"
            bind:value={section.name}
            on:blur={() => handleSaveSectionName(section._id, section.name)}
            on:keydown={(event) => {
              if (event.key === "Enter") {
                handleSaveSectionName(section._id, section.name);
              }
            }}
          />
        {:else}
          <h3>{section.name}</h3>
        {/if}
        <div class="section-actions">
          <Button
            on:click={() => handleEditSection(section._id)}
            outline
            size="sm"
            color="info">Sửa</Button
          >
          <Button
            on:click={() => handleDeleteSection(section)}
            outline
            size="sm"
            color="danger">Xóa</Button
          >
        </div>
      </div>

      <ul class="item-list">
        {#each section.items as item, itemIndex}
          <li>
            <button
              type="button"
              class="item"
              on:click={() => handleSelectLesson(item)}
            >
              <span>{itemNames[item.itemId] || "Đang tải..."}</span>
              <small>{item.itemType === "lesson" ? "Bài học" : "Bài tập"}</small
              >
            </button>

            <Button
              on:click={() => handleDeleteItem(section._id, item)}
              outline
              size="sm"
              color="danger">Xóa</Button
            >
          </li>
        {/each}
      </ul>
      <div class="section-footer">
        <Button
          on:click={() => addLesson(sectionIndex)}
          outline
          size="sm"
          color="primary">Thêm bài học / bài tập</Button
        >
      </div>
    </article>
  {/each}

  {#if !course.sections?.length}
    <div class="course-edit-empty">
      Chưa có chương nào. Hãy tạo chương đầu tiên để bắt đầu.
    </div>
  {/if}
</div>

<style>
  .curriculum-sidebar {
    height: 100%;
  }

  .sidebar-title {
    font-weight: 700;
    font-size: 1rem;
    color: #10234a;
    margin-bottom: 0.1rem;
  }

  .sidebar-subtitle {
    color: #5a6d92;
    font-size: 0.82rem;
  }

  .section {
    background: #fff;
    border: 1px solid #d7e4ff;
    border-radius: 14px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .section-head h3 {
    margin: 0;
    font-size: 0.93rem;
    font-weight: 700;
    color: #153064;
  }

  .section-actions {
    display: flex;
    gap: 0.25rem;
  }

  .section-name-input {
    max-width: 60%;
  }

  .item-list {
    margin: 0;
    padding: 0;
  }

  .item-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
    margin-bottom: 0.4rem;
  }

  .item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.45rem 0.5rem;
    border: 1px solid #d7e4ff;
    border-radius: 10px;
    background: #f7faff;
    color: #16356f;
    transition:
      border-color 0.16s ease,
      background-color 0.16s ease;
    text-align: left;
    cursor: pointer;
  }

  .item:hover {
    border-color: #a9c5ff;
    background: #eef5ff;
  }

  .item span {
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .item small {
    color: #5d739e;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .section-footer {
    margin-top: 0.55rem;
  }

  .modal-help {
    color: #60739b;
    font-size: 0.85rem;
    margin-bottom: 0.6rem;
  }

  @media (max-width: 768px) {
    .section-name-input {
      max-width: 100%;
    }

    .section-head {
      flex-direction: column;
      align-items: stretch;
    }

    .section-actions {
      justify-content: flex-end;
    }
  }
</style>
