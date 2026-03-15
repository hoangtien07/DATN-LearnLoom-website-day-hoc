<script>
  import { onMount } from "svelte";
  import { getOrder } from "$lib/js/api";
  import { user } from "../../../stores/auth";
  import { Table } from "@sveltestrap/sveltestrap";

  let orders = [];
  let totalEarnings = 0;
  let earningsThisMonth = 0;
  $: orderCount = orders.length;
  $: averageOrderValue = orderCount
    ? Math.round(totalEarnings / orderCount)
    : 0;

  onMount(async () => {
    if ($user && ($user.role === "instructor" || $user.role === "admin")) {
      orders = await getOrder();

      // Sắp xếp hóa đơn theo ngày tạo giảm dần (mới nhất lên đầu)
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Tính toán tổng thu nhập
      totalEarnings = orders.reduce((sum, order) => sum + order.amount, 0);

      // Tính toán thu nhập tháng này (giả sử đơn giản là tháng hiện tại)
      const currentMonth = new Date().getMonth();
      earningsThisMonth = orders.reduce((sum, order) => {
        const orderDate = new Date(order.createdAt);
        if (orderDate.getMonth() === currentMonth) {
          return sum + order.amount;
        }
        return sum;
      }, 0);
    }
  });
</script>

{#if $user && ($user.role === "instructor" || $user.role === "admin")}
  <section class="admin-shell">
    <div class="admin-hero">
      <h1>Quản lý hóa đơn</h1>
      <p>
        Theo dõi doanh thu toàn hệ thống, kiểm tra lịch sử đơn hàng và đối soát
        thanh toán theo thời gian thực.
      </p>
    </div>

    <div class="admin-stats-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Tổng đơn hàng</p>
        <p class="admin-stat-value">{orderCount}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Tổng doanh thu</p>
        <p class="admin-stat-value">{totalEarnings.toLocaleString()} VND</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Doanh thu tháng này</p>
        <p class="admin-stat-value">{earningsThisMonth.toLocaleString()} VND</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Giá trị đơn trung bình</p>
        <p class="admin-stat-value">{averageOrderValue.toLocaleString()} VND</p>
      </article>
    </div>

    <div class="admin-card">
      <h2 class="table-title">Lịch sử hóa đơn</h2>
      {#if orders.length === 0}
        <div class="admin-empty-state">Chưa có hóa đơn nào.</div>
      {:else}
        <div class="admin-table-wrap">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>STT</th>
                <th>ID</th>
                <th>Khóa học</th>
                <th>Học viên</th>
                <th>Ngày mua</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {#each orders as order, index}
                <tr>
                  <td>{index + 1}</td>
                  <td>{order._id}</td>
                  <td>{order.courseName}</td>
                  <td>{order.userId}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>{order.amount.toLocaleString()} VND</td>
                </tr>
              {/each}
            </tbody>
          </Table>
        </div>
      {/if}
    </div>
  </section>
{:else}
  <section class="admin-shell">
    <div class="admin-card">
      <h2>Bạn không có quyền truy cập trang này.</h2>
    </div>
  </section>
{/if}

<style>
  .table-title {
    font-size: 1.06rem;
    font-weight: 700;
    color: #102247;
    margin-bottom: 0.9rem;
  }
</style>
