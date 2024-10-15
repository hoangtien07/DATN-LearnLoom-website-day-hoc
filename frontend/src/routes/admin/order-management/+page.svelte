<script>
  import { onMount } from "svelte";
  import { getOrder } from "$lib/js/api";
  import { user } from "../../../stores/auth";
  import { Table } from "@sveltestrap/sveltestrap";

  let orders = [];
  let totalEarnings = 0;
  let earningsThisMonth = 0;

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
  <h2>Thống kê Tài chính</h2>

  <div class="financial-summary">
    <div class="summary-item">
      <h3>Tổng thu nhập</h3>
      <p>{totalEarnings.toLocaleString()} VND</p>
    </div>
    <div class="summary-item">
      <h3>Thu nhập tháng này</h3>
      <p>{earningsThisMonth.toLocaleString()} VND</p>
    </div>
  </div>

  <h2>Hóa đơn</h2>

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
{:else}
  <h2>Bạn không có quyền truy cập trang này.</h2>
{/if}

<style>
  .financial-summary {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }

  .summary-item {
    border: 1px solid #ccc;
    padding: 15px;
    border-radius: 5px;
    flex: 1;
  }
</style>
