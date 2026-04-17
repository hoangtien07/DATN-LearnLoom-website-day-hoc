<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { getAuthUrl } from "$lib/js/api";
  import logo from "$lib/images/logo.png";
  import { user, fetchUser } from "../stores/auth";
  import Login from "./Login.svelte";
  import { getSubjects } from "$lib/js/api"; // Import hàm getSubjects
  import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Button,
  } from "@sveltestrap/sveltestrap";

  let showLoginModal = false;
  let subjects = []; // Biến lưu trữ danh sách môn học
  let searchKeyword = "";
  let lastCourseSearchQuery = "";

  const navigateToCourse = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value && String(value).trim()) {
        query.set(key, String(value).trim());
      }
    });

    const queryString = query.toString();
    goto(queryString ? `/course?${queryString}` : "/course");
  };

  const handleHeaderSearch = () => {
    navigateToCourse({ search: searchKeyword });
  };

  const handleSearchEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleHeaderSearch();
    }
  };

  const toggleLoginModal = () => {
    showLoginModal = !showLoginModal;
  };

  // Lấy danh sách môn học khi component được tạo
  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }
      subjects = await getSubjects();
    } catch (error) {
      console.error("Lỗi khi lấy danh sách môn học:", error);
      // Xử lý lỗi hiển thị cho người dùng
    }
  });
  // Kiểm tra xem URL hiện tại có chứa '/instructor' hay không
  $: isInstructorPage =
    $page.url.pathname.includes("/instructor") ||
    $page.url.pathname.includes("/edit-course");

  const normalizePath = (path = "/") => {
    const trimmedPath = path.replace(/\/+$/, "");
    return trimmedPath || "/";
  };

  $: currentPath = normalizePath($page.url.pathname);

  const resolveAdminActiveTab = (path) => {
    if (path === "/admin") {
      return "dashboard";
    }

    if (path.startsWith("/admin/course-management")) {
      return "course";
    }

    if (path.startsWith("/admin/order-management")) {
      return "order";
    }

    if (path.startsWith("/admin/user-management")) {
      return "user";
    }

    if (path.startsWith("/admin/subject-management")) {
      return "subject";
    }

    if (path.startsWith("/admin/instructor-applications")) {
      return "instructor-applications";
    }

    if (path.startsWith("/admin/course-review")) {
      return "course-review";
    }

    return "";
  };

  $: adminActiveTab = resolveAdminActiveTab(currentPath);

  $: if ($page.url.pathname === "/course") {
    const currentQuery = $page.url.searchParams.toString();
    if (currentQuery !== lastCourseSearchQuery) {
      lastCourseSearchQuery = currentQuery;
      searchKeyword = $page.url.searchParams.get("search") || "";
    }
  }
</script>

