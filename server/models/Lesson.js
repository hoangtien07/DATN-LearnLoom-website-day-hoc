import mongoose from "mongoose";
const { Schema } = mongoose;

// Base Lesson Schema
const baseLessonSchema = new mongoose.Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    name: { type: String, required: true },
    description: { type: String },
    duration: { type: Number }, // Duration in minutes
  },
  { timestamps: true, discriminatorKey: "type" }
);

// Text Lesson
const TextLesson = baseLessonSchema.clone();
TextLesson.add({
  content: { type: String },
});

// Video Lesson
const VideoLesson = baseLessonSchema.clone();
VideoLesson.add({
  videoUrl: { type: String },
});

// Audio Lesson
const AudioLesson = baseLessonSchema.clone();
AudioLesson.add({
  audioUrl: { type: String },
});

// Live Lesson
const LiveLesson = baseLessonSchema.clone();
LiveLesson.add({
  liveDate: { type: Date },
  link: { type: String },
});

const Lesson = mongoose.model("Lesson", baseLessonSchema);
const TextLessonModel = Lesson.discriminator("TextLesson", TextLesson);
const VideoLessonModel = Lesson.discriminator("VideoLesson", VideoLesson);
const AudioLessonModel = Lesson.discriminator("AudioLesson", AudioLesson);
const LiveLessonModel = Lesson.discriminator("LiveLesson", LiveLesson);

export {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
  AudioLessonModel,
  LiveLessonModel,
};
