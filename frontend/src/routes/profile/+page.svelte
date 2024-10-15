<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";
  import { updateUser } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import {
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Image,
  } from "@sveltestrap/sveltestrap";

  onMount(() => {
    fetchUser();
  });

  $: if (!$user) {
    fetchUser();
  }

  let editMode = false; // Biến kiểm soát chế độ chỉnh sửa

  // Hàm chuyển sang chế độ chỉnh sửa
  const handleEdit = () => {
    editMode = true;
  };

  // Hàm xử lý khi submit form
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateUser($user._id, $user); // Gọi hàm cập nhật profile
      editMode = false; // Thoát chế độ chỉnh sửa
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật profile:", error);
      alert("Đã xảy ra lỗi khi cập nhật thông tin.");
    }
  };
</script>

{#if $user}
  <h1>Thông tin cá nhân</h1>

  {#if editMode}
    <Form on:submit={handleSubmit}>
      <FormGroup>
        <Label for="username">Tên người dùng:</Label>
        <Input type="text" id="username" bind:value={$user.username} required />
      </FormGroup>
      <FormGroup>
        <Label for="thumbnail">Ảnh đại diện:</Label>
        <Input
          type="text"
          id="thumbnail"
          bind:value={$user.thumbnail}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="email">Email:</Label>
        <Input type="email" id="email" bind:value={$user.email} required />
      </FormGroup>
      <FormGroup>
        <Label for="bio">Bio:</Label>
        <Input type="textarea" id="bio" bind:value={$user.bio} />
      </FormGroup>
      <FormGroup>
        <Label for="phone">Số điện thoại:</Label>
        <Input type="tel" id="phone" bind:value={$user.phone} />
      </FormGroup>
      <FormGroup>
        <Label for="birthday">Ngày sinh:</Label>
        <Input type="date" id="birthday" bind:value={$user.birthday} />
      </FormGroup>
      <FormGroup>
        <Label for="facebookUrl">Facebook URL:</Label>
        <Input type="url" id="facebookUrl" bind:value={$user.facebookUrl} />
      </FormGroup>
      <FormGroup>
        <Label for="instaUrl">Instagram URL:</Label>
        <Input type="url" id="instaUrl" bind:value={$user.instaUrl} />
      </FormGroup>
      <FormGroup>
        <Label for="youtubeUrl">YouTube URL:</Label>
        <Input type="url" id="youtubeUrl" bind:value={$user.youtubeUrl} />
      </FormGroup>
      <FormGroup>
        <Label for="websiteUrl">Website URL:</Label>
        <Input type="url" id="websiteUrl" bind:value={$user.websiteUrl} />
      </FormGroup>
      <Button type="submit" color="primary">Lưu thay đổi</Button>
      <Button color="secondary" on:click={() => (editMode = false)}>Hủy</Button>
    </Form>
  {:else}
    <div class="d-flex mt-5">
      <div style="width:20%">
        <Image theme="dark" thumbnail alt="" src={$user.thumbnail} />
      </div>
      <div style="flex:1; font-weight:500">
        <p><b>Name:</b> {$user.username}</p>
        <p><b>Email:</b> {$user.email}</p>
        <p><b>Role:</b> {$user.role}</p>
        {#if $user.bio}
          <p><b>Bio:</b> {$user.bio}</p>
        {/if}
        {#if $user.phone}
          <p><b>Phone:</b> {$user.phone}</p>
        {/if}
        {#if $user.birthday}
          <p><b>Birthday:</b> {$user.birthday}</p>
        {/if}
        {#if $user.facebookUrl}
          <p>
            <b>Facebook:</b>
            <a href={$user.facebookUrl} target="_blank">{$user.facebookUrl}</a>
          </p>
        {/if}
        {#if $user.instaUrl}
          <p>
            <b>Instagram:</b>
            <a href={$user.instaUrl} target="_blank">{$user.instaUrl}</a>
          </p>
        {/if}
        {#if $user.youtubeUrl}
          <p>
            <b>YouTube:</b>
            <a href={$user.youtubeUrl} target="_blank">{$user.youtubeUrl}</a>
          </p>
        {/if}
        {#if $user.websiteUrl}
          <p>
            <b>Website:</b>
            <a href={$user.websiteUrl} target="_blank">{$user.websiteUrl}</a>
          </p>
        {/if}
      </div>
    </div>
    <Button color="primary" on:click={handleEdit}>Chỉnh sửa thông tin</Button>
  {/if}
{:else}
  <h2>You do not have permission to access this page.</h2>
{/if}

<style>
  p {
    margin: 8px 0;
  }
</style>
