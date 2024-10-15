<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getItem, getUserAssignmentStatus } from "$lib/js/api";
  import { user, fetchUser } from "../../../../../../stores/auth";
  import { page } from "$app/stores";

  let assignment;
  let status; // Trạng thái của bài tập: đã làm chưa, có thể làm lại hay không
  let assignmentId = $page.params.assignmentId;
  let slug = $page.params.slug;
  let isLoading = true;

  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }
      assignment = await getItem("assignment", assignmentId);
      status = await getUserAssignmentStatus($user._id, assignmentId);
    } catch (error) {
      console.error("Error fetching assignment data:", error);
    } finally {
      isLoading = false;
    }
  });

  const startQuiz = () => {
    goto(`/course/${slug}/assignment/${assignmentId}/quiz`);
  };

  const viewResult = () => {
    goto(`/course/${slug}/learn/assignment/${assignmentId}/result`);
  };
</script>

{#if isLoading}
  <div class="loading">
    <p>Đang tải bài tập...</p>
  </div>
{:else}
  <div class="assignment-container">
    <h2 class="assignment-title">{assignment.name}</h2>
    <p class="assignment-description">{assignment.description}</p>

    <div class="assignment-actions">
      {#if status.status === "completed"}
        <p class="assignment-result">
          Bạn đã hoàn thành bài tập với số điểm {status.score}/{status.totalScore}
        </p>
        <button class="btn btn-primary" on:click={viewResult}
          >Xem kết quả</button
        >
        {#if status.status === "can_retake"}
          <button class="btn btn-secondary" on:click={startQuiz}>Làm lại</button
          >
        {/if}
      {:else}
        <button class="btn btn-primary" on:click={startQuiz}>Bắt đầu làm</button
        >
      {/if}
    </div>
  </div>
{/if}

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px; /* Điều chỉnh chiều cao tối thiểu nếu cần */
  }

  .assignment-container {
    border: 1px solid #ddd;
    padding: 20px;
    border-radius: 5px;
  }

  .assignment-title {
    margin-bottom: 10px;
  }

  .assignment-description {
    margin-bottom: 20px;
  }

  .assignment-actions {
    display: flex;
    flex-direction: column; /* Xếp các nút theo chiều dọc */
    align-items: flex-start; /* Canh lề các nút về bên trái */
  }

  .assignment-actions button {
    margin-bottom: 10px; /* Khoảng cách giữa các nút */
  }

  .assignment-result {
    margin-bottom: 10px;
    font-weight: bold;
  }
</style>
