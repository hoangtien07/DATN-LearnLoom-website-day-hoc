<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";
  import { updateUser } from "$lib/js/api";
  let loading = true;
  let editMode = false;
  let isSaving = false;
  let statusMessage = "";
  let statusType = "";

  let formData = {
    username: "",
    thumbnail: "",
    email: "",
    bio: "",
    phone: "",
    birthday: "",
    facebookUrl: "",
    instaUrl: "",
    youtubeUrl: "",
    websiteUrl: "",
  };

  const mapUserToForm = (currentUser) => ({
    username: currentUser?.username || "",
    thumbnail: currentUser?.thumbnail || "",
    email: currentUser?.email || "",
    bio: currentUser?.bio || "",
    phone: currentUser?.phone || "",
    birthday: currentUser?.birthday
      ? String(currentUser.birthday).slice(0, 10)
      : "",
    facebookUrl: currentUser?.facebookUrl || "",
    instaUrl: currentUser?.instaUrl || "",
    youtubeUrl: currentUser?.youtubeUrl || "",
    websiteUrl: currentUser?.websiteUrl || "",
  });

  onMount(async () => {
    try {
      const currentUser = await fetchUser();
      formData = mapUserToForm(currentUser);
    } finally {
      loading = false;
    }
  });

  $: if ($user && !editMode) {
    formData = mapUserToForm($user);
  }

  const handleEdit = () => {
    editMode = true;
    statusMessage = "";
    statusType = "";
    formData = mapUserToForm($user);
  };

  const handleCancel = () => {
    editMode = false;
    statusMessage = "";
    statusType = "";
    formData = mapUserToForm($user);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!$user?._id) return;

    isSaving = true;
    statusMessage = "Đang lưu thay đổi...";
    statusType = "";

    try {
      const payload = {
        ...$user,
        ...formData,
      };
      await updateUser($user._id, payload);
      await fetchUser();
      editMode = false;
      statusMessage = "Đã cập nhật thông tin cá nhân thành công.";
      statusType = "success";
    } catch (error) {
      console.error("Lỗi khi cập nhật profile:", error);
      statusMessage = "Không thể lưu thay đổi. Vui lòng thử lại.";
      statusType = "error";
    } finally {
      isSaving = false;
    }
  };

  const formatDate = (value) => {
    if (!value) return "Chưa cập nhật";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Chưa cập nhật";
    return parsed.toLocaleDateString("vi-VN");
  };

  $: profileLinks = [
    { label: "Facebook", value: $user?.facebookUrl },
    { label: "Instagram", value: $user?.instaUrl },
    { label: "YouTube", value: $user?.youtubeUrl },
    { label: "Website", value: $user?.websiteUrl },
  ];
</script>

