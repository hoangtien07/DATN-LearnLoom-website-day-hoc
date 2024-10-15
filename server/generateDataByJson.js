import mongoose from "mongoose";
import fs from "fs";
const jsonData = JSON.parse(fs.readFileSync("./data.json", "utf-8"));
const { Schema } = mongoose;

const itemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ["lesson", "assignment"],
    required: true,
  },
  itemId: {
    type: Schema.Types.ObjectId,
    refPath: "itemType", // Use "itemType" for dynamic referencing
    required: true,
  },
  order: { type: Number, default: 0 },
});

const sectionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  items: [itemSchema],
});

// Define your course schema
const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    summary: { type: String },
    description: { type: String, required: true },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    overviewVideo: { type: String },
    level: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    totalLessons: { type: Number },
    totalDuration: { type: Number },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    totalStudentsEnrolled: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    image_url: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
      required: true,
    },
    old_price: {
      type: Number,
      default: 0,
    },
    is_published: {
      type: Boolean,
      required: true,
    },
    is_selling: {
      type: Boolean,
      default: false,
    },
    published_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Create the course model
const Course = mongoose.model("Course", courseSchema);

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/svelte-courses", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Transform and save data
const transformData = (jsonData) => {
  return jsonData.units[0].items.map((item) => {
    //   return jsonData.items.map((item) => {
    return {
      name: item.title,
      summary: item.headline,
      description: item.headline,
      teacher: "66a70f894d3b8c232464ce42", // Replace with actual ObjectId
      overviewVideo: item.preview_url,
      level: item.instructional_level_simple,
      subject: "Giảng dạy & Học thuật",
      faqs: [],
      totalLessons: item.num_published_lectures,
      totalDuration: parseFloat(item.content_info_short),
      slug: item.published_title,
      totalStudentsEnrolled: item.num_subscribers,
      avgRating: item.avg_rating_recent,
      visible: true,
      image_url: item.image_750x422,
      price: 0,
      old_price: 0,
      is_published: true,
      is_selling: item.is_paid,
      published_at: new Date(item.published_time),
    };
  });
};

// Example JSON data
// const jsonData = {};

const saveCourses = async () => {
  try {
    const courses = transformData(jsonData);
    await Course.insertMany(courses);
    console.log("Courses saved successfully!");
  } catch (error) {
    console.error("Error saving courses:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Call the save function
saveCourses();
