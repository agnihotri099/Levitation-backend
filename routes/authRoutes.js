const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const keys = require('../config/keys');
const User = require('../models/User');
const PDFDocument = require("pdfkit");
const fs = require('fs');
const Product = require('../models/Product');


// Registration route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Email validation Regex
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ errors: [{ msg: 'Invalid email format' }] });
    }

    // Check if passwords match
    // if (password !== confirmPassword) {
    //   return res.status(400).json({ errors: [{ msg: 'Passwords do not match' }] });
    // }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }

    user = new User({ name, email, password });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Return jsonwebtoken
    const payload = { user: { id: user.id } };
    jwt.sign(payload, keys.secretOrKey, { expiresIn: 360000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//Login

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for existing user
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'User does not exist' }] });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Wrong Password' }] });
    }

    // User matched, create and send JWT token along with user's email
    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      keys.secretOrKey,
      { expiresIn: 36000 }, // Token expires in 10 hours
      (err, token) => {
        if (err) throw err;
        // Include email in the response
        res.json({ token, email }); // Directly using the email from the request
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/generate-pdf/:username', async (req, res) => {
  const { username } = req.params;

  try {
      const user = await User.findOne({ email: username });
      if (!user) {
          return res.status(404).send('User not found');
      }

      // Initialize PDF document
      const doc = new PDFDocument();
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
          let pdfData = Buffer.concat(buffers);
          res.writeHead(200, {
              'Content-Length': Buffer.byteLength(pdfData),
              'Content-Type': 'application/pdf',
              'Content-disposition': 'attachment;filename=Products.pdf',
          }).end(pdfData);
      });

      doc.fontSize(25).text('Products Report', 100, 80);
      doc.fontSize(15).text(`Name: ${user.name}`, 100, 120);
      doc.fontSize(15).text(`Email: ${user.email}`, 100, 140);

      // Start drawing the table after the header
      let startY = 180;
      const startX = 100;

      // Table Headers
      doc.fontSize(12).text('Product Name', startX, startY);
      doc.text('Quantity', 300, startY);
      doc.text('Rate', 380, startY);
      doc.text('Total', 460, startY);

      // Draw a line below headers
      startY += 20;
      doc.moveTo(startX, startY).lineTo(550, startY).stroke();

      // Table Rows
      startY += 10; // Start below the header line
      user.products.forEach((product, index) => {
          let total = product.productQty * product.productRate;
          doc.fontSize(10).text(product.productName, startX, startY + (index * 20));
          doc.text(product.productQty, 300, startY + (index * 20));
          doc.text(`$${product.productRate}`, 380, startY + (index * 20));
          doc.text(`$${total.toFixed(2)}`, 460, startY + (index * 20));
      });

      // Finalize PDF file
      doc.end();

  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

// Add a new product
router.post('/products/add', async (req, res) => {
  const { username, productName, productQty, productRate, productTotal, productGST } = req.body;
  
  try {
    // Find the user by username
    const user = await User.findOne({ email: username });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Create a new product object based on the received data
    const newProduct = {
      productName,
      productQty,
      productRate,
      productTotal,
      productGST
    };

    // Add the new product to the user's products array
    user.products.push(newProduct);

    // Save the updated user document
    await user.save();

    res.json(user.products); // Return the updated products array
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Fetch all products for a user

router.get('/products/:username', async (req, res) => {
  try {
    // Fetch the user document by username
    const user = await User.findOne({ email: req.params.username });

    // Check if user exists
    if (!user) {  
      return res.status(404).json({ msg: 'User not found' });

    }
    // Return the products array from the user document
    // if (user.products.length() ===0) {
    //   return res.status(404).json({ msg: 'No data found' });
    // }

    res.json(user.products);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Delete a product


router.delete('/products/:productId', async (req, res) => {
  const { productId } = req.params; // Correctly access the productId from params
  const { username } = req.query; // If you're passing username via query parameters
  console.log(username);

  try {
    const user = await User.findOne({ email: username }); // Assuming username is the email
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find the product in the user's products array and remove it
    const productIndex = user.products.findIndex(product => product._id.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    // Remove the product and save the user document
    user.products.splice(productIndex, 1);
    await user.save();

    res.json({ msg: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});





module.exports = router;