{#if loading}
  <section class="profile-shell">
    <div class="profile-empty">Đang tải thông tin cá nhân...</div>
  </section>
{:else if $user}
  <section class="profile-shell">
    <div class="profile-hero">
      <h1>Thông tin cá nhân</h1>
      <p>
        Quản lý hồ sơ, thông tin liên hệ và kênh mạng xã hội của bạn tại một nơi
        duy nhất.
      </p>
    </div>

    {#if statusMessage}
      <p class={`profile-status ${statusType}`}>{statusMessage}</p>
    {/if}

    {#if editMode}
      <form class="profile-card" on:submit|preventDefault={handleSubmit}>
        <div class="profile-form-grid">
          <label class="profile-field" for="username">
            <span>Tên người dùng</span>
            <input
              id="username"
              type="text"
              bind:value={formData.username}
              required
            />
          </label>

          <label class="profile-field" for="email">
            <span>Email</span>
            <input
              id="email"
              type="email"
              bind:value={formData.email}
              required
            />
          </label>

          <label class="profile-field full" for="thumbnail">
            <span>Ảnh đại diện (URL)</span>
            <input
              id="thumbnail"
              type="url"
              bind:value={formData.thumbnail}
              required
            />
          </label>

          <label class="profile-field full" for="bio">
            <span>Bio</span>
            <textarea id="bio" rows="4" bind:value={formData.bio}></textarea>
          </label>

          <label class="profile-field" for="phone">
            <span>Số điện thoại</span>
            <input id="phone" type="tel" bind:value={formData.phone} />
          </label>

          <label class="profile-field" for="birthday">
            <span>Ngày sinh</span>
            <input id="birthday" type="date" bind:value={formData.birthday} />
          </label>

          <label class="profile-field" for="facebookUrl">
            <span>Facebook URL</span>
            <input
              id="facebookUrl"
              type="url"
              bind:value={formData.facebookUrl}
            />
          </label>

          <label class="profile-field" for="instaUrl">
            <span>Instagram URL</span>
            <input id="instaUrl" type="url" bind:value={formData.instaUrl} />
          </label>

          <label class="profile-field" for="youtubeUrl">
            <span>YouTube URL</span>
            <input
              id="youtubeUrl"
              type="url"
              bind:value={formData.youtubeUrl}
            />
          </label>

          <label class="profile-field" for="websiteUrl">
            <span>Website URL</span>
            <input
              id="websiteUrl"
              type="url"
              bind:value={formData.websiteUrl}
            />
          </label>
        </div>

        <div class="profile-actions">
          <button type="button" class="secondary" on:click={handleCancel}
            >Hủy</button
          >
          <button type="submit" class="primary" disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    {:else}
      <div class="profile-grid">
        <article class="profile-card">
          <div class="profile-avatar-wrap">
            {#if $user.thumbnail}
              <img
                src={$user.thumbnail}
                alt={$user.username}
                class="profile-avatar"
              />
            {:else}
              <div class="profile-avatar-fallback">
                {$user.username?.slice(0, 1)?.toUpperCase() || "U"}
              </div>
            {/if}
          </div>

          <h2>{$user.username}</h2>
          <p class="profile-sub">{$user.email}</p>
          <p class="profile-role">{$user.role}</p>

          <button class="primary" on:click={handleEdit}
            >Chỉnh sửa thông tin</button
          >
        </article>

        <article class="profile-card">
          <div class="profile-detail-list">
            <p><strong>Bio:</strong> {$user.bio || "Chưa cập nhật"}</p>
            <p>
              <strong>Số điện thoại:</strong>
              {$user.phone || "Chưa cập nhật"}
            </p>
            <p><strong>Ngày sinh:</strong> {formatDate($user.birthday)}</p>
          </div>

          <div class="profile-links">
            <h3>Liên kết cá nhân</h3>
            <ul>
              {#each profileLinks as link}
                <li>
                  <strong>{link.label}:</strong>
                  {#if link.value}
                    <a
                      href={link.value}
                      target="_blank"
                      rel="noopener noreferrer">{link.value}</a
                    >
                  {:else}
                    <span>Chưa cập nhật</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </article>
      </div>
    {/if}
  </section>
{:else}
  <section class="profile-shell">
    <div class="profile-empty">Bạn không có quyền truy cập trang này.</div>
  </section>
{/if}

<style>
  .profile-shell {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0.5rem 0 2rem;
    color: #12233f;
  }

  .profile-hero {
    border-radius: 20px;
    padding: 1.2rem 1.3rem;
    background: linear-gradient(150deg, #0a2e76 0%, #1f6fff 100%);
    color: #fff;
    margin-bottom: 1rem;
  }

  .profile-hero h1 {
    margin: 0 0 0.25rem;
    font-size: clamp(1.4rem, 2.6vw, 2rem);
  }

  .profile-hero p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
  }

  .profile-status {
    margin: 0 0 0.8rem;
    padding: 0.6rem 0.8rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    background: #eef5ff;
    color: #20407b;
  }

  .profile-status.success {
    background: #e7f7eb;
    color: #1c6a35;
  }

  .profile-status.error {
    background: #fdecec;
    color: #b93838;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.4fr);
    gap: 1rem;
  }

  .profile-card {
    background: #fff;
    border: 1px solid #dbe6fb;
    border-radius: 18px;
    padding: 1rem;
    box-shadow: 0 12px 30px rgba(20, 52, 120, 0.08);
  }

  .profile-avatar-wrap {
    margin-bottom: 0.7rem;
  }

  .profile-avatar,
  .profile-avatar-fallback {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 4px solid #d8e7ff;
  }

  .profile-avatar {
    object-fit: cover;
    display: block;
  }

  .profile-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    color: #3a5689;
    background: #eef4ff;
  }

  .profile-card h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .profile-sub {
    margin: 0.2rem 0;
    color: #4f648d;
  }

  .profile-role {
    display: inline-flex;
    margin: 0.2rem 0 0.9rem;
    padding: 0.22rem 0.66rem;
    border-radius: 999px;
    background: #edf4ff;
    border: 1px solid #d4e2fb;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .profile-detail-list p {
    margin: 0 0 0.48rem;
  }

  .profile-links h3 {
    margin: 0.9rem 0 0.5rem;
    font-size: 1rem;
  }

  .profile-links ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.48rem;
  }

  .profile-links a {
    color: #1e5ec8;
    text-decoration: none;
    word-break: break-all;
  }

  .profile-links a:hover {
    text-decoration: underline;
  }

  .profile-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .profile-field {
    display: grid;
    gap: 0.32rem;
  }

  .profile-field.full {
    grid-column: 1 / -1;
  }

  .profile-field span {
    font-size: 0.84rem;
    font-weight: 700;
    color: #2e4773;
  }

  .profile-field input,
  .profile-field textarea {
    width: 100%;
    border: 1px solid #d7e4fb;
    border-radius: 12px;
    padding: 0.65rem 0.75rem;
    font-size: 0.92rem;
    color: #1a2b4f;
  }

  .profile-field input:focus,
  .profile-field textarea:focus {
    outline: none;
    border-color: #7fa7ff;
    box-shadow: 0 0 0 4px rgba(12, 95, 255, 0.14);
  }

  .profile-actions {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    border-radius: 11px;
    padding: 0.62rem 0.9rem;
    font-size: 0.9rem;
    font-weight: 700;
  }

  button.primary {
    background: linear-gradient(145deg, #0a5bff 0%, #357eff 100%);
    color: #fff;
  }

  button.secondary {
    background: #edf2fb;
    color: #2f4675;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .profile-empty {
    background: #fff;
    border: 1px solid #dbe5f9;
    border-radius: 16px;
    padding: 1rem;
    font-weight: 600;
    color: #38527f;
  }

  @media (max-width: 860px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }

    .profile-form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .profile-shell {
      padding-top: 0.2rem;
    }

    .profile-card {
      padding: 0.85rem;
    }

    .profile-hero {
      padding: 1rem;
    }
  }
</style>
