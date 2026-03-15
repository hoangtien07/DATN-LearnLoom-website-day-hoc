<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../stores/auth";

  onMount(() => {
    fetchUser();
  });

  $: admin = $user;
  $: isAdmin = $user && $user.role === "admin";

  const quickLinks = [
    {
      title: "Quản lý khóa học",
      desc: "Tạo khóa học mới, chỉnh sửa nội dung và kiểm soát trạng thái xuất bản.",
      href: "/admin/course-management",
    },
    {
      title: "Quản lý hóa đơn",
      desc: "Theo dõi doanh thu, đơn hàng gần đây và xu hướng thanh toán.",
      href: "/admin/order-management",
    },
    {
      title: "Quản lý tài khoản",
      desc: "Cập nhật vai trò người dùng, chỉnh sửa hồ sơ và dọn dẹp tài khoản.",
      href: "/admin/user-management",
    },
    {
      title: "Quản lý môn học",
      desc: "Quản lý danh mục môn học để tối ưu phân loại và tìm kiếm.",
      href: "/admin/subject-management",
    },
  ];
</script>

{#if isAdmin}
  <section class="admin-shell">
    <div class="admin-hero">
      <h1>Admin Workspace</h1>
      <p>
        Xin chào {admin.username}. Tại đây bạn có thể điều phối khóa học, người
        dùng, hóa đơn và danh mục môn học trên toàn hệ thống LearnLoom.
      </p>
    </div>

    <div class="admin-stats-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Vai trò hiện tại</p>
        <p class="admin-stat-value">Quản trị viên</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Phạm vi kiểm soát</p>
        <p class="admin-stat-value">Toàn hệ thống</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Nhóm chức năng</p>
        <p class="admin-stat-value">4 module</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Trạng thái</p>
        <p class="admin-stat-value">Online</p>
      </article>
    </div>

    <div class="admin-card">
      <h2>Điều hướng nhanh</h2>
      <div class="admin-links-grid">
        {#each quickLinks as link}
          <a class="admin-link-card" href={link.href}>
            <h3>{link.title}</h3>
            <p>{link.desc}</p>
          </a>
        {/each}
      </div>
    </div>
  </section>
{:else}
  <section class="admin-shell">
    <div class="admin-card">
      <h2>Bạn không có quyền truy cập trang quản trị.</h2>
    </div>
  </section>
{/if}

<style>
  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #102247;
    margin-bottom: 0.85rem;
  }
</style>
