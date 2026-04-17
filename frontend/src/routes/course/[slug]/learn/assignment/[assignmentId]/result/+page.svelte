<script>
  import { onMount } from "svelte";
  import { getQuizResult } from "$lib/js/api";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { user, fetchUser } from "../../../../../../../stores/auth";

  let assignmentId = $page.params.assignmentId;
  let slug = $page.params.slug;
  let result; // { score, totalScore, answers, isFinal, attemptsUsed }
  let isLoading = true;
  let fetchError = "";

  onMount(async () => {
    try {
      if (!$user) await fetchUser();
      if (!$user) {
        fetchError = "Bạn cần đăng nhập để xem kết quả.";
        return;
      }
      result = await getQuizResult(assignmentId, $user._id);
    } catch (error) {
      console.error("Error fetching quiz result:", error);
      fetchError =
        error?.response?.data?.message || "Không tải được kết quả bài làm.";
    } finally {
      isLoading = false;
    }
  });

  $: pct =
    result && result.totalScore > 0
      ? Math.round((result.score / result.totalScore) * 100)
      : 0;

  $: passedBadge =
    result && result.isFinal
      ? pct >= 80
        ? { label: "Xuất sắc", cls: "excellent" }
        : pct >= 50
          ? { label: "Đạt", cls: "ok" }
          : { label: "Chưa đạt", cls: "fail" }
      : null;
</script>

{#if isLoading}
  <p class="loading-text">Đang tải kết quả...</p>
{:else if fetchError}
  <div class="result-shell">
    <div class="result-summary">
      <h2>Chưa có kết quả</h2>
      <p>{fetchError}</p>
      <button
        class="cta"
        on:click={() =>
          goto(`/course/${slug}/assignment/${assignmentId}/quiz`)}
      >
        Làm bài
      </button>
    </div>
  </div>
{:else if result}
  <div class="result-shell">
    <section class="result-summary">
      <div class="summary-head">
        <h2>Kết quả của bạn</h2>
        {#if passedBadge}
          <span class="pass-badge {passedBadge.cls}">{passedBadge.label}</span>
        {:else}
          <span class="pass-badge in-progress">Chưa chốt</span>
        {/if}
      </div>
      <p class="score-line">
        Điểm: <strong>{result.score} / {result.totalScore}</strong>
        ({pct}%)
      </p>
      <p class="attempt-line">
        Đã nộp: <strong>{result.attemptsUsed}</strong> lần
      </p>
      {#if !result.isFinal}
        <p class="notice">
          Bạn còn được làm lại — đáp án đúng chỉ hiển thị sau khi hoàn tất.
        </p>
        <button
          class="cta"
          on:click={() =>
            goto(`/course/${slug}/assignment/${assignmentId}/quiz`)}
        >
          Làm lại
        </button>
      {/if}
    </section>

    <h3>Chi tiết câu hỏi</h3>
    {#each result.answers as answer, idx}
      <article class="result-card" class:correct={answer.isCorrect} class:wrong={!answer.isCorrect}>
        <div class="q-head">
          <span class="q-index">Câu {idx + 1}</span>
          {#if answer.isCorrect}
            <span class="status correct">✓ Chính xác</span>
          {:else}
            <span class="status wrong">✗ Sai</span>
          {/if}
        </div>
        <p class="question-text">{answer.questionText}</p>
        <p class="answer-text">
          Câu trả lời của bạn:
          <strong>{answer.userAnswer || "(chưa trả lời)"}</strong>
        </p>
        {#if result.isFinal && answer.correctAnswer}
          <p class="answer-text correct-answer">
            Đáp án đúng: <strong>{answer.correctAnswer}</strong>
          </p>
        {/if}
        {#if result.isFinal && answer.explanation}
          <p class="explanation">💡 {answer.explanation}</p>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<style>
  .loading-text {
    color: var(--learn-text-muted, #6b7280);
  }

  .result-shell {
    max-width: 960px;
    margin: 0 auto;
    color: var(--learn-text, #111827);
  }

  .result-summary {
    border: 1px solid var(--learn-border, #e5e7eb);
    border-radius: var(--learn-radius-md, 10px);
    background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%);
    box-shadow: var(--learn-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .summary-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .result-summary h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #0f2d63;
  }

  .pass-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .pass-badge.excellent {
    background: #d1fae5;
    color: #065f46;
  }
  .pass-badge.ok {
    background: #dbeafe;
    color: #1e40af;
  }
  .pass-badge.fail {
    background: #fee2e2;
    color: #991b1b;
  }
  .pass-badge.in-progress {
    background: #fef3c7;
    color: #b45309;
  }

  .score-line,
  .attempt-line {
    margin: 0.25rem 0 0;
    color: #374151;
  }
  .score-line strong {
    color: var(--learn-primary, #2563eb);
    font-size: 1.1rem;
  }

  .notice {
    margin-top: 0.75rem;
    padding: 0.6rem 0.8rem;
    background: #fff7ed;
    border-left: 3px solid #f59e0b;
    border-radius: 0 6px 6px 0;
    color: #92400e;
    font-size: 0.9rem;
  }

  .cta {
    margin-top: 0.75rem;
    padding: 0.5rem 1.2rem;
    background: #2563eb;
    color: white;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }
  .cta:hover {
    background: #1d4ed8;
  }

  h3 {
    margin: 0 0 0.8rem;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .result-card {
    border: 1px solid var(--learn-border, #e5e7eb);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    background: white;
  }
  .result-card.correct {
    border-left: 4px solid #10b981;
  }
  .result-card.wrong {
    border-left: 4px solid #dc2626;
  }

  .q-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  .q-index {
    color: #6b7280;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .status {
    font-weight: 700;
    font-size: 0.85rem;
  }
  .status.correct {
    color: #065f46;
  }
  .status.wrong {
    color: #991b1b;
  }

  .question-text {
    margin: 0 0 0.5rem;
    font-weight: 600;
    color: #102544;
  }
  .answer-text {
    margin: 0 0 0.3rem;
    color: #374151;
    line-height: 1.5;
  }
  .correct-answer {
    color: #065f46;
  }
  .explanation {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.75rem;
    background: #f0f9ff;
    border-radius: 6px;
    color: #075985;
    font-size: 0.9rem;
    line-height: 1.5;
  }
</style>
