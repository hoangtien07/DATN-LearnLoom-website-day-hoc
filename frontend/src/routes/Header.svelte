<script>
  import { page } from "$app/stores";
  import { onMount } from "svelte";
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

  const toggleLoginModal = () => {
    showLoginModal = !showLoginModal;
  };

  // Lấy danh sách môn học khi component được tạo
  onMount(async () => {
    try {
      if (!$user) $user = fetchUser();
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
</script>

<header>
  <div class="container">
    <a href="/" class="logo">
      <img src={logo} alt="LearnLoom" />
    </a>

    {#if $user && $user.role === "admin"}
      <!-- Header cho admin -->
      <nav class="admin-instructor-nav">
        <ul>
          <li>
            <a class="text-primary" href="/admin/course-management"
              >Quản lý khóa học</a
            >
          </li>
          <li>
            <a class="text-primary" href="/admin/order-management"
              >Quản lý hóa đơn</a
            >
          </li>
          <li>
            <a class="text-primary" href="/admin/user-management"
              >Quản lý tài khoản</a
            >
          </li>
          <li>
            <a class="text-primary" href="/admin/subject-management"
              >Quản lý môn học</a
            >
          </li>
        </ul>
        <div class="user-profile">
          <Dropdown>
            <DropdownToggle color="light" caret>{$user.username}</DropdownToggle
            >
            <DropdownMenu end>
              <DropdownItem>
                <a href="http://localhost:5000/auth/logout"
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
        <ul>
          <li>
            <a class="text-primary mx-2" href="/instructor/dashboard"
              >Dashboard</a
            >
          </li>
          <li>
            <a class="text-primary mx-2" href="/instructor/gradebook"
              >Gradebook</a
            >
          </li>
          <li>
            <a class="text-primary mx-2" href="/instructor/earnings">Earnings</a
            >
          </li>
        </ul>
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
                ><a href="http://localhost:5000/auth/logout" class="d-block"
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
                <DropdownItem color="primary"
                  ><a href="/course">Tất cả khóa học</a></DropdownItem
                >
                {#each subjects as subject}
                  <DropdownItem
                    ><a href="/course?subjects={subject.name}">{subject.name}</a
                    ></DropdownItem
                  >
                {/each}
              </DropdownMenu>
            </Dropdown>
          </li>
          <li>
            <div class="search-bar">
              <input type="text" placeholder="Tìm kiếm khóa học..." />
              <button><i class="bi bi-search"></i></button>
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
                  ><a href="http://localhost:5000/auth/logout" class="d-block"
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
    display: flex;
    align-items: center;
  }

  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
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
  }

  .admin-instructor-nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .admin-instructor-nav li {
    margin-right: 2rem;
  }

  .admin-instructor-nav a {
    color: #333;
    text-decoration: none;
  }

  .user-profile {
    margin-left: 2rem;
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

  .main-menu a {
    color: #333;
    text-decoration: none;
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
  }

  .instructor-nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .instructor-nav li {
    margin-right: 2rem;
  }

  .instructor-nav a {
    text-decoration: none;
  }
</style>
