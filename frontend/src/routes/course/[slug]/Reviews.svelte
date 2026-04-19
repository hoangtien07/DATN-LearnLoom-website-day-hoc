<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import { addReview, updateReview, deleteReview } from "$lib/js/api";
  import { Progress } from "@sveltestrap/sveltestrap";
  import StarRating from "svelte-star-rating";
  import { pushToast } from "$lib/stores/toast.js";
  import { confirm as uiConfirm } from "$lib/stores/confirm.js";

  // Dữ liệu được truyền vào
  export let course;
  export let isEnrolled;
  export let user;
  export let reviews;
  export let userProgress = 0; // BR-10: tiến độ học của user, cần ≥ MIN_PROGRESS để review
  export const MIN_PROGRESS = 50;

  // Khai báo biến
  const dispatch = createEventDispatcher();
  let isSubmitting = false;
  let courseId = "";
  let userId = "";
  let averageRating = 0;
  let ratingCounts = [0, 0, 0, 0, 0];
  let currentPage = 1;
  let pageSize = 3;
  let isEdited = false;
  let editingReviewId = null;
  let userReview = null;
  let newReview = {
    rating: 0,
    comment: "",
  };
  let editingReview = {
    rating: 0,
    comment: "",
  };

  const avatarInitial = (name) => {
    if (!name) return "U";
    return name.trim().charAt(0).toUpperCase();
  };

  const hasImage = (value) =>
    typeof value === "string" &&
    (value.startsWith("http") || value.startsWith("/"));

  // Config cho rating star
  const config = {
    fullColor: "#ffa500",
  };

  // Khai báo Reactive state
  $: paginatedReviews = paginate({ items: reviews, pageSize, currentPage });
  $: if (course) {
    courseId = course._id;
  }
  $: if (user) {
    userId = user._id;
  }
  $: if (reviews) {
    calculateAverageRating();
    calculateRatingCounts();
  }
  $: if (reviews && user) {
    userReview = reviews.find((review) => review.userId === userId);
  }

  // Tính toán điểm đánh giá trung bình
  const calculateAverageRating = () => {
    if (reviews.length === 0) {
      averageRating = 0;
      return;
    }
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    averageRating = (totalRating / reviews.length).toFixed(1);
  };

  // Tính toán số lượng đánh giá cho mỗi mức sao
  const calculateRatingCounts = () => {
    ratingCounts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      ratingCounts[review.rating - 1]++;
    });
  };

  // Hàm xử lý khi gửi đánh giá mới
  const handleCreateReview = async () => {
    if (!newReview.rating || !newReview.comment.trim()) {
      pushToast("Vui lòng chọn số sao và nhập đánh giá.", { variant: "warn" });
      return;
    }
    if (isSubmitting) return;
    try {
      isSubmitting = true;
      await addReview(courseId, userId, newReview);
      newReview = { rating: 0, comment: "" };
      pushToast("Đã gửi đánh giá, cảm ơn bạn!", { variant: "success" });
      await dispatch("reviewSubmitted");
    } catch (error) {
      const code = error?.response?.data?.code;
      const existingId = error?.response?.data?.existingReviewId;
      if (code === "REVIEW_ALREADY_EXISTS" && existingId) {
        const existing = reviews.find((r) => r._id === existingId);
        handleEditReview(existing || { _id: existingId, ...newReview });
        pushToast("Bạn đã đánh giá khóa học này — đang mở chế độ cập nhật.", {
          variant: "info",
        });
      } else if (code === "PROGRESS_INSUFFICIENT") {
        const { currentProgress, minProgress } = error.response.data;
        pushToast(
          `Cần hoàn thành tối thiểu ${minProgress}% để đánh giá (hiện ${currentProgress}%).`,
          { variant: "warn", durationMs: 6000 },
        );
      } else {
        pushToast(
          error?.response?.data?.message || "Không gửi được đánh giá.",
          { variant: "error" },
        );
      }
      console.error("Error creating review:", error);
    } finally {
      isSubmitting = false;
    }
  };

  // Hàm xử lý khi cập nhật đánh giá
  const handleUpdateReview = async () => {
    if (!editingReview.rating || !editingReview.comment.trim()) {
      pushToast("Vui lòng chọn số sao và nhập đánh giá.", { variant: "warn" });
      return;
    }
    if (isSubmitting) return;
    try {
      isSubmitting = true;
      await updateReview(editingReviewId, editingReview);
      isEdited = false;
      editingReviewId = null;
      editingReview = { rating: 0, comment: "" };
      pushToast("Đã cập nhật đánh giá.", { variant: "success" });
      await dispatch("reviewSubmitted");
    } catch (error) {
      console.error("Error updating review:", error);
      pushToast("Không cập nhật được, thử lại sau.", { variant: "error" });
    } finally {
      isSubmitting = false;
    }
  };

  const handleEditReview = (review) => {
    isEdited = true;
    editingReviewId = review._id;
    editingReview = { ...review };
  };

  const handleDeleteReview = async (reviewId) => {
    const ok = await uiConfirm({
      title: "Xóa đánh giá",
      message: "Bạn có chắc chắn muốn xóa đánh giá này?",
      confirmLabel: "Xóa",
      variant: "danger",
    });
    if (ok) {
      try {
        await deleteReview(reviewId);
        pushToast("Đã xóa đánh giá.", { variant: "success" });
        await dispatch("reviewSubmitted");
      } catch (error) {
        console.error("Error deleting review:", error);
        pushToast("Không xóa được đánh giá.", { variant: "error" });
      }
    }
  };

  // Hàm xử lý khi click vào sao
  const handleStarClick = (rating) => {
    if (isEdited) {
      editingReview.rating = rating;
    } else {
      newReview.rating = rating;
    }
  };

  // Hàm xử lý ngày tháng
  const getTime = (time) => {
    const date = new Date(time);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    return formattedDate;
  };

  onMount(async () => {
    calculateAverageRating();
    calculateRatingCounts();
  });
