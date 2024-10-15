<script>
  import { onMount } from "svelte";
  import { getOrdersByTeacher } from "$lib/js/api";
  import { user } from "../../../stores/auth";
  import { Table } from "@sveltestrap/sveltestrap";

  let orders = [];
  let totalEarnings = 0;
  let earningsThisMonth = 0;
  let loading = true;

  // Sắp xếp hóa đơn theo ngày tạo giảm dần (mới nhất lên đầu)
  $: sortedOrders = orders.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  onMount(async () => {
    if ($user && $user.role === "instructor") {
      try {
        orders = await getOrdersByTeacher($user._id);

        // Tính toán tổng thu nhập
        totalEarnings = orders.reduce((sum, order) => sum + order.amount, 0);

        // Tính toán thu nhập tháng này
        const currentMonth = new Date().getMonth();
        earningsThisMonth = orders.reduce((sum, order) => {
          const orderDate = new Date(order.createdAt);
          if (orderDate.getMonth() === currentMonth) {
            return sum + order.amount;
          }
          return sum;
        }, 0);
      } catch (error) {
        console.error("Error fetching earnings data:", error);
      } finally {
        loading = false;
      }
    }
  });
</script>

{#if $user && $user.role === "instructor"}
  <h2>Thống kê Thu nhập</h2>

  {#if loading}
    <p>Đang tải dữ liệu...</p>
  {:else}
    <div class="earnings-summary">
      <div class="summary-item">
        <h3>Tổng thu nhập</h3>
        <p>{totalEarnings.toLocaleString()} VND</p>
      </div>
      <div class="summary-item">
        <h3>Thu nhập tháng này</h3>
        <p>{earningsThisMonth.toLocaleString()} VND</p>
      </div>
    </div>

    <h3>Chi tiết Hóa đơn</h3>
    {#if sortedOrders.length > 0}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>STT</th>
            <th>ID Hóa đơn</th>
            <th>Khóa học</th>
            <th>Ngày mua</th>
            <th>Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedOrders as order, index}
            <tr>
              <td>{index + 1}</td>
              <td>{order._id}</td>
              <td>{order.courseName}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>{order.amount.toLocaleString()} VND</td>
            </tr>
          {/each}
        </tbody>
      </Table>
    {:else}
      <p>Chưa có hóa đơn nào.</p>
    {/if}
  {/if}
{:else}
  <p>Bạn không có quyền truy cập vào trang này.</p>
{/if}

<style>
  .earnings-summary {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }

  .summary-item {
    border: 1px solid #ccc;
    padding: 20px;
    border-radius: 5px;
    flex: 1;
    text-align: center;
  }

  h3 {
    margin-bottom: 10px;
  }
</style>
