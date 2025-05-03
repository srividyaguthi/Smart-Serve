// order-api.js
const express = require('express');
const orderApp = express.Router();
const expAsyncHandler = require('express-async-handler');

let ordersCollection;

orderApp.use((req, res, next) => {
  ordersCollection = req.app.get('ordersCollection');
  stallsCollection = req.app.get('stallsCollection');
  next();
});

// Create a new order
orderApp.post(
  "/createorder",
  expAsyncHandler(async (req, res) => {
    const { studentUsername, items, totalAmount, status, estimatedTime } = req.body;

    if (!studentUsername || !items || !totalAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create the order in the database
    const newOrder = {
      studentUsername,
      items,
      totalAmount,
      status,
      estimatedTime,
      createdAt: new Date(),
    };

    const result = await ordersCollection.insertOne(newOrder);

    if (result.insertedId) {
      res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to place the order' });
    }
  })
);

orderApp.post(
    "/addtocart",
    expAsyncHandler(async (req, res) => {
      const { studentUsername, stallName, itemName, quantity } = req.body;
      const stall = await stallsCollection.findOne({ stallName });
  
      if (!stall) return res.status(404).json({ message: "Stall not found" });
  
      const item = stall.items.find((i) => i.itemName === itemName);
      if (!item) return res.status(404).json({ message: "Item not found in stall" });
  
      const cartItem = {
        studentUsername,
        stallName,
        itemName,
        priceperitem: item.priceperitem,
        quantity: Number(quantity),
        totalPrice: item.priceperitem * quantity,
      };
  
      // Add or update item in cart
      await ordersCollection.updateOne(
        { studentUsername, stallName, itemName },
        {
          $set: {
            priceperitem: cartItem.priceperitem,
            quantity: cartItem.quantity,
            totalPrice: cartItem.totalPrice,
          },
        },
        { upsert: true }
      );
  
      res.send({ message: "Item added to cart successfully" });
    })
  );
  
  orderApp.get(
    "/cart/:studentUsername",
    expAsyncHandler(async (req, res) => {
      const studentUsername = req.params.studentUsername;
      const cartItems = await ordersCollection.find({ studentUsername }).toArray();
      res.send(cartItems);
    })
  );
  
  orderApp.put(
    "/updatecart",
    expAsyncHandler(async (req, res) => {
      const { studentUsername, stallName, itemName, quantity } = req.body;
  
      const cartItem = await ordersCollection.findOne({ studentUsername, stallName, itemName });
      if (!cartItem) return res.status(404).json({ message: "Item not found in cart" });
  
      if (quantity <= 0) {
        await ordersCollection.deleteOne({ studentUsername, stallName, itemName });
        return res.send({ message: "Item removed from cart" });
      }
  
      const newTotal = cartItem.priceperitem * quantity;
  
      await ordersCollection.updateOne(
        { studentUsername, stallName, itemName },
        { $set: { quantity, totalPrice: newTotal } }
      );
  
      res.send({ message: "Cart updated successfully" });
    })
  );
  
  // get all orders of the shopkeeper
    orderApp.get(
        "/shopkeeperorders/:stallName",
        expAsyncHandler(async (req, res) => {
        const stallName = req.params.stallName;
    
        const orders = await ordersCollection.find({ stallName }).toArray();
    
        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for this stall" });
        }
    
        res.send(orders);
        })
    );

  // Delete a specific item from a student's cart
orderApp.delete(
  "/deletecart",
  expAsyncHandler(async (req, res) => {
    const { studentUsername, stallName, itemName } = req.body;

    // Validate input
    if (!studentUsername || !stallName || !itemName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if the item exists in the cart
    const cartItem = await ordersCollection.findOne({ studentUsername, stallName, itemName });
    if (!cartItem) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Delete the item from the cart
    await ordersCollection.deleteOne({ studentUsername, stallName, itemName });

    res.send({ message: "Item deleted from cart successfully" });
  })
);


module.exports = orderApp;
