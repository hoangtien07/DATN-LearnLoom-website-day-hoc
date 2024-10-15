<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { fetchCourseBySlug, updateCourse } from "$lib/js/api";
  import { writable } from "svelte/store";

  let course = writable({}); // Use a writable store
  let slug = $page.params.slug;
  let isLoading = true;
  let newFAQ = { question: "", answer: "" };

  onMount(async () => {
    try {
      const fetchedCourse = await fetchCourseBySlug(slug);
      course.set(fetchedCourse); // Initialize the store
    } catch (err) {
      console.error("Error fetching course:", err);
    } finally {
      isLoading = false;
    }
  });

  const handleAddFAQ = async () => {
    if (newFAQ.question && newFAQ.answer) {
      course.update((currentCourse) => ({
        ...currentCourse,
        faqs: [...currentCourse.faqs, newFAQ],
      }));
      try {
        await updateCourse(slug, $course); // Update with store value
        newFAQ = { question: "", answer: "" };
      } catch (error) {
        console.error("Error updating course:", error);
      }
    }
  };

  const handleDeleteFAQ = async (index) => {
    course.update((currentCourse) => ({
      ...currentCourse,
      faqs: currentCourse.faqs.filter((_, i) => i !== index),
    }));
    try {
      await updateCourse(slug, $course); // Update with store value
    } catch (error) {
      console.error("Error updating course:", error);
    }
  };
</script>

{#if isLoading}
  <p>Loading course information...</p>
{:else if $course}
  <div class="faq-container">
    <h2>Frequently Asked Questions</h2>

    {#if $course.faqs.length === 0}
      <p>No FAQs yet.</p>
    {:else}
      <ul>
        {#each $course.faqs as faq, index}
          <li>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
            <button on:click={() => handleDeleteFAQ(index)}>Delete</button>
          </li>
        {/each}
      </ul>
    {/if}

    <h3>Add New FAQ</h3>
    <input type="text" placeholder="Question" bind:value={newFAQ.question} />
    <textarea placeholder="Answer" bind:value={newFAQ.answer} />
    <button on:click={handleAddFAQ}>Add FAQ</button>
  </div>
{/if}
