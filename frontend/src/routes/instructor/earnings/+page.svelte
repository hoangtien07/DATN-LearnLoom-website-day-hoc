<script>
  import { onMount } from "svelte";
  import { getOrdersByTeacher } from "$lib/js/api";
  import { fetchUser, user } from "../../../stores/auth";
  import InstructorWorkspaceNav from "../InstructorWorkspaceNav.svelte";

  let orders = [];
  let totalEarnings = 0;
  let earningsThisMonth = 0;
  let loading = true;
  let selectedMonth = "all";
  let searchQuery = "";

  // Sắp xếp hóa đơn theo ngày tạo giảm dần (mới nhất lên đầu)
  $: sortedOrders = orders.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  onMount(async () => {
    try {
      const currentUser = await fetchUser();
      if (currentUser && currentUser.role === "instructor") {
        orders = await getOrdersByTeacher(currentUser._id);

        totalEarnings = orders.reduce((sum, order) => sum + order.amount, 0);

        const currentMonth = new Date().getMonth();
        earningsThisMonth = orders.reduce((sum, order) => {
          const orderDate = new Date(order.createdAt);
          if (orderDate.getMonth() === currentMonth) {
            return sum + order.amount;
          }
          return sum;
        }, 0);
      }
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      loading = false;
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  $: invoiceCount = sortedOrders.length;
  $: averageInvoiceValue = invoiceCount > 0 ? totalEarnings / invoiceCount : 0;

  $: monthOptions = [
    ...new Set(sortedOrders.map((order) => order.createdAt.slice(0, 7))),
  ];

  $: filteredOrders = sortedOrders.filter((order) => {
    const normalizedCourse = (order.courseName || "").toLowerCase();
    const normalizedId = (order._id || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const byQuery =
      !query ||
      normalizedCourse.includes(query) ||
      normalizedId.includes(query);
    const byMonth =
      selectedMonth === "all" || order.createdAt.slice(0, 7) === selectedMonth;
    return byQuery && byMonth;
  });

  $: filteredTotal = filteredOrders.reduce(
    (sum, order) => sum + (order.amount || 0),
    0,
  );
  $: filteredAverage =
    filteredOrders.length > 0 ? filteredTotal / filteredOrders.length : 0;

  const escapeCSV = (value) => {
    const safe = String(value ?? "").replace(/"/g, '""');
    return `"${safe}"`;
  };

  const downloadFilteredCSV = () => {
    if (filteredOrders.length === 0) return;

    const header = ["STT", "Order ID", "Course Name", "Amount", "Created At"];
    const rows = filteredOrders.map((order, index) => [
      index + 1,
      order._id,
      order.courseName || "N/A",
      order.amount || 0,
      new Date(order.createdAt).toISOString(),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCSV(cell)).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = selectedMonth === "all" ? "all" : selectedMonth;
    link.href = url;
    link.download = `earnings-${suffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
</script>

{#if $user && $user.role === "instructor"}
  <section class="instructor-shell">
    <div class="instructor-hero">
      <h1>Earnings</h1>
      <p>
        Theo dõi doanh thu toàn bộ khóa học, đối chiếu giao dịch mới nhất và nắm
        nhanh hiệu suất trong tháng hiện tại.
      </p>
      <div class="instructor-hero-meta">
        <span class="instructor-hero-chip"
          >Tổng doanh thu {formatCurrency(totalEarnings)}</span
        >
        <span class="instructor-hero-chip"
          >Tháng này {formatCurrency(earningsThisMonth)}</span
        >
        <span class="instructor-hero-chip"
          >{invoiceCount} hóa đơn đã ghi nhận</span
        >
      </div>
    </div>

    <InstructorWorkspaceNav />

    <div class="admin-stats-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Tổng doanh thu</p>
        <p class="admin-stat-value">{formatCurrency(totalEarnings)}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Doanh thu tháng này</p>
        <p class="admin-stat-value">{formatCurrency(earningsThisMonth)}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Số lượng hóa đơn</p>
        <p class="admin-stat-value">{invoiceCount}</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Giá trị trung bình</p>
        <p class="admin-stat-value">{formatCurrency(averageInvoiceValue)}</p>
      </article>
    </div>

    <section class="instructor-surface-wrap">
      <div class="course-edit-toolbar">
        <div>
          <p class="instructor-kicker">Dòng tiền</p>
          <h2 class="course-edit-section-title">Chi tiết hóa đơn</h2>
          <p class="course-edit-section-subtitle">
            Tất cả giao dịch được sắp xếp từ mới nhất đến cũ nhất để thuận tiện
            đối soát.
          </p>
        </div>
      </div>

      <div class="instructor-form-grid">
        <div class="instructor-form-field">
          <label for="invoiceMonthFilter">Lọc theo tháng</label>
          <select
            id="invoiceMonthFilter"
            class="instructor-select"
            bind:value={selectedMonth}
          >
            <option value="all">Tất cả tháng</option>
            {#each monthOptions as month}
              <option value={month}>{month}</option>
            {/each}
          </select>
        </div>

        <div class="instructor-form-field">
          <label for="invoiceSearch">Tìm theo mã đơn hoặc tên khóa học</label>
          <input
            id="invoiceSearch"
            class="instructor-input"
            type="text"
            bind:value={searchQuery}
            placeholder="Nhập từ khóa tìm kiếm"
          />
        </div>
      </div>

      <div class="instructor-inline-stats">
        <span class="instructor-inline-stat"
          >Kết quả lọc: {filteredOrders.length} hóa đơn</span
        >
        <span class="instructor-inline-stat"
          >Doanh thu lọc: {formatCurrency(filteredTotal)}</span
        >
        <span class="instructor-inline-stat"
          >Giá trị TB lọc: {formatCurrency(filteredAverage)}</span
        >
      </div>

      <div class="instructor-report-actions">
        <button
          class="course-edit-btn outline"
          on:click={downloadFilteredCSV}
          disabled={filteredOrders.length === 0}
        >
          Xuất CSV theo bộ lọc
        </button>
      </div>

      {#if loading}
        <div class="admin-empty-state">Đang tải dữ liệu doanh thu...</div>
      {:else if filteredOrders.length === 0}
        <div class="admin-empty-state">
          {searchQuery || selectedMonth !== "all"
            ? "Không có hóa đơn phù hợp với bộ lọc hiện tại."
            : "Chưa có hóa đơn nào được ghi nhận."}
        </div>
      {:else}
        <div class="admin-table-wrap">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>STT</th>
                <th>ID hóa đơn</th>
                <th>Khóa học</th>
                <th>Ngày mua</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredOrders as order, index}
                <tr>
                  <td>{index + 1}</td>
                  <td><strong>{order._id}</strong></td>
                  <td>{order.courseName || "N/A"}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{formatCurrency(order.amount)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  </section>
{:else}
  <section class="instructor-shell">
    <div class="admin-card">
      <h2>Bạn không có quyền truy cập vào trang này.</h2>
    </div>
  </section>
{/if}

<style>
  :global(.instructor-shell .admin-stat-value) {
    word-break: break-word;
  }

  .instructor-report-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.75rem;
  }

  .instructor-report-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
