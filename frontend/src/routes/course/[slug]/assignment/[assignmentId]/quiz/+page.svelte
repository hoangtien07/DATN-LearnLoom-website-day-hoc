<script>
  import { onMount, onDestroy } from "svelte";
  import { startQuiz, submitQuiz } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { user, fetchUser } from "../../../../../../stores/auth";

  let assignmentId = $page.params.assignmentId;
  let slug = $page.params.slug;
  let assignment; // { questions, startedAt, deadline, timerMinutes, attempt, maxAttempts }
  let answers = {};
  let isSubmitting = false;
  let timerSeconds = 0; // thời gian còn lại (giây)
  let hasTimer = false;
  let tickHandle = null;
  let loadError = null; // { kind, message }
  let info = "";

  const extractError = (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message =
      error?.response?.data?.message || error?.message || "Lỗi không xác định";
    if (status === 401) return { kind: "unauth", message };
    if (status === 403 && code === "NOT_ENROLLED")
      return { kind: "not_enrolled", message };
    if (code === "MAX_ATTEMPTS_REACHED")
      return { kind: "max_attempts", message };
    if (code === "RETAKE_NOT_ALLOWED")
      return { kind: "no_retake", message };
    if (code === "ASSIGNMENT_COMPLETED")
      return { kind: "completed", message };
    return { kind: "other", message };
  };

  const submitAssignment = async () => {
    try {
      isSubmitting = true;
      await submitQuiz(assignmentId, answers);
      if (tickHandle) clearInterval(tickHandle);
      goto(`/course/${slug}/learn/assignment/${assignmentId}/result`);
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === "TIMER_EXPIRED") {
        info = "Đã quá thời gian làm bài. Chuyển sang trang kết quả.";
        goto(`/course/${slug}/learn/assignment/${assignmentId}/result`);
      } else {
        alert(error?.response?.data?.message || "Không nộp được bài.");
      }
    } finally {
      isSubmitting = false;
    }
  };

  const startTicking = (deadlineIso) => {
    if (!deadlineIso) return;
    const update = () => {
      const remain = Math.max(
        0,
        Math.round((new Date(deadlineIso).getTime() - Date.now()) / 1000),
      );
      timerSeconds = remain;
      if (remain <= 0) {
        clearInterval(tickHandle);
        tickHandle = null;
        submitAssignment();
      }
    };
    update();
    tickHandle = setInterval(update, 1000);
  };

  onMount(async () => {
    try {
      if (!$user) await fetchUser();
      if (!$user) {
        loadError = {
          kind: "unauth",
          message: "Bạn cần đăng nhập để làm bài.",
        };
        return;
      }
      assignment = await startQuiz(assignmentId);
      hasTimer = !!assignment.deadline;
      if (hasTimer) startTicking(assignment.deadline);
    } catch (error) {
      console.error("Error starting quiz:", error);
      loadError = extractError(error);
    }
  });

  onDestroy(() => {
    if (tickHandle) clearInterval(tickHandle);
  });

  const handleCheckboxChange = (questionId, optionText, event) => {
    if (!answers[questionId]) answers[questionId] = [];
    if (event.target.checked) {
      answers[questionId] = [...answers[questionId], optionText];
    } else {
      answers[questionId] = answers[questionId].filter(
        (a) => a !== optionText,
      );
    }
  };
</script>

