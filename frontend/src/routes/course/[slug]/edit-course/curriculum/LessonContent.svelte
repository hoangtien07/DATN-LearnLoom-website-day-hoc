<script>
  import { updateItem } from "$lib/js/api";
  import Editor from "cl-editor";
  import { dndzone, SOURCES } from "svelte-dnd-action";
  import { flip } from "svelte/animate";

  export let lessonData;

  const FLIP_MS = 200;
  let nextTempId = 1;

  // Svelte-dnd-action yêu cầu mỗi item có `id` ổn định. Question từ DB có
  // `_id`; question mới thêm local chưa có → gán temp id.
  const ensureQuestionIds = (questions) =>
    questions.map((q) => ({
      ...q,
      id: q.id || (q._id ? String(q._id) : `q-tmp-${nextTempId++}`),
    }));

  let editedName = "";
  let editedContent = "";
  let editedDescription = "";
  let editedUrl = "";
  let editedTranscript = "";
  let editedLiveDate = "";
  let editedLink = "";
  let hasTimer = false;
  let timerMinutes = 10;
  let editedQuestions = [];
  let isSaving = false;
  let saveMessage = "";
  let saveVariant = "";
  let previousLessonId = null;

  // Re-mount editor when switching to another lesson.
  $: editorKey = lessonData ? lessonData._id : null;

  $: if (lessonData && lessonData._id !== previousLessonId) {
    editedName = lessonData.name || "";
    editedDescription = lessonData.description || "";

    if (lessonData.itemType === "lesson") {
      if (lessonData.type === "TextLesson") {
        editedContent = lessonData.content || "";
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
      hasTimer = Number(lessonData.timer) > 0;
      timerMinutes =
        Number(lessonData.timer) > 0 ? Number(lessonData.timer) : 10;
      editedQuestions = ensureQuestionIds(
        (lessonData.questions || []).map((question) => ({
          ...question,
          options: (question.options || []).map((option) => ({
            ...option,
            isCorrect: !!option.isCorrect,
          })),
        })),
      );
    }

    saveMessage = "";
    saveVariant = "";
    previousLessonId = lessonData._id;
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };

  const setSaveState = (message, variant = "") => {
    saveMessage = message;
    saveVariant = variant;
  };

  const saveLesson = async () => {
    if (!lessonData) {
      return;
    }

    isSaving = true;
    setSaveState("Đang lưu thay đổi...", "");

    try {
      if (lessonData.itemType === "lesson") {
        const updatedLesson = {
          name: editedName,
          description: editedDescription,
        };

        if (lessonData.type === "TextLesson") {
          updatedLesson.content = editedContent;
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

        await updateItem("lesson", lessonData._id, updatedLesson);
      } else {
        const updatedAssignment = {
          name: editedName,
          description: editedDescription,
          questions: editedQuestions,
          timer: hasTimer ? Number(timerMinutes) || 1 : null,
        };

        await updateItem("assignment", lessonData._id, updatedAssignment);
      }

      setSaveState("Đã lưu thành công.", "success");
    } catch (error) {
      console.error("Error updating lesson:", error);
      setSaveState("Lưu thất bại. Vui lòng thử lại.", "error");
    } finally {
      isSaving = false;
    }
  };

  const handleEditorChange = (event) => {
    editedContent = event.detail;
  };

  const addQuestion = () => {
    editedQuestions = ensureQuestionIds([
      ...editedQuestions,
      {
        questionText: "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (questionIndex) => {
    editedQuestions = editedQuestions.filter(
      (_, index) => index !== questionIndex,
    );
  };

  // Drag-drop handlers (svelte-dnd-action). Chỉ update local state;
  // thứ tự mới sẽ được lưu cùng toàn bộ questions khi user bấm "Lưu thay đổi".
  const onQuestionsConsider = (e) => {
    editedQuestions = e.detail.items;
  };
  const onQuestionsFinalize = (e) => {
    editedQuestions = e.detail.items;
    if (e.detail.info.source === SOURCES.POINTER) {
      setSaveState("Đã sắp xếp lại. Nhấn 'Lưu thay đổi' để ghi vào DB.", "");
    }
  };

  const addOption = (questionIndex) => {
    editedQuestions[questionIndex].options = [
      ...editedQuestions[questionIndex].options,
      { text: "", isCorrect: false },
    ];

    editedQuestions = [...editedQuestions];
  };

  const removeOption = (questionIndex, optionIndex) => {
    editedQuestions[questionIndex].options = editedQuestions[
      questionIndex
    ].options.filter((_, index) => index !== optionIndex);

    editedQuestions = [...editedQuestions];
  };

  const toggleCorrectAnswer = (questionIndex, optionIndex) => {
    editedQuestions[questionIndex].options = editedQuestions[
      questionIndex
    ].options.map((option, index) => ({
      ...option,
      isCorrect: index === optionIndex ? !option.isCorrect : option.isCorrect,
    }));

    editedQuestions = [...editedQuestions];
  };
</script>

{#if !lessonData}
  <div class="course-edit-empty">
    Chọn một bài học hoặc bài tập từ cột trái để bắt đầu chỉnh sửa nội dung.
  </div>
{:else}
  <div class="lesson-editor">
    <div class="course-edit-toolbar">
      <div>
        <h3 class="course-edit-section-title">
          {lessonData.itemType === "lesson"
            ? "Chỉnh sửa bài học"
            : "Chỉnh sửa bài tập"}
        </h3>
        <p class="course-edit-section-subtitle">
          {lessonData.itemType === "lesson"
            ? "Cập nhật nội dung học tập, media và mô tả bài học."
            : "Quản lý câu hỏi kiểm tra, đáp án đúng và thời gian làm bài."}
        </p>
      </div>
      <div class="course-edit-actions">
        <button
          class="course-edit-btn primary"
          on:click={saveLesson}
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>

    {#if saveMessage}
      <p class={`course-edit-status ${saveVariant}`}>{saveMessage}</p>
    {/if}

    <section class="course-edit-panel">
      <div class="course-edit-field">
        <label class="course-edit-label" for="itemName">Tên nội dung</label>
        <input
          id="itemName"
          class="course-edit-input"
          type="text"
          bind:value={editedName}
          placeholder="Nhập tên bài học hoặc bài tập"
        />
      </div>

      <div class="course-edit-field">
        <label class="course-edit-label" for="itemDescription">Mô tả</label>
        <textarea
          id="itemDescription"
          class="course-edit-textarea"
          bind:value={editedDescription}
          placeholder="Mô tả ngắn để học viên hiểu mục tiêu của nội dung này"
        ></textarea>
      </div>
    </section>

    {#if lessonData.itemType === "lesson"}
      <section class="course-edit-panel mt-3">
        {#key editorKey}
          {#if lessonData.type === "TextLesson"}
            <div class="course-edit-field">
              <p class="course-edit-label">Nội dung văn bản</p>
              <Editor
                bind:html={editedContent}
                on:change={handleEditorChange}
              />
            </div>
          {:else if lessonData.type === "VideoLesson" || lessonData.type === "AudioLesson"}
            <div class="course-edit-field">
              <label class="course-edit-label" for="mediaUrl">
                {lessonData.type === "VideoLesson" ? "URL video" : "URL audio"}
              </label>
              <input
                id="mediaUrl"
                class="course-edit-input"
                type="text"
                bind:value={editedUrl}
                placeholder="https://..."
              />
            </div>

            <div class="course-edit-field">
              <label class="course-edit-label" for="transcript"
                >Transcript</label
              >
              <textarea
                id="transcript"
                class="course-edit-textarea"
                bind:value={editedTranscript}
                placeholder="Nội dung transcript hoặc ghi chú chi tiết"
              ></textarea>
            </div>
          {:else if lessonData.type === "LiveLesson"}
            <div class="course-edit-form-grid">
              <div class="course-edit-field">
                <label class="course-edit-label" for="liveDate"
                  >Ngày học trực tiếp</label
                >
                <input
                  id="liveDate"
                  class="course-edit-input"
                  type="date"
                  bind:value={editedLiveDate}
                />
              </div>

              <div class="course-edit-field">
                <label class="course-edit-label" for="liveLink"
                  >Liên kết phòng học</label
                >
                <input
                  id="liveLink"
                  class="course-edit-input"
                  type="text"
                  bind:value={editedLink}
                  placeholder="https://meet..."
                />
              </div>
            </div>
          {/if}
        {/key}
      </section>
    {:else}
      <section class="course-edit-panel mt-3">
        <div class="course-edit-toolbar">
          <div>
            <p class="course-edit-title-label">Thiết lập bài kiểm tra</p>
            <p class="course-edit-help">
              Bật hẹn giờ nếu đây là bài kiểm tra có giới hạn thời gian.
            </p>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" bind:checked={hasTimer} />
            <span>Dùng hẹn giờ</span>
          </label>
        </div>

        {#if hasTimer}
          <div class="course-edit-field timer-field">
            <label class="course-edit-label" for="timerMinutes"
              >Số phút làm bài</label
            >
            <input
              id="timerMinutes"
              class="course-edit-input"
              type="number"
              min="1"
              bind:value={timerMinutes}
            />
          </div>
        {/if}
      </section>

      <section class="course-edit-panel mt-3">
        <div class="course-edit-toolbar">
          <div>
            <p class="course-edit-title-label">Ngân hàng câu hỏi</p>
            <p class="course-edit-help">
              Sắp xếp và cập nhật đáp án trực tiếp theo từng câu hỏi.
            </p>
          </div>
          <button class="course-edit-btn outline" on:click={addQuestion}
            >Thêm câu hỏi</button
          >
        </div>

        {#if !editedQuestions.length}
          <div class="course-edit-empty">
            Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên.
          </div>
        {:else}
          <div
            class="questions-dnd"
            use:dndzone={{
              items: editedQuestions,
              flipDurationMs: FLIP_MS,
              type: "questions",
              dropTargetStyle: {},
            }}
            on:consider={onQuestionsConsider}
            on:finalize={onQuestionsFinalize}
          >
            {#each editedQuestions as question, questionIndex (question.id)}
              <article
                class="question-card"
                animate:flip={{ duration: FLIP_MS }}
              >
                <div class="question-head">
                  <span
                    class="drag-handle"
                    aria-label="Kéo để sắp xếp câu hỏi"
                    title="Kéo để sắp xếp"
                  >
                    <i class="bi bi-grip-vertical" aria-hidden="true"></i>
                  </span>
                  <h4>Câu hỏi {questionIndex + 1}</h4>
                  <div class="course-edit-actions">
                    <button
                      class="course-edit-btn danger"
                      on:click={() => removeQuestion(questionIndex)}
                    >
                      Xóa câu hỏi
                    </button>
                  </div>
                </div>

              <div class="course-edit-field">
                <label
                  class="course-edit-label"
                  for={`question-${questionIndex}`}>Nội dung câu hỏi</label
                >
                <input
                  id={`question-${questionIndex}`}
                  class="course-edit-input"
                  type="text"
                  bind:value={question.questionText}
                />
              </div>

              <div class="answers-wrap">
                <div class="course-edit-toolbar mb-2">
                  <p class="course-edit-title-label">Danh sách lựa chọn</p>
                  <button
                    class="course-edit-btn outline"
                    on:click={() => addOption(questionIndex)}
                  >
                    Thêm lựa chọn
                  </button>
                </div>

                {#each question.options as option, optionIndex}
                  <div class="answer-row">
                    <input
                      class="course-edit-input"
                      type="text"
                      bind:value={option.text}
                      placeholder={`Lựa chọn ${optionIndex + 1}`}
                    />
                    <label class="answer-correct-toggle">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        on:change={() =>
                          toggleCorrectAnswer(questionIndex, optionIndex)}
                      />
                      <span>Đúng</span>
                    </label>
                    <button
                      class="course-edit-btn danger"
                      on:click={() => removeOption(questionIndex, optionIndex)}
                    >
                      Xóa
                    </button>
                  </div>
                {/each}
              </div>

              <div class="course-edit-field">
                <label
                  class="course-edit-label"
                  for={`explanation-${questionIndex}`}>Giải thích</label
                >
                <textarea
                  id={`explanation-${questionIndex}`}
                  class="course-edit-textarea"
                  bind:value={question.explanation}
                  placeholder="Giải thích vì sao đáp án đúng"
                ></textarea>
              </div>
            </article>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
{/if}

<style>
  .lesson-editor {
    min-height: 100%;
  }

  .toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #244476;
  }

  .toggle-wrap input {
    width: 16px;
    height: 16px;
  }

  .timer-field {
    max-width: 180px;
  }

  .question-card {
    border: 1px solid #d8e4ff;
    background: #fbfdff;
    border-radius: 14px;
    padding: 0.8rem;
    margin-bottom: 0.9rem;
  }

  .question-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }

  .question-head h4 {
    flex: 1;
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    color: #94a3b8;
    cursor: grab;
    font-size: 1.05rem;
    transition: color 0.15s;
  }
  .drag-handle:hover {
    color: #2563eb;
  }
  .drag-handle:active {
    cursor: grabbing;
  }

  .questions-dnd {
    display: flex;
    flex-direction: column;
  }
  :global(.questions-dnd.dragged-over) {
    background: rgba(37, 99, 235, 0.04);
    border-radius: 12px;
  }

  .question-head h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #153064;
  }

  .answers-wrap {
    border: 1px dashed #c5d8ff;
    border-radius: 12px;
    padding: 0.65rem;
    margin-bottom: 0.8rem;
    background: #f5f9ff;
  }

  .answer-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.45rem;
    margin-bottom: 0.5rem;
    align-items: center;
  }

  .answer-correct-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    color: #1e3e74;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .answer-correct-toggle input {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 768px) {
    .answer-row {
      grid-template-columns: 1fr;
    }

    .answer-correct-toggle {
      justify-content: flex-start;
    }
  }
</style>
