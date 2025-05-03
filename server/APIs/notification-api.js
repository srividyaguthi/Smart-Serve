// notification-api.js
const express = require("express");
const expAsyncHandler = require("express-async-handler");

const notificationApp = express.Router();

let notificationsCollection;

notificationApp.use((req, res, next) => {
  notificationsCollection = req.app.get("notificationsCollection");
  next();
});

// GET all notifications for a particular stall
notificationApp.get(
  "/stall/:stallName",
  expAsyncHandler(async (req, res) => {
    const stallName = req.params.stallName;

    // Fetch all notifications for the given stall
    const notifications = await notificationsCollection.find({ stallName }).toArray();
    res.send(notifications);
  })
);

// GET all notifications for a particular user (optional)
notificationApp.get(
  "/user/:studentUsername",
  expAsyncHandler(async (req, res) => {
    const studentUsername = req.params.studentUsername;

    // Fetch all notifications for the given user
    const notifications = await notificationsCollection.find({ studentUsername }).toArray();
    res.send(notifications);
  })
);

module.exports = notificationApp;
