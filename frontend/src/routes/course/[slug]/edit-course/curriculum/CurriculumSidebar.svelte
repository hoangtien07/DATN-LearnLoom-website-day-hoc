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
    toggleLessonVisibility,
    reorderSections,
    reorderItemsInSection,
  } from "$lib/js/api";
  import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
  } from "@sveltestrap/sveltestrap";
  import { pushToast } from "$lib/stores/toast.js";
  import { confirm as uiConfirm } from "$lib/stores/confirm.js";
  import { dndzone, SOURCES, TRIGGERS } from "svelte-dnd-action";
  import { flip } from "svelte/animate";

  export let course;
  const dispatch = createEventDispatcher();
  let editingSectionId = null;
  let showLessonModal = false;
  let selectedLessonType = null;
  let newLessonName = "";
  let currentSectionIndex = null;
  let itemNames = {};
  let itemVisible = {};
  let statusMessage = "";
  let statusVariant = "";
  let itemsHydrateKey = "";
  let isHydratingItems = false;
  const FLIP_MS = 220;
  let isReorderingSections = false;
  // Map sectionId → boolean để lock từng section khi API đang chạy.
  let reorderingItemsIn = {};
  // Snapshot sections trước khi drag để rollback nếu API fail.
  let sectionsSnapshot = null;
  // Snapshot items của từng section.
  let itemsSnapshotBySection = {};

  // Svelte-dnd-action yêu cầu mỗi phần tử có `id`. Mongoose trả `_id`;
  // reactive sync để `id` luôn khớp _id (không mutate lần 2 nếu đã set).
  const ensureDndIds = (c) => {
    if (!c?.sections) return;
    for (const section of c.sections) {
      if (!section.id) section.id = String(section._id);
      if (Array.isArray(section.items)) {
        for (const item of section.items) {
          if (!item.id)
            item.id = `${section._id}-${item._id || item.itemId || ""}`;
        }
      }
    }
  };
  $: ensureDndIds(course);

  // Tìm startIndex/endIndex từ old vs new array (1 phần tử di chuyển).
  const findMoveIndices = (oldArr, newArr, idKey = "id") => {
    const newIds = newArr.map((x) => String(x[idKey]));
    const oldIds = oldArr.map((x) => String(x[idKey]));
    for (let i = 0; i < newIds.length; i++) {
      if (newIds[i] !== oldIds[i]) {
        const startIndex = oldIds.indexOf(newIds[i]);
        if (startIndex === -1) return null;
        return { startIndex, endIndex: i };
      }
    }
    return null;
  };

  // ============================================================
  // Drag-drop handlers (svelte-dnd-action)
  // ============================================================
  // SECTIONS
  const onSectionsConsider = (e) => {
    // Snapshot thứ tự cũ khi bắt đầu drag (trigger DRAGGED_ENTERED or OUT).
    if (
      !sectionsSnapshot &&
      e.detail.info.trigger === TRIGGERS.DRAG_STARTED
    ) {
      sectionsSnapshot = course.sections.map((s) => ({ ...s }));
    }
    // Update local order để animation + placeholder hiển thị.
    course.sections = e.detail.items;
  };

  const onSectionsFinalize = async (e) => {
    const newSections = e.detail.items;
    course.sections = newSections;

    // Chỉ commit khi drop do user thực hiện (không phải SOURCE.API).
    if (e.detail.info.source !== SOURCES.POINTER) {
      sectionsSnapshot = null;
      return;
    }

    const snapshot = sectionsSnapshot;
    sectionsSnapshot = null;
    if (!snapshot) return;

    const move = findMoveIndices(snapshot, newSections, "id");
    if (!move || move.startIndex === move.endIndex) return;

    if (isReorderingSections) return; // guard race
    isReorderingSections = true;
    try {
      await reorderSections(course.slug, move.startIndex, move.endIndex);
      pushToast("Đã cập nhật thứ tự chương.", { variant: "success" });
    } catch (err) {
      console.error("Error reordering sections:", err);
      // Rollback về snapshot nếu API fail.
      course.sections = snapshot;
      pushToast(
        err?.response?.data?.message ||
          "Không lưu được thứ tự chương. Đã hoàn tác.",
        { variant: "error" },
      );
    } finally {
      isReorderingSections = false;
    }
  };

  // ITEMS trong 1 section
  const onItemsConsider = (sectionId) => (e) => {
    if (
      !itemsSnapshotBySection[sectionId] &&
      e.detail.info.trigger === TRIGGERS.DRAG_STARTED
    ) {
      const section = course.sections.find((s) => s.id === sectionId);
      if (section) {
        itemsSnapshotBySection = {
          ...itemsSnapshotBySection,
          [sectionId]: section.items.map((i) => ({ ...i })),
        };
      }
    }
    // Update local items.
    course.sections = course.sections.map((s) =>
      s.id === sectionId ? { ...s, items: e.detail.items } : s,
    );
  };

  const onItemsFinalize = (sectionId) => async (e) => {
    const newItems = e.detail.items;
    course.sections = course.sections.map((s) =>
      s.id === sectionId ? { ...s, items: newItems } : s,
    );

    if (e.detail.info.source !== SOURCES.POINTER) {
      itemsSnapshotBySection = {
        ...itemsSnapshotBySection,
        [sectionId]: undefined,
      };
      return;
    }

    const snapshot = itemsSnapshotBySection[sectionId];
    itemsSnapshotBySection = {
      ...itemsSnapshotBySection,
      [sectionId]: undefined,
    };
    if (!snapshot) return;

    const move = findMoveIndices(snapshot, newItems, "id");
    if (!move || move.startIndex === move.endIndex) return;

    if (reorderingItemsIn[sectionId]) return;
    reorderingItemsIn = { ...reorderingItemsIn, [sectionId]: true };
    try {
      await reorderItemsInSection(
        course.slug,
        sectionId,
        move.startIndex,
        move.endIndex,
      );
      pushToast("Đã cập nhật thứ tự nội dung.", { variant: "success" });
    } catch (err) {
      console.error("Error reordering items:", err);
      // Rollback.
      course.sections = course.sections.map((s) =>
        s.id === sectionId ? { ...s, items: snapshot } : s,
      );
      pushToast(
        err?.response?.data?.message ||
          "Không lưu được thứ tự nội dung. Đã hoàn tác.",
        { variant: "error" },
      );
    } finally {
      reorderingItemsIn = { ...reorderingItemsIn, [sectionId]: false };
    }
  };

  const showLessonTypeDialog = async (sectionIndex) => {
    currentSectionIndex = sectionIndex;
    showLessonModal = true;
    selectedLessonType = null;
    newLessonName = "";
  };

  const handleLessonTypeSelect = (type) => {
    selectedLessonType = type;
  };

  const handleCreateLesson = async () => {
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

    // Lấy name/visible từ item.itemData (BE đã populate sẵn).
    // Chỉ gọi getItem cho item thiếu data (hiếm — VD course mới thêm item,
    // BE chưa refetch).
    const nameEntries = [];
    const visEntries = [];
    const missingEntries = [];

    for (const section of course.sections) {
      for (const item of section.items || []) {
        const id = item.itemId;
        if (!id) continue;
        const doc = item.itemData;
        if (doc && typeof doc === "object" && doc.name) {
          nameEntries.push([id, doc.name]);
          visEntries.push([id, doc.visible !== false]);
        } else if (!itemNames[id]) {
          missingEntries.push([id, item.itemType]);
        }
      }
    }

    try {
      if (missingEntries.length) {
        const resolved = await Promise.all(
          missingEntries.map(async ([id, type]) => {
            try {
              const data = await getItem(type, id);
              return [id, data];
            } catch {
              return [id, null];
            }
          }),
        );
        for (const [id, data] of resolved) {
          nameEntries.push([id, data?.name ?? "Nội dung"]);
          visEntries.push([id, data?.visible !== false]);
        }
      }

      itemNames = { ...itemNames, ...Object.fromEntries(nameEntries) };
      itemVisible = { ...itemVisible, ...Object.fromEntries(visEntries) };

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
    const ok = await uiConfirm({
      title: "Xóa chương",
      message: `Bạn có chắc chắn muốn xóa chương "${section.name}"?`,
      confirmLabel: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteSection(course.slug, section._id);
      course = await fetchCourseBySlug(course.slug);
      setStatus("Đã xóa chương.", "success");
      pushToast("Đã xóa chương.", { variant: "success" });
    } catch (error) {
      console.error("Error deleting section:", error);
      setStatus("Không thể xóa chương.", "error");
      pushToast("Không xóa được chương.", { variant: "error" });
    }
  };

  const addLesson = (sectionIndex) => {
    showLessonTypeDialog(sectionIndex);
    dispatch("lessonAdded");
  };

  const handleDeleteItem = async (sectionId, item) => {
    const itemName = itemNames[item.itemId] || "mục nội dung";
    const ok = await uiConfirm({
      title: "Xóa nội dung",
      message: `Bạn có chắc chắn muốn xóa "${itemName}"?`,
      confirmLabel: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteItem(course.slug, sectionId, item.itemId);
      course = await fetchCourseBySlug(course.slug);
      setStatus("Đã xóa mục nội dung.", "success");
      pushToast("Đã xóa nội dung.", { variant: "success" });
    } catch (error) {
      console.error("Error deleting item:", error);
      setStatus("Không thể xóa mục nội dung.", "error");
      pushToast("Không xóa được nội dung.", { variant: "error" });
    }
  };

  const handleSelectLesson = (item) => {
    dispatch("selectLesson", item);
  };

  const handleToggleItemVisibility = async (item) => {
    try {
      await toggleLessonVisibility(item.itemType, item.itemId);
      const wasVisible = itemVisible[item.itemId] !== false;
      itemVisible = { ...itemVisible, [item.itemId]: !wasVisible };
      setStatus(
        !wasVisible ? "Bài học đã hiển thị trở lại." : "Bài học đã được ẩn.",
        "success",
      );
    } catch (error) {
      console.error("Error toggling lesson visibility:", error);
      setStatus("Không thể thay đổi trạng thái hiển thị.", "error");
    }
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

  <div
    class="sections-dnd"
    use:dndzone={{
      items: course.sections || [],
      flipDurationMs: FLIP_MS,
      type: "section",
      dragDisabled: isReorderingSections || !!editingSectionId,
      dropTargetStyle: {},
    }}
    on:consider={onSectionsConsider}
    on:finalize={onSectionsFinalize}
  >
    {#each course.sections as section, sectionIndex (section.id)}
      <article
        class="section"
        data-index={sectionIndex}
        animate:flip={{ duration: FLIP_MS }}
      >
        <div class="section-head">
          <span
            class="drag-handle"
            aria-label="Kéo để sắp xếp lại chương"
            title="Kéo để sắp xếp"
          >
            <i class="bi bi-grip-vertical" aria-hidden="true"></i>
          </span>
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

        <ul
          class="item-list"
          use:dndzone={{
            items: section.items || [],
            flipDurationMs: FLIP_MS,
            type: `items-${section.id}`,
            dragDisabled: !!reorderingItemsIn[section.id],
            dropTargetStyle: {},
          }}
          on:consider={onItemsConsider(section.id)}
          on:finalize={onItemsFinalize(section.id)}
        >
          {#each section.items as item (item.id)}
            <li
              class:item-hidden={itemVisible[item.itemId] === false}
              animate:flip={{ duration: FLIP_MS }}
            >
              <span
                class="drag-handle item-drag-handle"
                aria-label="Kéo để sắp xếp"
                title="Kéo để sắp xếp"
              >
                <i class="bi bi-grip-vertical" aria-hidden="true"></i>
              </span>
              <button
                type="button"
                class="item"
                on:click={() => handleSelectLesson(item)}
              >
                <span>
                  {itemNames[item.itemId] || "Đang tải..."}
                  {#if itemVisible[item.itemId] === false}
                    <span class="hidden-tag">ẩn</span>
                  {/if}
                </span>
                <small
                  >{item.itemType === "lesson" ? "Bài học" : "Bài tập"}</small
                >
              </button>

              <button
                type="button"
                class="item-vis-btn {itemVisible[item.itemId] === false
                  ? 'is-hidden'
                  : ''}"
                title={itemVisible[item.itemId] === false
                  ? "Đang ẩn – Nhấn để hiện"
                  : "Đang hiện – Nhấn để ẩn"}
                on:click={() => handleToggleItemVisibility(item)}
              >
                {#if itemVisible[item.itemId] === false}
                  <i class="bi bi-eye-slash"></i>
                {:else}
                  <i class="bi bi-eye"></i>
                {/if}
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
  </div>

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

  /* Drag handle — visual affordance cho drag-drop */
  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    min-width: 20px;
    color: #94a3b8;
    cursor: grab;
    font-size: 1rem;
    transition: color 0.15s;
  }
  .drag-handle:hover {
    color: #2563eb;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .item-drag-handle {
    padding-top: 0.45rem;
  }

  /* Container DnD — highlight khi drop target active */
  .sections-dnd,
  .item-list {
    list-style: none;
  }
  :global(.sections-dnd.dragged-over),
  :global(.item-list.dragged-over) {
    background: rgba(37, 99, 235, 0.04);
    border-radius: 10px;
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

  .item-vis-btn {
    background: none;
    border: 1px solid #d7e4ff;
    border-radius: 8px;
    padding: 0.3rem 0.45rem;
    color: #4e6592;
    cursor: pointer;
    font-size: 0.85rem;
    transition:
      background 0.15s,
      color 0.15s;
    flex-shrink: 0;
  }

  .item-vis-btn:hover {
    background: #edf4ff;
    color: #1a4fa3;
  }

  .item-vis-btn.is-hidden {
    border-color: #fca5a5;
    color: #991b1b;
    background: #fff5f5;
  }

  .item-vis-btn.is-hidden:hover {
    background: #ffe4e4;
  }

  .hidden-tag {
    font-size: 0.68rem;
    background: #f3f4f6;
    color: #6b7280;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 4px;
    font-weight: 600;
    text-transform: uppercase;
  }

  :global(.item-list li.item-hidden .item) {
    opacity: 0.6;
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
