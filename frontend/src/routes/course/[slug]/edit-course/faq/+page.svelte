<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { fetchCourseBySlug, updateCourse } from "$lib/js/api";

  let course = null;
  let slug = $page.params.slug;
  let isLoading = true;
  let isSaving = false;
  let statusMessage = "";
  let statusType = "";
  let newFAQ = { question: "", answer: "" };

  onMount(async () => {
    try {
      course = await fetchCourseBySlug(slug);
      course.faqs = course.faqs || [];
    } catch (err) {
      console.error("Error fetching course:", err);
      statusMessage = "Không thể tải nội dung FAQ.";
      statusType = "error";
    } finally {
      isLoading = false;
    }
  });

  const setStatus = (message, type = "") => {
    statusMessage = message;
    statusType = type;
  };

  const persistFaqs = async (nextFaqs) => {
    if (!course) {
      return;
    }

    isSaving = true;
    setStatus("Đang đồng bộ FAQ...", "");

    try {
      const updatedCourse = {
        ...course,
        faqs: nextFaqs,
      };

      await updateCourse(slug, updatedCourse);
      course = updatedCourse;
      setStatus("Đồng bộ FAQ thành công.", "success");
    } catch (error) {
      console.error("Error updating course:", error);
      setStatus("Không thể lưu FAQ. Vui lòng thử lại.", "error");
    } finally {
      isSaving = false;
    }
  };

  const handleAddFAQ = async () => {
    const question = newFAQ.question.trim();
    const answer = newFAQ.answer.trim();

    if (!question || !answer) {
      setStatus("Vui lòng nhập đầy đủ câu hỏi và câu trả lời.", "error");
      return;
    }

    const nextFaqs = [...(course?.faqs || []), { question, answer }];
    await persistFaqs(nextFaqs);
    newFAQ = { question: "", answer: "" };
  };

  const handleDeleteFAQ = async (index) => {
    const targetFaq = course?.faqs?.[index];
    if (!targetFaq) {
      return;
    }

    const confirmDelete = confirm(`Xóa FAQ: "${targetFaq.question}" ?`);
    if (!confirmDelete) {
      return;
    }

    const nextFaqs = course.faqs.filter((_, i) => i !== index);
    await persistFaqs(nextFaqs);
  };
</script>

{#if isLoading}
  <div class="course-edit-empty">Đang tải danh sách câu hỏi thường gặp...</div>
{:else if course}
  <div class="faq-manager">
    <div class="course-edit-toolbar">
      <div>
        <h2 class="course-edit-section-title">Hỏi đáp (FAQ)</h2>
        <p class="course-edit-section-subtitle">
          Tạo một thư viện câu hỏi rõ ràng để giảm hỗ trợ thủ công và tăng tỷ lệ
          hoàn tất thanh toán.
        </p>
      </div>
    </div>

    {#if statusMessage}
      <p class={`course-edit-status ${statusType}`}>{statusMessage}</p>
    {/if}

    <section class="course-edit-panel">
      <div class="course-edit-toolbar">
        <div>
          <p class="course-edit-title-label">Thêm câu hỏi mới</p>
          <p class="course-edit-help">
            Viết theo ngôn ngữ ngắn gọn, tập trung đúng băn khoăn của học viên.
          </p>
        </div>
        <button
          class="course-edit-btn primary"
          on:click={handleAddFAQ}
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Thêm FAQ"}
        </button>
      </div>

      <div class="course-edit-field">
        <label class="course-edit-label" for="faqQuestion">Câu hỏi</label>
        <input
          id="faqQuestion"
          class="course-edit-input"
          type="text"
          bind:value={newFAQ.question}
          placeholder="Ví dụ: Tôi có thể học khóa này trên điện thoại không?"
        />
      </div>

      <div class="course-edit-field">
        <label class="course-edit-label" for="faqAnswer">Câu trả lời</label>
        <textarea
          id="faqAnswer"
          class="course-edit-textarea"
          bind:value={newFAQ.answer}
          placeholder="Mô tả cụ thể chính sách, thời lượng hoặc quyền lợi liên quan"
        ></textarea>
      </div>
    </section>

    <section class="course-edit-panel mt-3">
      <div class="course-edit-toolbar">
        <p class="course-edit-title-label">Danh sách FAQ hiện tại</p>
        <span class="course-edit-status">Tổng cộng: {course.faqs.length}</span>
      </div>

      {#if course.faqs.length === 0}
        <div class="course-edit-empty">
          Chưa có FAQ nào. Hãy thêm câu hỏi đầu tiên ngay bên trên.
        </div>
      {:else}
        <div class="faq-list">
          {#each course.faqs as faq, index}
            <article class="faq-item">
              <div class="faq-item-head">
                <h3>{faq.question}</h3>
                <button
                  class="course-edit-btn danger"
                  on:click={() => handleDeleteFAQ(index)}
                  disabled={isSaving}
                >
                  Xóa
                </button>
              </div>
              <p>{faq.answer}</p>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
{:else}
  <div class="course-edit-empty">
    Không tìm thấy thông tin khóa học để quản lý FAQ.
  </div>
{/if}

<style>
  .faq-manager {
    min-height: 100%;
  }

  .faq-list {
    display: grid;
    gap: 0.75rem;
  }

  .faq-item {
    border: 1px solid #d8e4ff;
    border-radius: 12px;
    background: #fbfdff;
    padding: 0.8rem;
  }

  .faq-item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.45rem;
    flex-wrap: wrap;
  }

  .faq-item h3 {
    margin: 0;
    font-size: 0.95rem;
    color: #153064;
    font-weight: 700;
    flex: 1;
  }

  .faq-item p {
    margin: 0;
    color: #354f7d;
    font-size: 0.9rem;
    line-height: 1.55;
  }
</style>
