//create express app
const exp = require("express");
const mongoClient = require("mongodb").MongoClient;
require("dotenv").config();
const cors = require("cors");
const app = exp();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

//to parse the body
app.use(exp.json());

//connect to database
mongoClient
  .connect(process.env.DB_URL)
  .then((client) => {
    //get db object
    const nikedb = client.db("nikedb");
    //get collection Object
    const usersCollection = nikedb.collection("usersCollection");
    const stallsCollection = nikedb.collection("stallsCollection");
    const ordersCollection = nikedb.collection("ordersCollection");
    const feedbackCollection = nikedb.collection("feedbackCollection");
    const notificationsCollection = nikedb.collection("notificationsCollection");
    //share collection object with express app
    app.set("usersCollection", usersCollection);
    app.set("stallsCollection", stallsCollection);
    app.set("ordersCollection", ordersCollection);
    app.set("feedbackCollection",feedbackCollection);
    app.set("notificationsCollection", notificationsCollection);
    //confirm db connection status
    console.log("DB Connection Successful");
  })
  .catch((err) => console.log("Error in connection of database", err));

//import API routes
const userApp = require("./APIs/user-api");
const stallApp = require("./APIs/stall-api");
const orderApp = require("./APIs/order-api");
const feedbackApp = require("./APIs/feedback-api");
const notificationApp = require("./APIs/notification-api");
app.use("/user-api", userApp);
app.use("/stall-api", stallApp);
app.use("/order-api", orderApp);
app.use("/feedback-api", feedbackApp);
app.use("/notification-api", notificationApp);

//express error handler
app.use((err, req, res, next) => {
  res.send({ message: "error", payload: err.message });
});

//assign Port number
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