<header>
  <div class="container">
    <a href="/" class="logo">
      <img src={logo} alt="LearnLoom" />
    </a>

    {#if $user && $user.role === "admin"}
      <!-- Header cho admin -->
      <nav class="admin-instructor-nav">
        <ul class="admin-links">
          <li>
            <a class:active={adminActiveTab === "dashboard"} href="/admin"
              >Tổng quan</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "course"}
              href="/admin/course-management">Quản lý khóa học</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "order"}
              href="/admin/order-management">Quản lý hóa đơn</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "user"}
              href="/admin/user-management">Quản lý tài khoản</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "subject"}
              href="/admin/subject-management">Quản lý môn học</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "instructor-applications"}
              href="/admin/instructor-applications">Duyệt giảng viên</a
            >
          </li>
          <li>
            <a
              class:active={adminActiveTab === "course-review"}
              href="/admin/course-review">Duyệt khóa học</a
            >
          </li>
        </ul>
        <div class="user-profile">
          <Dropdown>
            <DropdownToggle color="light" caret>{$user.username}</DropdownToggle
            >
            <DropdownMenu end>
              <DropdownItem>
                <a href={getAuthUrl("/auth/logout")}
                  >Đăng xuất <i class="bi bi-box-arrow-right ms-1"></i></a
                ></DropdownItem
              >
            </DropdownMenu>
          </Dropdown>
        </div>
      </nav>
    {:else if $user && $user.role === "instructor" && isInstructorPage}
      <!-- Header cho giảng viên -->
      <nav class="instructor-nav">
        <div class="instructor-context-label">Instructor workspace</div>
        <div class="d-flex align-items-center">
          <a href="/" class="text-primary me-3">Học viên</a>
          <Dropdown>
            <DropdownToggle outline color="light" caret>
              <img src={$user.thumbnail} id="avatar" alt="avatar" />
            </DropdownToggle>
            <DropdownMenu end>
              <DropdownItem header disable>
                {$user.username}</DropdownItem
              >
              <DropdownItem><a href="/profile">Learning path</a></DropdownItem>
              <DropdownItem
                ><a href="/profile">Thông tin cá nhân</a></DropdownItem
              >
              <DropdownItem
                ><a href={getAuthUrl("/auth/logout")} class="d-block"
                  >Đăng xuất <i class="bi bi-box-arrow-right ms-1"></i></a
                ></DropdownItem
              >
            </DropdownMenu>
          </Dropdown>
        </div>
      </nav>
    {:else}
      <nav class="guest-student-nav">
        <ul class="main-menu">
          <li>
            <!-- <a href="/course">Khóa học</a> -->
            <Dropdown>
              <DropdownToggle color="primary" caret>Khám phá</DropdownToggle>
              <DropdownMenu>
                <DropdownItem
                  color="primary"
                  on:click={() => navigateToCourse()}
                >
                  Tất cả khóa học
                </DropdownItem>
                {#each subjects as subject}
                  <DropdownItem
                    on:click={() =>
                      navigateToCourse({
                        subjects: subject.name,
                      })}
                  >
                    {subject.name}
                  </DropdownItem>
                {/each}
              </DropdownMenu>
            </Dropdown>
          </li>
          <li>
            <div class="search-bar">
              <input
                type="text"
                bind:value={searchKeyword}
                on:keydown={handleSearchEnter}
                placeholder="Tìm kiếm khóa học..."
              />
              <button on:click={handleHeaderSearch}
                ><i class="bi bi-search"></i></button
              >
            </div>
          </li>
        </ul>
        <div
          class="d-flex align-items-center justify-content-end"
          style="flex:1"
        >
          {#if $user && $user.role === "instructor"}
            <a
              href="/instructor/dashboard"
              class="d-block mx-2 px-2 text-primary">Trang giảng viên</a
            >
          {/if}
          <a href="/learn" class="d-block mx-2 px-2 text-primary">Học tập</a>
          {#if $user}
            <Dropdown>
              <DropdownToggle outline color="light" caret>
                <!-- <div id="avatar">
                  <Image fluid alt="avatar" src={$user.thumbnail} />
                </div> -->
                <img src={$user.thumbnail} id="avatar" alt="avatar" />
              </DropdownToggle>
              <DropdownMenu end>
                <DropdownItem><a href="/profile">Learning path</a></DropdownItem
                >
                <DropdownItem
                  ><a href="/profile">Thông tin cá nhân</a></DropdownItem
                >
                <DropdownItem
                  ><a href="/profile/orders"
                    >Lịch sử mua hàng <i class="bi bi-receipt ms-1"></i></a
                  ></DropdownItem
                >
                {#if $user.role === "student"}
                  <DropdownItem
                    ><a href="/instructor/apply"
                      >Đăng ký làm giảng viên <i
                        class="bi bi-mortarboard ms-1"
                      ></i></a
                    ></DropdownItem
                  >
                {/if}
                <DropdownItem
                  ><a href={getAuthUrl("/auth/logout")} class="d-block"
                    >Đăng xuất <i class="bi bi-box-arrow-right ms-1"></i></a
                  ></DropdownItem
                >
              </DropdownMenu>
            </Dropdown>
          {:else}
            <Button outline color="primary"
              ><a href="/login" class="login">Đăng nhập</a></Button
            >
          {/if}
        </div>
        {#if showLoginModal}
          <Login on:close={toggleLoginModal} />
        {/if}
      </nav>
    {/if}
  </div>
</header>

<style scoped>
  /* CSS cho header chung */
  header {
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 100;
    height: 72px;
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
  }

  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1440px;
    margin: 0 auto;
  }

  .logo {
    height: 44px;
    margin-right: 40px;
  }

  .logo img {
    height: 100%;
  }

  /* CSS cho nav */
  nav {
    flex: 1;
    justify-content: space-between;
  }
  /* Style cho menu dropdown */
  :global(.dropdown-toggle) {
    background-color: #f8f9fa;
    color: #007bff;
  }
  a {
    color: inherit;
  }

  /* CSS cho admin/instructor nav */
  .admin-instructor-nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    justify-content: space-between;
  }

  .admin-instructor-nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.6rem;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .admin-instructor-nav li {
    margin-right: 0;
    flex: 0 0 auto;
  }

  .admin-instructor-nav a {
    color: #374151;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0.48rem 0.9rem;
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 600;
    font-size: 0.94rem;
    transition: all 0.2s ease;
    white-space: nowrap;
    background: #f8fafc;
  }

  .admin-instructor-nav a:hover {
    background: #eef2ff;
    color: #1e40af;
  }

  .admin-instructor-nav a.active {
    background: linear-gradient(135deg, #0b5fff, #1f7bff);
    color: #fff;
    border-color: #0b5fff;
    box-shadow: 0 8px 16px rgba(11, 95, 255, 0.2);
  }

  .user-profile {
    margin-left: 0;
    flex-shrink: 0;
  }

  /* CSS cho guest/student nav */
  .guest-student-nav {
    display: flex;
    align-items: center;
  }

  .main-menu {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .main-menu > li {
    position: relative;
  }

  .search-bar {
    display: flex;
    margin-left: 2rem;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #ccc;
  }

  .search-bar input {
    padding: 0.5rem 0.8rem;
  }

  .search-bar button {
    background-color: #007bff;
    color: #fff;
    border: none;
    cursor: pointer;
    margin: 4px;
    width: auto;
    border-radius: 20px;
  }
  .search-bar button i {
    margin: 4px;
  }
  #avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  /* CSS cho instructor nav */
  .instructor-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .instructor-context-label {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0.42rem 0.78rem;
    border-radius: 999px;
    background: #eef4ff;
    color: #1e3f86;
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  @media (max-width: 1080px) {
    .admin-instructor-nav {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.7rem;
    }

    .user-profile {
      align-self: flex-end;
    }
  }
</style>
