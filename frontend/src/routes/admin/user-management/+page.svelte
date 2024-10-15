<script>
  import { onMount } from "svelte";
  import { getUsers, updateUser, deleteUser } from "$lib/js/api";
  import { goto } from "$app/navigation";
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
  let isEditing = false;
  let editingUser = null;

  onMount(async () => {
    await fetchUsers();
  });

  const fetchUsers = async () => {
    try {
      users = await getUsers();
    } catch (error) {
      console.error("Error fetching users:", error);
      // Handle error, e.g., display an error message
    }
  };

  const handleEditUser = (user) => {
    isEditing = true;
    editingUser = { ...user }; // Create a copy to avoid modifying the original
  };

  const handleUpdateUser = async (event) => {
    // Add event parameter
    event.preventDefault(); // Call preventDefault inside the function

    try {
      await updateUser(editingUser._id, editingUser);
      await fetchUsers(); // Refresh the user list
      isEditing = false;
      editingUser = null;
    } catch (error) {
      console.error("Error updating user:", error);
      // Handle error, e.g., display an error message
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(userId);
        await fetchUsers(); // Refresh the user list
      } catch (error) {
        console.error("Error deleting user:", error);
        // Handle error, e.g., display an error message
      }
    }
  };
</script>

<h1>Quản lý tài khoản</h1>

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
          <Button type="submit" color="primary">Lưu thay đổi</Button>
          <Button color="secondary" on:click={() => (isEditing = false)}
            >Hủy</Button
          >
        </ModalFooter>
      </Form>
    </ModalBody>
  </Modal>
{/if}

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
    {#each users as user, index}
      <tr>
        <td>{index + 1}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>{user.role}</td>
        <td>
          {#if user.role !== "admin"}
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
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</Table>
