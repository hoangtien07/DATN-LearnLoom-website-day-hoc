import mongoose from "mongoose";
import Course from "../models/Course.js";
import { Lesson } from "../models/Lesson.js";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/svelte-courses";
const APPLY_MODE = process.argv.includes("--apply");
const AVG_LESSON_MINUTES = 45;
const FALLBACK_HOURS = [3, 8, 15, 28, 45];

const roundToOneDecimal = (value) => Math.round(value * 10) / 10;

const isValidDuration = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const countSectionItems = (sections) => {
  if (!Array.isArray(sections)) return 0;

  return sections.reduce((total, section) => {
    const items = Array.isArray(section?.items) ? section.items.length : 0;
    return total + items;
  }, 0);
};

const detectDurationForCourse = async (course, index) => {
  const lessonDocs = await Lesson.find({ course: course._id })
    .select("duration")
    .lean();

  const totalLessonMinutes = lessonDocs.reduce((sum, lesson) => {
    return sum + (isValidDuration(lesson.duration) ? lesson.duration : 0);
  }, 0);

  if (totalLessonMinutes > 0) {
    return {
      duration: roundToOneDecimal(totalLessonMinutes / 60),
      source: "lessons",
    };
  }

  const sectionItemCount = countSectionItems(course.sections);
  if (sectionItemCount > 0) {
    return {
      duration: roundToOneDecimal((sectionItemCount * AVG_LESSON_MINUTES) / 60),
      source: "sections_items_estimate",
    };
  }

  if (isValidDuration(course.totalLessons)) {
    return {
      duration: roundToOneDecimal(
        (course.totalLessons * AVG_LESSON_MINUTES) / 60,
      ),
      source: "totalLessons_estimate",
    };
  }

  return {
    duration: FALLBACK_HOURS[index % FALLBACK_HOURS.length],
    source: "fallback_bucket",
  };
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const courses = await Course.find({ visible: true })
      .select("_id name slug totalDuration totalLessons sections")
      .lean();

    const missingDurationCourses = courses.filter(
      (course) => !isValidDuration(course.totalDuration),
    );

    if (missingDurationCourses.length === 0) {
      console.log("No visible courses need duration backfill.");
      return;
    }

    const sourceStats = {
      lessons: 0,
      sections_items_estimate: 0,
      totalLessons_estimate: 0,
      fallback_bucket: 0,
    };

    const updates = [];

    for (let i = 0; i < missingDurationCourses.length; i += 1) {
      const course = missingDurationCourses[i];
      const { duration, source } = await detectDurationForCourse(course, i);

      sourceStats[source] += 1;

      updates.push({
        updateOne: {
          filter: { _id: course._id },
          update: { $set: { totalDuration: duration } },
        },
      });
    }

    console.log("Backfill preview:");
    console.log(
      JSON.stringify(
        {
          totalVisibleCourses: courses.length,
          missingDurationCourses: missingDurationCourses.length,
          sourceStats,
          applyMode: APPLY_MODE,
        },
        null,
        2,
      ),
    );

    if (!APPLY_MODE) {
      console.log("Dry run complete. Re-run with --apply to write changes.");
      return;
    }

    const result = await Course.bulkWrite(updates);
    console.log(
      JSON.stringify(
        {
          message: "Backfill applied successfully.",
          modifiedCount: result.modifiedCount,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
