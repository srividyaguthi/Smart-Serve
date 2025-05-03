// feedback-api.js
const express = require("express");
const expAsyncHandler = require("express-async-handler");

const feedbackApp = express.Router();

let feedbackCollection;
let notificationsCollection;

feedbackApp.use((req, res, next) => {
  feedbackCollection = req.app.get("feedbackCollection");
  notificationsCollection = req.app.get("notificationsCollection");
  next();
});

// POST feedback with selected reasons and optional text
feedbackApp.post(
    "/submit",
    expAsyncHandler(async (req, res) => {
      const { studentUsername, stallName, feedbackOptions, feedbackText } = req.body;
  
      if (!studentUsername || !stallName || !Array.isArray(feedbackOptions)) {
        return res.status(400).json({ message: "Invalid or missing fields" });
      }
  
      const feedback = {
        studentUsername,
        stallName,
        feedbackOptions,
        feedbackText: feedbackText || "",
        submittedAt: new Date(),
      };
  
      // Insert feedback
      await feedbackCollection.insertOne(feedback);
  
      // 🔔 Notify shopkeeper if negative feedback exists
      const notifyTriggers = ["Quality issue", "Service delay", "Quality issues"];
      const shouldNotify = feedbackOptions.some(option =>
        notifyTriggers.includes(option)
      );
  
      if (shouldNotify) {
        const notification = {
          stallName,
          message: `New feedback from ${studentUsername} includes critical issues: ${feedbackOptions.join(", ")}`,
          timestamp: new Date(),
          read: false,
        };
        await notificationsCollection.insertOne(notification);
      }
  
      res.status(201).json({ message: "Feedback submitted successfully" });
    })
  );
  

// GET all feedbacks for a particular stall
feedbackApp.get(
  "/stall/:stallName",
  expAsyncHandler(async (req, res) => {
    const stallName = req.params.stallName;

    const feedbacks = await feedbackCollection.find({ stallName }).toArray();
    res.send(feedbacks);
  })
);

// GET all feedbacks from a student
feedbackApp.get(
  "/student/:studentUsername",
  expAsyncHandler(async (req, res) => {
    const studentUsername = req.params.studentUsername;
    const feedbacks = await feedbackCollection.find({ studentUsername }).toArray();
    res.send(feedbacks);
  })
);

module.exports = feedbackApp;
