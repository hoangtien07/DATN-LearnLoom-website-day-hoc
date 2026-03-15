<script>
  import { onMount } from "svelte";
  import {
    getSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  } from "$lib/js/api";
  import { Table, Button, Input } from "@sveltestrap/sveltestrap";

  let subjects = [];
  let newName = "";
  let searchQuery = "";
  let isEditing = false;
  let editingSubjectId = null;

  $: filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  onMount(async () => {
    await fetchSubjects();
  });

  const fetchSubjects = async () => {
    try {
      subjects = await getSubjects();
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const handleCreateSubject = async () => {
    if (newName.trim() === "") return;

    try {
      await createSubject({ name: newName });
      await fetchSubjects();
      newName = "";
    } catch (error) {
      console.error("Error creating subject:", error);
      // Xử lý lỗi, ví dụ: hiển thị thông báo lỗi
    }
  };

  const handleEditSubject = (subject) => {
    isEditing = true;
    editingSubjectId = subject._id;
    newName = subject.name;
  };

  const handleUpdateSubject = async () => {
    if (newName.trim() === "") return;

    try {
      await updateSubject(editingSubjectId, { name: newName });
      await fetchSubjects();
      isEditing = false;
      editingSubjectId = null;
      newName = "";
    } catch (error) {
      console.error("Error updating subject:", error);
      // Xử lý lỗi, ví dụ: hiển thị thông báo lỗi
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (confirm("Bạn có chắc chắn muốn xóa môn học này?")) {
      try {
        await deleteSubject(subjectId);
        await fetchSubjects();
      } catch (error) {
        console.error("Error deleting subject:", error);
        // Xử lý lỗi, ví dụ: hiển thị thông báo lỗi
      }
    }
  };
</script>

<section class="admin-shell">
  <div class="admin-hero">
    <h1>Quản lý môn học</h1>
    <p>
      Chuẩn hóa danh mục môn học để nâng cao trải nghiệm tìm kiếm và phân loại
      khóa học trong hệ thống.
    </p>
  </div>

  <div class="admin-stats-grid">
    <article class="admin-stat-card">
      <p class="admin-stat-label">Tổng môn học</p>
      <p class="admin-stat-value">{subjects.length}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Kết quả tìm kiếm</p>
      <p class="admin-stat-value">{filteredSubjects.length}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Trạng thái chỉnh sửa</p>
      <p class="admin-stat-value">{isEditing ? "Đang sửa" : "Sẵn sàng"}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Hành động</p>
      <p class="admin-stat-value">CRUD</p>
    </article>
  </div>

  <div class="admin-card">
    <div class="subject-creator">
      <Input type="text" bind:value={newName} placeholder="Tên môn học" />
      {#if isEditing}
        <Button on:click={handleUpdateSubject} color="warning">Cập nhật</Button>
      {:else}
        <Button on:click={handleCreateSubject} color="success">Tạo mới</Button>
      {/if}
    </div>

    <div class="admin-toolbar">
      <div class="toolbar-search">
        <Input
          type="text"
          bind:value={searchQuery}
          placeholder="Tìm môn học..."
        />
      </div>
    </div>

    {#if filteredSubjects.length === 0}
      <div class="admin-empty-state">Không có môn học phù hợp.</div>
    {:else}
      <div class="admin-table-wrap">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên môn học</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredSubjects as subject, index}
              <tr>
                <td>{index + 1}</td>
                <td>{subject.name}</td>
                <td>
                  <div class="admin-page-actions">
                    <Button
                      on:click={() => handleEditSubject(subject)}
                      color="primary"
                      outline
                      size="sm"
                    >
                      Sửa
                    </Button>
                    <Button
                      on:click={() => handleDeleteSubject(subject._id)}
                      color="danger"
                      outline
                      size="sm"
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
    {/if}
  </div>
</section>

<style>
  .subject-creator {
    display: flex;
    gap: 0.7rem;
    margin-bottom: 0.9rem;
    flex-wrap: wrap;
  }

  .subject-creator :global(.form-control) {
    flex: 1;
    min-width: 200px;
  }

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
