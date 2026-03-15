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

  $: isCompleted = ["completed", "can_retake"].includes(status?.status);
  $: canRetake = status?.status === "can_retake" || assignment?.allowRetake;
</script>

{#if isLoading}
  <div class="loading">
    <p>Đang tải bài tập...</p>
  </div>
{:else}
  <div class="assignment-container">
    <div class="assignment-header">
      <p class="assignment-label">Bài tập trong bài học</p>
      <h2 class="assignment-title">{assignment.name}</h2>
      <p class="assignment-description">{assignment.description}</p>
    </div>

    <div class="assignment-actions">
      {#if isCompleted}
        <p class="assignment-result">
          Bạn đã hoàn thành bài tập {#if status?.score !== undefined}
            với số điểm {status.score}{#if status?.totalScore !== undefined}/{status.totalScore}{/if}
          {/if}
        </p>
        <button class="btn btn-primary" on:click={viewResult}
          >Xem kết quả</button
        >
        {#if canRetake}
          <button class="btn btn-outline-primary" on:click={startQuiz}
            >Làm lại</button
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
    min-height: 200px;
    color: var(--learn-text-muted);
  }

  .assignment-container {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface-soft);
    padding: 1.15rem;
  }

  .assignment-header {
    border-bottom: 1px solid var(--learn-border);
    margin-bottom: 1rem;
    padding-bottom: 1rem;
  }

  .assignment-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--learn-text-muted);
    margin-bottom: 0.35rem;
  }

  .assignment-title {
    margin: 0 0 0.55rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--learn-text);
  }

  .assignment-description {
    color: var(--learn-text-muted);
    line-height: 1.55;
    margin: 0;
  }

  .assignment-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .assignment-actions button {
    min-width: 150px;
    border-radius: 999px;
    font-weight: 600;
  }

  .assignment-result {
    margin-bottom: 0;
    font-weight: bold;
    color: var(--learn-text);
  }
</style>