</script>

<div class="course-reviews">
  <h2>Đánh giá từ học viên</h2>
  <div class="review-summary">
    <div class="rating-info">
      <div class="average-rating">
        <p class="average-value">
          {averageRating || "0.0"}
          <StarRating {config} rating={Number(averageRating)} />
        </p>
        <p class="average-caption">{reviews.length} đánh giá</p>
      </div>
      <div class="rating-distribution">
        {#each ratingCounts as count, index}
          <div class="rating-row">
            <span>{index + 1} sao:</span>
            <div style="flex:1;">
              <Progress
                value={reviews.length ? (count * 100) / reviews.length : 0}
                color="warning"
              ></Progress>
            </div>

            <!-- <input
              type="range"
              min="0"
              max={reviews.length}
              value={count}
              disabled
            /> -->
            {#if reviews.length}
              <span>{((count / reviews.length) * 100).toFixed(0)}%</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="review-column">
      {#if user}
        {#if isEnrolled && userProgress >= MIN_PROGRESS}
          {#if isEdited || !userReview}
            <div class="write-review">
              <h3>
                {isEdited ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}
              </h3>
              <form
                on:submit|preventDefault={isEdited
                  ? handleUpdateReview
                  : handleCreateReview}
              >
                <div class="star-rating">
                  {#each { length: 5 } as _, i}
                    <button
                      type="button"
                      class="star"
                      on:click={() => handleStarClick(i + 1)}
                      aria-label={`Rate ${i + 1} stars`}
                    >
                      <i
                        class="bi bi-star-fill"
                        class:filled={isEdited
                          ? editingReview.rating > i
                          : newReview.rating > i}
                      ></i>
                    </button>
                  {/each}
                </div>
                {#if isEdited}
                  <textarea
                    bind:value={editingReview.comment}
                    placeholder="Viết đánh giá của bạn..."
                  />
                {:else}
                  <textarea
                    bind:value={newReview.comment}
                    placeholder="Viết đánh giá của bạn..."
                  />
                {/if}
                <div class="review-form-actions">
                  <button
                    type="submit"
                    class="review-btn primary"
                    disabled={isSubmitting}
                    >{isSubmitting
                      ? "Đang gửi..."
                      : isEdited
                        ? "Lưu đánh giá"
                        : "Gửi đánh giá"}</button
                  >
                  {#if isEdited}
                    <button
                      type="button"
                      class="review-btn ghost"
                      on:click={() => {
                        isEdited = false;
                        editingReviewId = null;
                        editingReview = { rating: 0, comment: "" };
                      }}>Hủy</button
                    >
                  {/if}
                </div>
              </form>
            </div>
          {/if}
          {#if userReview && !isEdited}
            <div class="your-review">
              <h3>Đánh giá của bạn</h3>
              <div class="review-item">
                <div class="review-header">
                  <div class="review-thumbnail">
                    {#if hasImage(userReview.thumbnail)}
                      <img
                        src={userReview.thumbnail}
                        alt={userReview.userName}
                      />
                    {:else}
                      <span class="thumbnail-fallback"
                        >{avatarInitial(userReview.userName)}</span
                      >
                    {/if}
                  </div>
                  <div class="review-main-meta">
                    <div class="star-rating">
                      {#each { length: 5 } as _, i}
                        <i
                          class="bi bi-star-fill"
                          class:filled={userReview.rating > i}
                        />
                      {/each}
                    </div>
                    <p class="userId">
                      {userReview.userName}
                      <span>
                        {#if userReview.updatedAt}
                          {getTime(userReview.updatedAt)}
                        {:else}
                          {getTime(userReview.createdAt)}
                        {/if}
                      </span>
                    </p>
                  </div>
                  <div class="review-actions">
                    <button
                      class="review-btn ghost"
                      on:click={() => handleEditReview(userReview)}
                    >
                      Sửa
                    </button>
                    <button
                      class="review-btn danger"
                      on:click={() => handleDeleteReview(userReview._id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <p>{userReview.comment}</p>
              </div>
            </div>
          {/if}
        {:else if isEnrolled}
          <div class="review-gate">
            <p>
              Cần hoàn thành tối thiểu <strong>{MIN_PROGRESS}%</strong> khóa học
              để được viết đánh giá.
            </p>
            <div class="progress-inline">
              <Progress value={userProgress} color="info" />
              <span class="progress-label"
                >Tiến độ hiện tại: <strong>{userProgress}%</strong></span
              >
            </div>
          </div>
        {:else}
          <p class="review-gate">
            Bạn cần đăng ký và học khóa học này mới có thể đánh giá.
          </p>
        {/if}
      {/if}

      <div class="review-list">
        {#if paginatedReviews.length === 0}
          <h4>Khóa học này chưa có đánh giá</h4>
        {:else}
          <h4>Tất cả đánh giá</h4>
          {#each paginatedReviews as review}
            <div class="review-item">
              <div class="review-header">
                <div class="review-thumbnail">
                  {#if hasImage(review.thumbnail)}
                    <img src={review.thumbnail} alt={review.userName} />
                  {:else}
                    <span class="thumbnail-fallback"
                      >{avatarInitial(review.userName)}</span
                    >
                  {/if}
                </div>
                <div class="review-main-meta">
                  <p class="userId">
                    {review.userName}
                    <span>{getTime(review.updatedAt)}</span>
                  </p>
                  <div class="star-rating">
                    {#each { length: 5 } as _, i}
                      <i
                        class="bi bi-star-fill"
                        class:filled={review.rating > i}
                      />
                    {/each}
                  </div>

                  <p class="review-comment">{review.comment}</p>
                </div>

                <!-- {#if review.userId === userId}
                  <button on:click={() => handleEditReview(review)}>Sửa</button>
                  <button on:click={() => handleDeleteReview(review._id)}
                    >Xóa</button
                  >
                {/if} -->
              </div>
            </div>
          {/each}
          <LightPaginationNav
            totalItems={reviews.length}
            {pageSize}
            {currentPage}
            limit={1}
            showStepOptions={true}
            on:setPage={(e) => (currentPage = e.detail.page)}
          />
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .course-reviews {
    margin-top: 2.2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #fff;
    border: 1px solid #e2e8f4;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 8px 24px rgba(15, 40, 90, 0.08);
  }

  .review-gate {
    background: #f1f5f9;
    border: 1px dashed #94a3b8;
    padding: 1rem;
    border-radius: 10px;
    color: #334155;
    font-size: 0.92rem;
  }
  .review-gate p {
    margin: 0 0 0.5rem;
  }
  .progress-inline {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .progress-inline :global(.progress) {
    flex: 1;
  }
  .progress-label {
    white-space: nowrap;
    font-size: 0.85rem;
    color: #475569;
  }

  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #152f61;
  }

  .review-summary {
    display: flex;
    gap: 1.2rem;
    align-items: flex-start;
  }

  .rating-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-basis: 320px;
    max-width: 360px;
    background: #f8fbff;
    border: 1px solid #dde8fa;
    border-radius: 14px;
    padding: 0.9rem;
  }

  .average-value {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    color: #0f3268;
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .average-caption {
    margin: 0;
    color: #5a6f95;
    font-weight: 600;
  }

  .rating-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 0.45rem;
  }

  .rating-row span {
    min-width: 58px;
    font-size: 0.9rem;
    color: #2a3f67;
    font-weight: 600;
  }

  .review-column {
    flex: 1;
    min-width: 0;
  }

  .write-review,
  .your-review,
  .review-list {
    border: 1px solid #e2e8f4;
    border-radius: 14px;
    background: #fff;
    padding: 0.9rem;
  }

  .write-review h3,
  .your-review h3,
  .review-list h4 {
    margin: 0 0 0.7rem;
    font-size: 1.15rem;
    color: #163567;
    font-weight: 700;
  }

  .write-review textarea {
    width: 100%;
    min-height: 94px;
    resize: vertical;
    margin-bottom: 0;
    border: 1px solid #ccd8ec;
    border-radius: 8px;
    margin-top: 8px;
    padding: 0.55rem 0.65rem;
    color: #223963;
  }

  .review-form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .review-btn {
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 0.4rem 0.72rem;
    font-size: 0.86rem;
    font-weight: 700;
    cursor: pointer;
  }

  .review-btn.primary {
    background: #1f63d6;
    color: #fff;
  }

  .review-btn.ghost {
    background: #fff;
    border-color: #c8d6ef;
    color: #1d3f77;
  }

  .review-btn.danger {
    background: #fff;
    border-color: #efc5c5;
    color: #a33434;
  }

  .review-list {
    margin-top: 0.9rem;
  }

  .review-item {
    border: 1px solid #dbe5f6;
    border-radius: 12px;
    padding: 0.8rem;
    margin-bottom: 0.65rem;
    background: #fbfdff;
  }

  .review-header {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    margin-bottom: 0.4rem;
    justify-content: space-between;
  }

  .review-main-meta {
    flex: 1;
    min-width: 0;
  }

  .userId {
    font-size: 0.88rem;
    color: #27406e;
    margin-bottom: 0.35rem;
    font-weight: 700;
  }

  .userId span {
    margin-left: 0.45rem;
    color: #64789b;
    font-weight: 500;
  }

  .star-rating {
    display: inline-flex;
    cursor: pointer;
    margin-bottom: 0.35rem;
  }

  .star-rating .bi-star-fill {
    font-size: 1.35rem;
    color: #c5cedd;
  }

  .star-rating .bi-star-fill.filled {
    color: #f5b301;
  }

  .review-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .review-thumbnail {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
  }
  .review-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumbnail-fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: #2d5ab5;
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
  }

  .review-comment {
    margin: 0;
    color: #233a62;
  }

  @media (max-width: 980px) {
    .review-summary {
      flex-direction: column;
    }

    .rating-info {
      flex-basis: auto;
      max-width: none;
      width: 100%;
    }
  }

  @media (max-width: 680px) {
    .course-reviews {
      padding: 0.75rem;
    }

    .review-header {
      flex-wrap: wrap;
    }

    .review-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .star-rating .bi-star-fill {
      font-size: 1.15rem;
    }
  }
</style>
