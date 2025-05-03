// Create a stall-api app
const express = require("express");
const asyncHandler = require("express-async-handler");
const stallApp = express.Router();
require("dotenv").config();

let stallsCollection;
let usersCollection;

// Middleware to get collections
stallApp.use((req, res, next) => {
  stallsCollection = req.app.get("stallsCollection");
  usersCollection = req.app.get("usersCollection");
  next();
});

// Add items to a stall
stallApp.post(
  "/additems",
  asyncHandler(async (req, res) => {
    const { stallName, shopkeeperName, items } = req.body;

    // Verify shopkeeper
    const shopkeeper = await usersCollection.findOne({ username: shopkeeperName, userType: "shopkeeper" });
    if (!shopkeeper) {
      return res.status(404).json({ success: false, message: "Shopkeeper not found" });
    }

    if (!shopkeeper.stallName || !shopkeeper.stallName.includes(stallName)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this stall" });
    }

    // Attach preparationTime if missing
    const itemsWithPrepTime = items.map(item => ({
      ...item,
      preparationTime: item.preparationTime || "Unknown",
    }));

    const existingStall = await stallsCollection.findOne({ stallName });

    if (existingStall) {
      await stallsCollection.updateOne(
        { stallName },
        { $push: { items: { $each: itemsWithPrepTime } } }
      );
      res.status(200).json({ success: true, message: "Items added to existing stall", data: itemsWithPrepTime });
    } else {
      const newStall = {
        stallName,
        shopkeeperName,
        items: itemsWithPrepTime,
      };
      await stallsCollection.insertOne(newStall);
      res.status(201).json({ success: true, message: "New stall created with items", data: newStall });
    }
  })
);

// Get all stalls
stallApp.get(
  "/getallstalls",
  asyncHandler(async (req, res) => {
    const stalls = await stallsCollection.find().toArray();
    res.status(200).json({ success: true, data: stalls });
  })
);

// Get stall by stallName
stallApp.get(
  "/getstall/:stallName",
  asyncHandler(async (req, res) => {
    const { stallName } = req.params;
    const stall = await stallsCollection.findOne({ stallName });
    if (stall) {
      res.status(200).json({ success: true, data: stall });
    } else {
      res.status(404).json({ success: false, message: "Stall not found" });
    }
  })
);

// Get items for a specific stall
stallApp.get(
  "/getitems/:stallName",
  asyncHandler(async (req, res) => {
    const stallName = decodeURIComponent(req.params.stallName); // Decoding the URL parameter
    const stall = await stallsCollection.findOne({ stallName });

    if (!stall) {
      return res.status(404).json({ success: false, message: "Stall not found" });
    }

    res.status(200).json({ success: true, data: stall.items });
  })
);

// Get all items by a shopkeeper (useful for dashboard)
stallApp.get(
  "/getitemsbyshopkeeper/:shopkeeperName",
  asyncHandler(async (req, res) => {
    const { shopkeeperName } = req.params;

    // Validate shopkeeper exists
    const shopkeeper = await usersCollection.findOne({ username: shopkeeperName, userType: "shopkeeper" });
    if (!shopkeeper) {
      return res.status(404).json({ success: false, message: "Shopkeeper not found" });
    }

    // Fetch stalls managed by the shopkeeper
    const stalls = await stallsCollection.find({ shopkeeperName }).toArray();

    if (stalls.length === 0) {
      return res.status(404).json({ success: false, message: "No stalls found for this shopkeeper" });
    }

    // Extract and combine all items
    const allItems = stalls.flatMap(stall => 
      stall.items.map(item => ({
        ...item,
        stallName: stall.stallName // Include stall name for clarity
      }))
    );

    res.status(200).json({ success: true, data: allItems });
  })
);

// Update an item in a stall (only by shopkeeper)
stallApp.put(
  "/updateitem/:stallName/:itemName",
  asyncHandler(async (req, res) => {
    const { stallName, itemName } = req.params;
    const { shopkeeperName, itemName: newItemName, priceperitem, quantity, preparationTime } = req.body;

    const stall = await stallsCollection.findOne({ stallName, shopkeeperName });
    if (!stall) {
      return res.status(403).json({ success: false, message: "Unauthorized to update items in this stall" });
    }

    const result = await stallsCollection.updateOne(
      { stallName, "items.itemName": itemName },
      {
        $set: {
          "items.$.itemName": newItemName || itemName,
          "items.$.priceperitem": priceperitem,
          "items.$.quantity": quantity,
          ...(preparationTime && { "items.$.preparationTime": preparationTime }),
        },
      }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ success: true, message: "Item updated successfully" });
    } else {
      res.status(404).json({ success: false, message: "Item not found or no changes made" });
    }
  })
);

// Delete an item from a stall (only by shopkeeper)
stallApp.delete(
  "/deleteitem/:stallName/:itemName",
  asyncHandler(async (req, res) => {
    const { stallName, itemName } = req.params;
    const { shopkeeperName } = req.body;

    const stall = await stallsCollection.findOne({ stallName, shopkeeperName });
    if (!stall) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete items in this stall" });
    }

    const result = await stallsCollection.updateOne(
      { stallName },
      { $pull: { items: { itemName } } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ success: true, message: "Item deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "Item not found" });
    }
  })
);

// Export stallApp
module.exports = stallApp;
