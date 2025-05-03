const exp = require("express");
const bcryptjs = require("bcryptjs");
const expAsyncHandler = require("express-async-handler");
const userApp = exp.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Get collection app
userApp.use((req, res, next) => {
  usersCollection = req.app.get("usersCollection");
  next();
});

// User registration
userApp.post(
  "/user",
  expAsyncHandler(async (req, res) => {
    const newUser = req.body;
    
    if (!newUser.username || !newUser.password || !newUser.email || 
        !newUser.firstName || !newUser.lastName || !newUser.userType) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const dbUser = await usersCollection.findOne({
      $or: [{ username: newUser.username }, { email: newUser.email }],
    });

    if (dbUser !== null) {
      return res.status(400).send("User or Email already exists");
    }

    const hashedPass = await bcryptjs.hash(newUser.password, 5);
    newUser.password = hashedPass;

    if (newUser.userType === 'shopkeeper' && !newUser.stallName) {
      return res.status(400).json({ message: "Stall Name is required for shopkeepers" });
    }

    await usersCollection.insertOne({
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      userType: newUser.userType,
      password: newUser.password,
      stallName: newUser.userType === 'shopkeeper' ? newUser.stallName : null,
    });

    res.status(201).json({ message: "User created successfully!" });
  })
);

// User login
userApp.post(
  "/login",
  expAsyncHandler(async (req, res) => {
    const userCred = req.body;
    const dbUser = await usersCollection.findOne({ username: userCred.username });

    if (!dbUser) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const status = await bcryptjs.compare(userCred.password, dbUser.password);
    if (!status) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    const signedToken = jwt.sign(
      { 
        username: dbUser.username,
        userType: dbUser.userType 
      }, 
      process.env.SECRET_KEY,
      { expiresIn: '1d' }
    );

    res.json({
      message: "Login Successful",
      token: signedToken,
      user: {
        username: dbUser.username,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        userType: dbUser.userType,
        stallName: dbUser.stallName
      }
    });
  })
);

// Get current user
userApp.get(
  "/current-user",
  expAsyncHandler(async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const user = await usersCollection.findOne({ username: decoded.username });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        stallName: user.stallName
      });
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  })
);

module.exports = userApp;