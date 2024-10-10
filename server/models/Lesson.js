import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "video", "audio", "zoom", "meet"],
      required: true,
    },
    resourceType: String, // for video, audio types
    resourceURL: String, // for video, audio link
    zoomURL: String,
    meetURL: String,
    duration: String,
    allowPreview: { type: Boolean, default: false },
    unlockAfter: Date,
    description: String,
    content: String,
    materials: [{ type: String }], // URLs or paths to uploaded files
    classroomRules: String,
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
