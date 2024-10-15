<script>
  import { updateItem } from "$lib/js/api";
  import Editor from "cl-editor";
  import { writable } from "svelte/store";

  export let lessonData;

  let editedName = "";
  let editedContent = writable("");
  let editedDescription = "";
  let editedUrl = "";
  let editedTranscript = "";
  let editedLiveDate;
  let editedLink = "";
  let editedQuestions = writable([]);
  let isSaving = false;
  let previousLessonId = null;
  let editedTimer = null;

  // Sử dụng lessonData._id làm key để buộc component Editor render lại
  $: editorKey = lessonData ? lessonData._id : null;

  // Mỗi khi bài học (Lesson) thay đổi
  $: if (lessonData && lessonData._id !== previousLessonId) {
    editedName = lessonData.name;
    editedDescription = lessonData.description || "";
    if (lessonData.itemType === "lesson") {
      // Xử lý nội dung theo loại bài học
      if (lessonData.type === "TextLesson") {
        editedContent.set(lessonData.content || "");
      } else if (
        lessonData.type === "VideoLesson" ||
        lessonData.type === "AudioLesson"
      ) {
        editedUrl = lessonData.videoUrl || lessonData.audioUrl || "";
        editedTranscript = lessonData.transcript || "";
      } else if (lessonData.type === "LiveLesson") {
        editedLiveDate = formatDate(lessonData.liveDate);
        editedLink = lessonData.link || "";
      }
    } else {
      editedTimer = lessonData.timer || null;
      editedQuestions = lessonData.questions
        ? lessonData.questions.map((question) => ({
            ...question,
            options: question.options.map((option) => ({
              ...option,
              isCorrect: option.isCorrect || false, // Đảm bảo isCorrect tồn tại
            })),
          }))
        : [];
    }
    previousLessonId = lessonData._id;
  }

  // Hàm format ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return ""; // Xử lý trường hợp dateString là null hoặc undefined
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // Thêm số 0 vào đầu tháng nếu cần
    const day = ("0" + date.getDate()).slice(-2); // Thêm số 0 vào đầu ngày nếu cần
    return `${year}-${month}-${day}`;
  };

  // Hàm lưu bài học
  const saveLesson = async () => {
    isSaving = true;
    try {
      if (lessonData.itemType === "lesson") {
        const updatedLesson = {
          name: editedName,
          description: editedDescription,
        };
        if (lessonData.type === "TextLesson") {
          updatedLesson.content = $editedContent;
        } else if (lessonData.type === "VideoLesson") {
          updatedLesson.videoUrl = editedUrl;
          updatedLesson.transcript = editedTranscript;
        } else if (lessonData.type === "AudioLesson") {
          updatedLesson.audioUrl = editedUrl;
          updatedLesson.transcript = editedTranscript;
        } else if (lessonData.type === "LiveLesson") {
          updatedLesson.liveDate = editedLiveDate;
          updatedLesson.link = editedLink;
        }
        console.log(updatedLesson);

        await updateItem("lesson", lessonData._id, updatedLesson);
      } else {
        const updatedAssignment = {
          name: editedName,
          description: editedDescription,
          questions: editedQuestions,
          timer: editedTimer,
        };

        console.log(updatedAssignment);
        await updateItem("assignment", lessonData._id, updatedAssignment);
      }
    } catch (error) {
      console.error("Error updating lesson:", error);
    } finally {
      isSaving = false;
    }
  };

  // Hàm thêm lựa chọn cho câu hỏi
  const addOption = (questionIndex) => {
    editedQuestions[questionIndex].options = [
      ...editedQuestions[questionIndex].options,
      { text: "", isCorrect: false },
    ];
  };

  // Hàm xóa lựa chọn
  const removeOption = (questionIndex, optionIndex) => {
    editedQuestions[questionIndex].options = editedQuestions[
      questionIndex
    ].options.filter((_, index) => index !== optionIndex);
    // Gán lại mảng để Svelte nhận diện thay đổi
    editedQuestions = [...editedQuestions];
  };

  // Hàm xử lý thay đổi của checkbox đếm ngược thời gian
  const handleCountdownChange = (event) => {
    lessonData.hasCountdown = event.target.checked;
  };

  // Hàm xử lý thay đổi của checkbox đáp án đúng
  const handleCorrectAnswerChange = (questionIndex, optionIndex) => {
    editedQuestions.update((questions) => {
      const question = questions[questionIndex];
      if (question) {
        question.options = question.options.map((option, optIdx) => {
          if (optIdx === optionIndex) {
            // Toggle trạng thái isCorrect
            option.isCorrect = !option.isCorrect;
          }
          return option;
        });
      }
      return [...questions]; // Trả về bản sao mới của mảng để kích hoạt reactive
    });
  };

  // Hàm thêm câu hỏi mới
  const addQuestion = () => {
    editedQuestions = [
      ...editedQuestions,
      {
        questionText: "",
        options: [{ text: "", isCorrect: false }],
        explanation: "",
      },
    ];
  };

  // Hàm xóa câu hỏi
  const removeQuestion = (questionIndex) => {
    editedQuestions = editedQuestions.filter(
      (_, index) => index !== questionIndex
    );
    // Gán lại mảng để Svelte nhận diện thay đổi
    editedQuestions = [...editedQuestions];
  };

  // Hàm di chuyển câu hỏi lên
  const moveQuestionUp = (questionIndex) => {
    if (questionIndex > 0) {
      // Hoán đổi vị trí hai câu hỏi
      [editedQuestions[questionIndex], editedQuestions[questionIndex - 1]] = [
        editedQuestions[questionIndex - 1],
        editedQuestions[questionIndex],
      ];
      // Gán lại mảng để Svelte nhận diện thay đổi
      editedQuestions = [...editedQuestions];
    }
  };

  // Hàm di chuyển câu hỏi xuống
  const moveQuestionDown = (questionIndex) => {
    if (questionIndex < editedQuestions.length - 1) {
      // Hoán đổi vị trí hai câu hỏi
      [editedQuestions[questionIndex], editedQuestions[questionIndex + 1]] = [
        editedQuestions[questionIndex + 1],
        editedQuestions[questionIndex],
      ];
      // Gán lại mảng để Svelte nhận diện thay đổi
      editedQuestions = [...editedQuestions];
    }
  };

  // Hàm xử lý khi nội dung editor thay đổi
  const handleEditorChange = (event) => {
    editedContent.set(event.detail);
  };