{#if loadError?.kind === "unauth"}
  <div class="quiz-state">
    <h3>Bạn cần đăng nhập</h3>
    <p>{loadError.message}</p>
    <button
      class="quiz-cta"
      on:click={() =>
        goto(`/login?redirectTo=/course/${slug}/assignment/${assignmentId}/quiz`)}
      >Đăng nhập</button
    >
  </div>
{:else if loadError?.kind === "not_enrolled"}
  <div class="quiz-state">
    <h3>Chưa đăng ký khóa học</h3>
    <p>{loadError.message}</p>
    <button class="quiz-cta" on:click={() => goto(`/course/${slug}`)}>
      Đăng ký khóa học
    </button>
  </div>
{:else if loadError}
  <div class="quiz-state">
    <h3>Không thể vào bài</h3>
    <p>{loadError.message}</p>
    <button
      class="quiz-cta"
      on:click={() =>
        goto(`/course/${slug}/learn/assignment/${assignmentId}/result`)}
      >Xem kết quả đã có</button
    >
  </div>
{:else if assignment && $user}
  <div class="quiz-shell">
    <div class="quiz-header">
      <p class="quiz-label">
        Bài kiểm tra
        {#if assignment.maxAttempts > 0}
          · Lần {assignment.attempt}/{assignment.maxAttempts}
        {/if}
      </p>
      <h2>Bài tập</h2>
      {#if info}
        <p class="info-banner">{info}</p>
      {/if}
    </div>

    {#if hasTimer}
      <div class="timer-wrap">
        <p class="timer-title">Thời gian còn lại</p>
        <p class="timer">
          {Math.floor(timerSeconds / 3600)
            .toString()
            .padStart(2, "0")}:{Math.floor((timerSeconds % 3600) / 60)
            .toString()
            .padStart(2, "0")}:{(timerSeconds % 60).toString().padStart(2, "0")}
        </p>
      </div>
    {/if}

    <form class="quiz-form" on:submit|preventDefault={submitAssignment}>
      {#each assignment.questions as question, qIndex}
        <section class="question-card">
          <p class="question-title">
            Câu {qIndex + 1}: {question.questionText}
          </p>
          {#each question.options as option, oIndex}
            <label class="option-item">
              <input
                type="checkbox"
                name={`question-${question._id}`}
                value={option.text}
                on:change={(event) =>
                  handleCheckboxChange(question._id, option.text, event)}
              />
              {option.text}
            </label>
          {/each}
        </section>
      {/each}
      <div class="quiz-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </div>
    </form>
  </div>
{:else}
  <p class="loading-text">Đang tải bài tập...</p>
{/if}

<style>
  .quiz-state {
    max-width: 520px;
    margin: 2rem auto;
    padding: 1.5rem;
    border: 1px solid var(--learn-border, #e5e7eb);
    border-radius: 10px;
    background: var(--learn-surface, #fafafa);
  }
  .quiz-state h3 {
    margin: 0 0 0.5rem;
  }
  .quiz-state .quiz-cta {
    margin-top: 1rem;
    padding: 0.55rem 1.2rem;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }
  .quiz-state .quiz-cta:hover {
    background: #1d4ed8;
  }
  .info-banner {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.75rem;
    border-left: 3px solid #2563eb;
    background: #eff6ff;
    color: #1e3a8a;
    font-size: 0.85rem;
    border-radius: 0 6px 6px 0;
  }

  .quiz-shell {
    max-width: 980px;
    margin: 0 auto;
    color: var(--learn-text);
  }

  .quiz-header {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    padding: 1rem;
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    margin-bottom: 0.9rem;
  }

  .quiz-label {
    margin: 0 0 0.35rem;
    color: var(--learn-text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .quiz-header h2 {
    margin: 0 0 0.45rem;
    font-size: 1.35rem;
    font-weight: 700;
    color: #0f2d63;
  }

  .quiz-header p {
    margin: 0;
    color: var(--learn-text-muted);
    line-height: 1.55;
  }

  .timer-wrap {
    margin-bottom: 0.85rem;
    border: 1px solid #f6d89f;
    border-radius: 12px;
    padding: 0.75rem;
    background: #fff7e6;
    display: inline-flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .timer-title {
    color: #8a5a00;
    font-size: 0.85rem;
    margin: 0;
  }

  .timer {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    color: #b54708;
    font-variant-numeric: tabular-nums;
  }

  .quiz-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .question-card {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    padding: 1rem;
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
  }

  .question-title {
    margin: 0 0 0.75rem;
    font-weight: 700;
    color: var(--learn-text);
  }

  .option-item {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    margin-bottom: 0.55rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--learn-border);
    border-radius: 10px;
    cursor: pointer;
    background: #fbfcff;
  }

  .option-item:hover {
    border-color: #a6c4ff;
    background: #f2f7ff;
  }

  input[type="checkbox"] {
    margin-top: 0.2rem;
    accent-color: var(--learn-primary);
  }

  .quiz-actions {
    position: sticky;
    bottom: 10px;
    padding: 0.75rem;
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    display: flex;
    justify-content: flex-end;
  }

  button {
    height: 40px;
    padding: 0 1.1rem;
    background-color: var(--learn-primary);
    color: white;
    border-radius: 999px;
    font-weight: 700;
  }

  button:hover {
    background-color: var(--learn-primary-hover);
  }

  button[disabled] {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .loading-text {
    color: var(--learn-text-muted);
  }

  @media (max-width: 768px) {
    .question-card {
      padding: 0.85rem;
    }

    .quiz-actions {
      justify-content: stretch;
    }

    .quiz-actions button {
      width: 100%;
    }
  }
</style>
