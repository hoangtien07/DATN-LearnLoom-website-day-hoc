<script>
  import { onMount } from "svelte";
  import { getQuizResult } from "$lib/js/api";
  import { page } from "$app/stores";
  import { user, fetchUser } from "../../../../../../../stores/auth";

  let assignmentId = $page.params.assignmentId;
  let slug = $page.params.slug;
  let result;
  let isLoading = true;

  onMount(async () => {
    try {
      if (!$user) {
        await fetchUser();
      }
      result = await getQuizResult(assignmentId, $user._id);
    } catch (error) {
      console.error("Error fetching quiz result:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <p class="loading-text">Đang tải kết quả...</p>
{:else}
  <div class="result-shell">
    <section class="result-summary">
      <h2>Kết quả của bạn</h2>
      <p>
        Điểm số: <strong>{result.score} / {result.totalScore}</strong>
      </p>
    </section>

    <h3>Chi tiết câu hỏi</h3>
    {#each result.answers as answer}
      <article class="result-card">
        <p class="question-text">{answer.questionText}</p>
        {#if answer.userAnswer}
          <p class="answer-text">Câu trả lời của bạn: {answer.userAnswer}</p>
        {:else}
          <p class="answer-text">Bạn chưa trả lời câu hỏi này</p>
        {/if}
        <p class="answer-text">Đáp án đúng: {answer.correctAnswer}</p>
        {#if answer.isCorrect}
          <p class="status correct">Chính xác</p>
        {:else}
          <p class="status wrong">Sai</p>
        {/if}
        {#if answer.explanation}
          <p class="explanation">Giải thích: {answer.explanation}</p>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<style>
  .loading-text {
    color: var(--learn-text-muted);
  }

  .result-shell {
    max-width: 960px;
    margin: 0 auto;
    color: var(--learn-text);
  }

  .result-summary {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%);
    box-shadow: var(--learn-shadow-sm);
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .result-summary h2 {
    margin: 0 0 0.35rem;
    font-size: 1.35rem;
    font-weight: 700;
    color: #0f2d63;
  }

  .result-summary p {
    margin: 0;
    color: var(--learn-text-muted);
  }

  .result-summary strong {
    color: var(--learn-primary);
    font-size: 1.05rem;
  }

  h3 {
    margin: 0 0 0.8rem;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--learn-text);
  }

  .result-card {
    border: 1px solid var(--learn-border);
    border-radius: var(--learn-radius-md);
    background: var(--learn-surface);
    box-shadow: var(--learn-shadow-sm);
    padding: 0.9rem 1rem;
    margin-bottom: 0.7rem;
  }

  .question-text {
    margin: 0 0 0.6rem;
    font-weight: 700;
    color: #102544;
  }

  .answer-text,
  .explanation {
    margin: 0 0 0.45rem;
    color: var(--learn-text);
    line-height: 1.5;
  }

  .status {
    margin: 0 0 0.45rem;
    font-weight: 700;
  }

  .status.correct {
    color: var(--learn-success);
  }

  .status.wrong {
    color: var(--learn-danger);
  }
</style>