</script>

{#if lessonData && lessonData.itemType === "lesson"}
  <h2>Chỉnh sửa Bài học</h2>

  <div>
    <p>Tên bài học:</p>
    <input type="text" bind:value={editedName} placeholder="Tên bài học" />
  </div>

  <div>
    <p>Mô tả bài học:</p>
    <textarea bind:value={editedDescription} placeholder="Mô tả"></textarea>
  </div>

  <!-- Sử dụng key cho component Editor -->
  {#key editorKey}
    {#if lessonData.type === "TextLesson"}
      <div>
        <p>Nội dung bài học:</p>
        <Editor bind:html={$editedContent} on:change={handleEditorChange} />
      </div>
    {:else if lessonData.type === "VideoLesson" || lessonData.type === "AudioLesson"}
      <div>
        <p>URL:</p>
        <input type="text" bind:value={editedUrl} placeholder="URL" />
      </div>
    {:else if lessonData.type === "LiveLesson"}
      <div>
        <p>Ngày học trực tiếp:</p>
        <input type="date" bind:value={editedLiveDate} />
      </div>
      <div>
        <p>Link học trực tiếp:</p>
        <input
          type="text"
          bind:value={editedLink}
          placeholder="Link học trực tiếp"
        />
      </div>
    {/if}
  {/key}

  <button on:click={saveLesson} disabled={isSaving}>
    {isSaving ? "Đang lưu..." : "Lưu"}
  </button>
{/if}

{#if lessonData && lessonData.itemType === "assignment"}
  <h2>Chỉnh sửa Bài tập (Quiz)</h2>

  <div>
    <p>Tên bài tập:</p>
    <input type="text" bind:value={editedName} placeholder="Tên bài tập" />
  </div>

  <div>
    <p>Mô tả bài tập:</p>
    <textarea bind:value={editedDescription} placeholder="Mô tả"></textarea>
  </div>

  <div>
    <div>
      <input
        type="checkbox"
        bind:checked={editedTimer}
        on:change={handleCountdownChange}
        style="display: inline-block; width:fit-content"
      />
      <span>Đây là bài kiểm tra</span>
    </div>
    {#if editedTimer}
      <div>
        <p>Thời gian đếm ngược (phút):</p>
        <input type="number" bind:value={editedTimer} min="1" />
      </div>
    {/if}
  </div>

  <!-- Danh sách câu hỏi -->
  {#each editedQuestions as question, index}
    <div>
      <p>Câu hỏi {index + 1}:</p>
      <input
        type="text"
        bind:value={question.questionText}
        placeholder="Câu hỏi"
      />

      <div>
        <p>Câu trả lời:</p>
        {#each question.options as option, optIndex}
          <div>
            <input
              type="text"
              bind:value={option.text}
              placeholder="Tùy chọn {optIndex + 1}"
            />
            <div>
              Đáp án đúng
              <input
                type="checkbox"
                bind:checked={option.isCorrect}
                on:change={() => handleCorrectAnswerChange(index, optIndex)}
                style="display:inline;width:fit-content;font-size:16px"
              />
            </div>
            <button on:click={() => removeOption(index, optIndex)}>
              Xóa lựa chọn
            </button>
          </div>
        {/each}
        <button on:click={() => addOption(index)}>Thêm lựa chọn</button>
      </div>

      <div>
        <p>Giải thích:</p>
        <textarea
          bind:value={question.explanation}
          placeholder="Giải thích cho câu hỏi"
        ></textarea>
      </div>

      <div>
        <button on:click={() => moveQuestionUp(index)}>Lên</button>
        <button on:click={() => moveQuestionDown(index)}>Xuống</button>
        <button on:click={() => removeQuestion(index)}>Xóa câu hỏi</button>
      </div>
    </div>
  {/each}

  <button on:click={addQuestion}>Thêm câu hỏi</button>

  <button on:click={saveLesson} disabled={isSaving}>
    {isSaving ? "Đang lưu..." : "Lưu"}
  </button>
{/if}

<style>
  div {
    margin-bottom: 15px;
  }
  input,
  textarea {
    width: 100%;
    padding: 8px;
    margin-top: 5px;
    box-sizing: border-box;
  }
  button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    cursor: pointer;
  }
  button[disabled] {
    background-color: #cccccc;
  }

  /* Tiêu đề */
  h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  /* Input và Textarea */
  input,
  textarea {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
  }

  textarea {
    min-height: 120px;
  }

  /* Nút */
  button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: #0056b3;
  }

  button[disabled] {
    background-color: #cccccc;
    cursor: not-allowed;
  }
</style>
