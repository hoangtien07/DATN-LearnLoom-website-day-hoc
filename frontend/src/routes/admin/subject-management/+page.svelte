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
  let isEditing = false;
  let editingSubjectId = null;

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

<h1>Quản lý môn học</h1>

<div class="mb-3">
  <Input type="text" bind:value={newName} placeholder="Tên môn học" />
  {#if isEditing}
    <Button on:click={handleUpdateSubject} color="warning" class="ms-2"
      >Cập nhật</Button
    >
  {:else}
    <Button on:click={handleCreateSubject} color="success" class="ms-2"
      >Tạo mới</Button
    >
  {/if}
</div>

<Table striped bordered hover responsive>
  <thead>
    <tr>
      <th>STT</th>
      <th>Tên môn học</th>
      <th>Hành động</th>
    </tr>
  </thead>
  <tbody>
    {#each subjects as subject, index}
      <tr>
        <td>{index + 1}</td>
        <td>{subject.name}</td>
        <td>
          <Button
            on:click={() => handleEditSubject(subject)}
            color="primary"
            outline
            size="sm"
            class="me-2">Sửa</Button
          >
          <Button
            on:click={() => handleDeleteSubject(subject._id)}
            color="danger"
            outline
            size="sm">Xóa</Button
          >
        </td>
      </tr>
    {/each}
  </tbody>
</Table>
