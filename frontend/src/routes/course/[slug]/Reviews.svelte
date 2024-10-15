<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { paginate, LightPaginationNav } from "svelte-paginate";
  import { addReview, updateReview, deleteReview } from "$lib/js/api";
  import { Progress } from "@sveltestrap/sveltestrap";
  import StarRating from "svelte-star-rating";

  // Dữ liệu được truyền vào
  export let course;
  export let isEnrolled;
  export let user;
  export let reviews;

  // Khai báo biến
  const dispatch = createEventDispatcher();
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
      alert("Vui lòng chọn số sao và nhập đánh giá của bạn.");
      return;
    }

    try {
      await addReview(courseId, userId, newReview);
      newReview = { rating: 0, comment: "" };
      await dispatch("reviewSubmitted");
    } catch (error) {
      console.error("Error creating review:", error);
    }
  };

  // Hàm xử lý khi cập nhật đánh giá
  const handleUpdateReview = async () => {
    if (!editingReview.rating || !editingReview.comment.trim()) {
      alert("Vui lòng chọn số sao và nhập đánh giá của bạn.");
      return;
    }

    try {
      await updateReview(editingReviewId, editingReview);
      isEdited = false;
      editingReviewId = null;
      editingReview = { rating: 0, comment: "" };
      await dispatch("reviewSubmitted");
    } catch (error) {
      console.error("Error updating review:", error);
    }
  };

  const handleEditReview = (review) => {
    isEdited = true;
    editingReviewId = review._id;
    editingReview = { ...review };
  };

  const handleDeleteReview = async (reviewId) => {
    if (confirm("Bạn có chắc chắn muốn xóa đánh giá này?")) {
      try {
        await deleteReview(reviewId);
        await dispatch("reviewSubmitted");
      } catch (error) {
        console.error("Error deleting review:", error);
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
  <h2>Đánh giá khóa học</h2>
  <div class="review-summary">
    <div class="rating-info">
      <div class="average-rating">
        <p>
          {averageRating}
          <StarRating {config} rating={Number(averageRating)} />
        </p>
        <p>({reviews.length} đánh giá)</p>
      </div>
      <div class="rating-distribution">
        {#each ratingCounts as count, index}
          <div class="rating-row">
            <span>{index + 1} sao:</span>
            <div style="flex:1;">
              <Progress value={(count * 100) / reviews.length} color="warning"
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

    <div style="flex:1; margin-left:40px">
      {#if user}
        {#if isEnrolled}
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
                <button type="submit"
                  >{isEdited ? "Lưu đánh giá" : "Gửi đánh giá"}</button
                >
                {#if isEdited}
                  <button
                    type="button"
                    on:click={() => {
                      isEdited = false;
                      editingReviewId = null;
                      editingReview = { rating: 0, comment: "" };
                    }}>Hủy</button
                  >
                {/if}
              </form>
            </div>
          {/if}
          {#if userReview && !isEdited}
            <div class="your-review">
              <h3>Đánh giá của bạn</h3>
              <div class="review-item">
                <div class="review-header">
                  <div class="review-thumbnail">
                    <img src={userReview.thumbnail} alt="" />
                    <span>{userReview.thumbnail}</span>
                  </div>
                  <div class="star-rating">
                    {#each { length: 5 } as _, i}
                      <i
                        class="bi bi-star-fill"
                        class:filled={userReview.rating > i}
                      />
                    {/each}
                  </div>
                  <p class="userId">
                    - {userReview.userName} -
                    {#if userReview.updatedAt}
                      {getTime(userReview.updatedAt)}
                    {:else}
                      {getTime(userReview.createdAt)}
                    {/if}
                  </p>
                  <button on:click={() => handleEditReview(userReview)}>
                    Sửa
                  </button>
                  <button on:click={() => handleDeleteReview(userReview._id)}>
                    Xóa
                  </button>
                </div>
                <p>{userReview.comment}</p>
              </div>
            </div>
          {/if}
        {:else if user.enrolledCourses.completedItems}
          {#if user.enrolledCourses.completedItems.length < 3}
            <p>Bạn cần hoàn thành ít nhất 2 bài học để viết đánh giá</p>
          {/if}
        {:else}
          <p>Bạn không thể đánh giá khóa học này vì chưa đăng ký.</p>
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
                  <img src={review.thumbnail} alt="" />
                </div>
                <div>
                  <p class="userId">
                    - {review.userName} - {getTime(review.updatedAt)}
                  </p>
                  <div class="star-rating">
                    {#each { length: 5 } as _, i}
                      <i
                        class="bi bi-star-fill"
                        class:filled={review.rating > i}
                      />
                    {/each}
                  </div>

                  <p>{review.comment}</p>
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
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  h2 {
    font-size: 24px;
    font-weight: 600;
  }

  .review-summary {
    display: flex;
    gap: 2rem;
  }

  .rating-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-basis: 30%;
  }

  .rating-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .rating-row span {
    min-width: 52px;
  }

  .write-review textarea {
    width: 100%;
    height: 80px;
    resize: vertical;
    margin-bottom: 0.5rem;
    border: 1px solid #aaa;
    border-radius: 8px;
    margin-top: 8px;
  }

  .review-list {
    margin-top: 2rem;
  }

  .review-item {
    border: 1px solid #ccc;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .review-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .userId {
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 8px;
  }

  .star-rating {
    display: inline-flex;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .star-rating .bi-star-fill {
    font-size: 1.5rem;
    color: #ccc; /* Màu sao chưa được chọn */
  }

  .star-rating .bi-star-fill.filled {
    color: orange; /* Màu sao đã được chọn */
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
</style>
