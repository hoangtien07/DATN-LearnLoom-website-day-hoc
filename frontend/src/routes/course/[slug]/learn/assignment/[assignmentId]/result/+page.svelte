<script>
  import { onMount } from "svelte";
  import { getItem, getQuizResult } from "$lib/js/api";
  import { page } from "$app/stores";
  import { user, fetchUser } from "../../../../../../../stores/auth";
  import { goto } from "$app/navigation";

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
  <p>Loading result...</p>
{:else}
  <div>
    <h2>Kết quả của bạn</h2>
    <p>Điểm: {result.score} / {result.totalScore}</p>

    <h3>Chi tiết câu hỏi:</h3>
    {#each result.answers as answer, index}
      <div>
        <p>{answer.questionText}</p>
        {#if answer.userAnswer}
          <p>Câu trả lời của bạn: {answer.userAnswer}</p>
        {:else}
          <p>Bạn chưa trả lời câu hỏi này</p>
        {/if}
        <p>Đáp án đúng: {answer.correctAnswer}</p>
        {#if answer.isCorrect}
          <p style="color: green;">Chính xác</p>
        {:else}
          <p style="color: red;">Sai</p>
        {/if}
        {#if answer.explanation}
          <p>Giải thích: {answer.explanation}</p>
        {/if}
      </div>
    {/each}
  </div>
{/if}
