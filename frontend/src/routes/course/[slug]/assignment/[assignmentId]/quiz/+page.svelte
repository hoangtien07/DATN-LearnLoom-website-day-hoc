<script>
  import { onMount } from "svelte";
  import { getItem, submitQuiz } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { user, fetchUser } from "../../../../../../stores/auth";

  let assignmentId = $page.params.assignmentId;
  let slug = $page.params.slug;
  let assignment;
  let answers = {}; // Lưu trữ các câu trả lời của người dùng
  let isSubmitting = false;
  let timer = 0; // Thời gian làm bài, nếu có
  let hasTimer = false; // Kiểm tra xem có bộ đếm thời gian hay không

  // Hàm submit bài làm
  const submitAssignment = async () => {
    try {
      isSubmitting = true;
      // Chuyển đổi answers trước khi gửi
      const formattedAnswers = Object.fromEntries(
        Object.entries(answers).map(([questionId, selectedOptions]) => [
          questionId,
          Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions],
        ]),
      );
      await submitQuiz(assignmentId, $user._id, formattedAnswers);
      goto(`/course/${slug}/learn/assignment/${assignmentId}/result`);
    } catch (error) {
      console.error("Error submitting quiz:", error);
    } finally {
      isSubmitting = false;
    }
  };

  // Đếm ngược thời gian nếu có timer
  const startTimer = () => {
    if (hasTimer && timer > 0) {
      const interval = setInterval(() => {
        if (timer > 0) {
          timer--;
        } else {
          clearInterval(interval);
          submitAssignment(); // Tự động nộp bài khi hết giờ
        }
      }, 1000);
    }
  };

  // Lấy thông tin bài tập từ API
  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }
      assignment = await getItem("assignment", assignmentId); // Lấy thông tin bài tập
      hasTimer = assignment.timer > 0;
      if (hasTimer) {
        timer = assignment.timer * 60; // Giả sử timer là số phút, chuyển thành giây
        startTimer();
      }
    } catch (error) {
      console.error("Error fetching assignment data:", error);
    }
  });

  // Hàm xử lý khi checkbox thay đổi
  const handleCheckboxChange = (questionId, optionText, event) => {
    if (!answers[questionId]) {
      answers[questionId] = [];
    }

    if (event.target.checked) {
      answers[questionId].push(optionText);
    } else {
      answers[questionId] = answers[questionId].filter(
        (answer) => answer !== optionText,
      );
    }
  };
</script>

{#if assignment && $user}
  <div class="quiz-shell">
    <div class="quiz-header">
      <p class="quiz-label">Bài kiểm tra</p>
      <h2>{assignment.name}</h2>
      <p>{assignment.description}</p>
    </div>

    {#if hasTimer}
      <div class="timer-wrap">
        <p class="timer-title">Thời gian còn lại</p>
        <p class="timer">
          {Math.floor(timer / 3600)
            .toString()
            .padStart(2, "0")}:{Math.floor((timer % 3600) / 60)
            .toString()
            .padStart(2, "0")}:{(timer % 60).toString().padStart(2, "0")}
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
