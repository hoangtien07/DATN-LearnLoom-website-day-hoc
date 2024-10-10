<!-- frontend/src/routes/admin/course/create/+page.svelte -->
<script>
  import { createCourse } from "$lib/js/api";
  import CourseForm from "$lib/components/courseBuilder.svelte";

  const handleSave = async (course) => {
    await createCourse(course);
    //   try {
    //     const response = await axios.post("/api/courses", course);
    //     alert("Course created successfully");
    //     // handle success (e.g., navigate to the course page)
    //   } catch (error) {
    //     console.error("Error creating course:", error);
    //   }
    //   // window.location.href = "/";
  };
</script>

<h1>Create New Course</h1>
<CourseForm onSave={handleSave} />
