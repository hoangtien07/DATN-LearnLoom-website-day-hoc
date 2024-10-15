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
        ])
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
        (answer) => answer !== optionText
      );
    }
  };
</script>

{#if assignment && $user}
  <div>
    <h2>{assignment.name}</h2>
    <p>{assignment.description}</p>

    {#if hasTimer}
      <p class="timer">
        Thời gian còn lại:
        {Math.floor(timer / 3600)
          .toString()
          .padStart(2, "0")}:{Math.floor((timer % 3600) / 60)
          .toString()
          .padStart(2, "0")}:{(timer % 60).toString().padStart(2, "0")}
      </p>
    {/if}

    <form on:submit|preventDefault={submitAssignment}>
      {#each assignment.questions as question, qIndex}
        <div>
          <p>Câu {qIndex + 1}: {question.questionText}</p>
          {#each question.options as option, oIndex}
            <label>
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
        </div>
      {/each}
      <button type="submit" disabled={isSubmitting}>Nộp bài</button>
    </form>
  </div>
{:else}
  <p>Loading assignment...</p>
{/if}

<style>
  div {
    font-family: "Arial", sans-serif; /* Chọn font chữ dễ đọc */
    margin-bottom: 20px;
  }

  h2 {
    text-align: center;
    margin-bottom: 20px;
    color: #333; /* Màu chữ tiêu đề */
  }

  p {
    margin-bottom: 10px;
    line-height: 1.5; /* Giãn dòng cho dễ đọc */
  }

  label {
    display: block; /* Hiển thị label trên một dòng riêng */
    margin-bottom: 8px;
  }

  input[type="checkbox"] {
    margin-right: 5px;
  }

  button {
    padding: 10px 20px;
    background-color: #007bff; /* Màu nền nút */
    color: white;
    border: none;
    border-radius: 5px; /* Bo tròn góc nút */
    cursor: pointer;
    transition: background-color 0.3s ease; /* Thêm hiệu ứng chuyển màu mượt mà */
  }

  button:hover {
    background-color: #0056b3; /* Màu nền nút khi di chuột qua */
  }

  button[disabled] {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  /* CSS cho bộ đếm thời gian */
  .timer {
    font-size: 20px;
    font-weight: bold;
    color: #d9534f; /* Màu chữ đỏ */
    margin-bottom: 20px;
  }
</style>
