<script>
  import { onMount } from "svelte";
  import { getUsers, updateUser, deleteUser } from "$lib/js/api";
  import { pushToast } from "$lib/stores/toast.js";
  import { confirm as uiConfirm } from "$lib/stores/confirm.js";
  import {
    Table,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "@sveltestrap/sveltestrap";

  let users = [];
  let searchQuery = "";
  let isEditing = false;
  let isSaving = false;
  let editingUser = null;

  $: filteredUsers = users.filter((account) => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      account.username?.toLowerCase().includes(keyword) ||
      account.email?.toLowerCase().includes(keyword) ||
      account.role?.toLowerCase().includes(keyword)
    );
  });

  $: adminCount = users.filter((account) => account.role === "admin").length;
  $: instructorCount = users.filter(
    (account) => account.role === "instructor",
  ).length;
  $: studentCount = users.filter(
    (account) => account.role === "student",
  ).length;

  onMount(async () => {
    await fetchUsers();
  });

  const fetchUsers = async () => {
    try {
      const result = await getUsers();
      // getUsers trả { data, pagination } sau reshape — unwrap.
      users = Array.isArray(result) ? result : result?.data || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      pushToast("Không tải được danh sách người dùng.", { variant: "error" });
    }
  };

  const handleEditUser = (user) => {
    isEditing = true;
    editingUser = { ...user };
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    try {
      isSaving = true;
      await updateUser(editingUser._id, editingUser);
      pushToast("Đã cập nhật người dùng.", { variant: "success" });
      await fetchUsers();
      isEditing = false;
      editingUser = null;
    } catch (error) {
      console.error("Error updating user:", error);
      pushToast(
        error?.response?.data?.message || "Không cập nhật được người dùng.",
        { variant: "error" },
      );
    } finally {
      isSaving = false;
    }
  };

  const handleDeleteUser = async (userId) => {
    const ok = await uiConfirm({
      title: "Xóa người dùng",
      message: "Bạn có chắc muốn xóa tài khoản này? Hành động không thể hoàn tác.",
      confirmLabel: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteUser(userId);
      pushToast("Đã xóa người dùng.", { variant: "success" });
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      pushToast(
        error?.response?.data?.message || "Không xóa được người dùng.",
        { variant: "error" },
      );
    }
  };
</script>

<section class="admin-shell">
  <div class="admin-hero">
    <h1>Quản lý tài khoản</h1>
    <p>
      Cập nhật hồ sơ người dùng, điều chỉnh vai trò và quản trị vòng đời tài
      khoản trên nền tảng.
    </p>
  </div>

  <div class="admin-stats-grid">
    <article class="admin-stat-card">
      <p class="admin-stat-label">Tổng tài khoản</p>
      <p class="admin-stat-value">{users.length}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Học viên</p>
      <p class="admin-stat-value">{studentCount}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Giảng viên</p>
      <p class="admin-stat-value">{instructorCount}</p>
    </article>
    <article class="admin-stat-card">
      <p class="admin-stat-label">Quản trị viên</p>
      <p class="admin-stat-value">{adminCount}</p>
    </article>
  </div>

  <div class="admin-card">
    <div class="admin-toolbar">
      <div class="toolbar-search">
        <Input
          type="text"
          placeholder="Tìm kiếm username, email hoặc vai trò..."
          bind:value={searchQuery}
        />
      </div>
    </div>

    {#if filteredUsers.length === 0}
      <div class="admin-empty-state">Không có người dùng phù hợp.</div>
    {:else}
      <div class="admin-table-wrap">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>STT</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredUsers as user, index}
              <tr>
                <td>{index + 1}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {#if user.role !== "admin"}
                    <div class="admin-page-actions">
                      <Button
                        color="primary"
                        outline
                        size="sm"
                        on:click={() => handleEditUser(user)}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        color="danger"
                        outline
                        size="sm"
                        on:click={() => handleDeleteUser(user._id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </Table>
      </div>
    {/if}
  </div>
</section>

{#if isEditing}
  <Modal isOpen={isEditing} toggle={() => (isEditing = false)}>
    <ModalHeader toggle={() => (isEditing = false)}
      >Chỉnh sửa người dùng</ModalHeader
    >
    <ModalBody>
      <Form on:submit={handleUpdateUser}>
        <FormGroup>
          <Label for="username">Username:</Label>
          <Input
            type="text"
            id="username"
            bind:value={editingUser.username}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label for="email">Email:</Label>
          <Input
            type="email"
            id="email"
            bind:value={editingUser.email}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label for="role">Role:</Label>
          <Input type="select" id="role" bind:value={editingUser.role}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </Input>
        </FormGroup>
        <ModalFooter>
          <Button type="submit" color="primary" disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          <Button color="secondary" on:click={() => (isEditing = false)}
            >Hủy</Button
          >
        </ModalFooter>
      </Form>
    </ModalBody>
  </Modal>
{/if}

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
