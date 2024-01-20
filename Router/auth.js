const express = require("express");
const Routers = express.Router();
const User = require("../Modles/User");
const Admin = require('../Modles/Admin');
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const bodyParser = require("body-parser");
const Wallet = require("ethereumjs-wallet");
const util = require('util');
const Tx = require("ethereumjs-tx");
const Web3 = require("web3");
const ethereumjsutil = require("ethereumjs-util");
const qrcode = require("qrcode");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const nodemailer = require('nodemailer');
const db = "mongodb+srv://asad:asad123123@cluster0.ulf5twe.mongodb.net/?retryWrites=true&w=majority";
const twilio = require('twilio');

const stripe = require('stripe')("sk_test_51ODucNSBUBnZdF2vZ4rTegts3FCMI9IczAYi4IU9kNOhtFrO7PN2wWAsvUTVUpfis2xmwBZTdSXzOWU69idYfoEi00eTy3Le68");

/**
 * @swagger
 * /stripe:
 *   post:
 *     summary: Create a Stripe checkout session
 *     description: This endpoint creates a new Stripe checkout session for a subscription, requiring a price ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: The ID of the price for the subscription.
 *     responses:
 *       200:
 *         description: Successfully created a Stripe checkout session.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the created Stripe session.
 *       400:
 *         description: Bad Request - Price ID not provided in the request body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining that the price ID was not provided.
 *       500:
 *         description: Internal Server Error - Error occurred while creating the checkout session.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining the server error.
 */
Routers.post("/stripe", async (req, res) => {
  try {
      // Debug logging
      console.log("Received request with body:", req.body);

      // De-structure the priceId from the request body
      const { priceId } = req.body;

      // Now, check if the priceId is not undefined or null
      if(!priceId) {
          console.error("Price ID not provided in the request body");
          return res.status(400).send({error: 'Price ID not provided in the request body'});
      }

      // Debug logging
      console.log(`Creating stripe checkout session with priceId: ${priceId}`);

      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
              {
                  price: priceId,
                  quantity: 1,
              },
          ],
          mode: 'subscription',
          success_url: 'http://localhost:3000/dashboard?message=authenticate', // change it for production
          cancel_url: 'http://localhost:3000/sign-in', // change it for production
      });

      console.log(`Stripe session created with ID: ${session.id}`);

      return res.json({ id: session.id });

  } catch (error) {
      console.error("An error occurred:", error);
      return res.status(500).send({error: 'An error occurred while creating the checkout session.'});
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // SMTP server address (usually mail.your-domain.com)
  port: 465, // Port for SMTP (usually 465)
  secure: true, 
  auth: {
    user: 'asadghouri546@gmail.com',
    pass: 'ymsz tfvn unqm jogj',
  },
});

//end point for ozone project
/**
 * @swagger
 * /send-email:
 *   post:
 *     summary: Send an email
 *     description: This endpoint sends an email using SMTP details provided in the request body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *               - port
 *               - secure
 *               - user
 *               - pass
 *               - subject
 *               - email_template
 *               - to
 *             properties:
 *               host:
 *                 type: string
 *                 description: SMTP server host.
 *               port:
 *                 type: integer
 *                 description: SMTP server port.
 *               secure:
 *                 type: boolean
 *                 description: Whether the connection should use SSL/TLS.
 *               user:
 *                 type: string
 *                 description: SMTP user email address.
 *               pass:
 *                 type: string
 *                 description: SMTP password for the user.
 *               subject:
 *                 type: string
 *                 description: Subject of the email.
 *               email_template:
 *                 type: string
 *                 description: Content or template of the email.
 *               to:
 *                 type: string
 *                 description: Receiver's email address.
 *     responses:
 *       200:
 *         description: Email successfully sent.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Email sent: [SMTP server response]"
 *       500:
 *         description: Error occurred while sending the email.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Error message if unable to send email"
 */
Routers.post('/send-email', (req, res) => {
  const {
    host,
    port,
    secure,
    user,
    pass,
    subject,
    email_template,
    to
  } = req.body;

  // Create a transporter using SMTP details from the request body
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });

  const mailOptions = {
    from: user, // Sender email address
    to: to, // Receiver email address
    subject: subject,
    text: email_template,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(error.toString());
    }
    res.status(200).send('Email sent: ' + info.response);
  });
});
///for ozone
/**
 * @swagger
 * /send-sms:
 *   post:
 *     summary: Send an SMS
 *     description: This endpoint sends an SMS using Twilio with the details provided in the request body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountSid
 *               - authToken
 *               - from
 *               - to
 *             properties:
 *               accountSid:
 *                 type: string
 *                 description: Twilio Account SID.
 *               authToken:
 *                 type: string
 *                 description: Twilio Auth Token.
 *               from:
 *                 type: string
 *                 description: The sending phone number (Twilio number).
 *               to:
 *                 type: string
 *                 description: The receiving phone number.
 *     responses:
 *       200:
 *         description: SMS successfully sent.
 *       400:
 *         description: Bad request due to missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating missing parameters.
 *       500:
 *         description: Internal Server Error - Error occurred while sending the SMS.
 */
Routers.post('/send-sms', (req, res) => {
  const { accountSid, authToken, from, to } = req.body;

  // Validate input parameters
  if (!accountSid || !authToken || !from || !to) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const client = twilio(accountSid, authToken);
console.log("no eroor")
  client.messages
    .create({
      body: 'Hello, this is a test message from Twilio!',
      from,
      to,
    })
    .then((message) => console.log("no eroor"))
    .catch((error) => console.log("eroor"));
});

/**
 * @swagger
 * /Registration:
 *   post:
 *     summary: User Registration
 *     description: Registers a new user with name, email, and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the user.
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user.
 *               password:
 *                 type: string
 *                 description: Password for the user account.
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *       422:
 *         description: Unprocessable Entity - Error due to missing fields or existing email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the reason for failure.
 *       500:
 *         description: Internal Server Error - Error occurred during the registration process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed error message.
 */
Routers.post("/Registration", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // const Name = "asad";
    // const email = "l2s013s34@lhr.nu.edu.pk";
    // const password  = "dsgdd";
    console.log( name, email, password)
    if (!name || !email || !password) {
      return res
        .status(422)
        .json({ error: "Please fill all the fields properly" });
    }
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      return res.status(422).json({ message: "Email already exists" });
    }
    const user = new User({ name, email, password });
    await user.save();
 
    // Send a registration confirmation email
    // let info = await transporter.sendMail({
    //   from: email,
    //   to: "asadghouri546@gmail.com",
    //   subject: `${email} Sign Up`,
    //   html: `
    //   <h1>Hello there</h1>
    //   <p>${name} is Sign Up</p>
    //   `,
    // });
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: err });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User Login
 *     description: Allows users to log in using their email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *               password:
 *                 type: string
 *                 description: The user's password.
 *     responses:
 *       201:
 *         description: User logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User logged in successfully"
 *                 userId:
 *                   type: string
 *                   description: The ID of the logged-in user.
 *                 name:
 *                   type: string
 *                   description: The name of the logged-in user.
 *       400:
 *         description: Bad request due to missing fields or invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the reason for failure.
 *       500:
 *         description: Internal Server Error - Error occurred during the login process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed error message.
 */
Routers.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please fill all the fields properly" });
    }
    const userLogin = await User.findOne({ email: email });
    if (
      userLogin &&
      userLogin.email === email &&
      userLogin.password === password
    ) {
          // Send a registration confirmation email
    // let info = await transporter.sendMail({
    //   from: email,
    //   to: "asadghouri546@gmail.com",
    //   subject: `${email} Login Successfully`,
    //   html: `
    //   <h1>Hello there</h1>
    //   <p>${email} Login Successfully</p>
    //   `,
    // });
      return res.status(201).json({
        message: "User logged in successfully",
        userId: userLogin._id,
        name:userLogin.name,
      });
    } else {
      return res.status(400).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /generateApiKey/{userId}:
 *   post:
 *     summary: Generate API Key
 *     description: Generates a new API key for the user specified by the userId in the path.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       apiKey:
 *                         type: string
 *                         description: The newly generated API key.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while generating the API key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed error message.
 */
Routers.post(`/generateApiKey/:userId`, async (req, res) => {
  const userId = req.params.userId;
  try {
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newApiKey = uuidv4();
    user.apiKeys.push({ apiKey: newApiKey });
    await user.save();

    res.status(200).json({ apiKey: user.apiKeys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

/**
 * @swagger
 * /getUserdata/{id}:
 *   get:
 *     summary: Get User Data
 *     description: Retrieves data for a user specified by the user ID in the path.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: Name of the user.
 *                 email:
 *                   type: string
 *                   description: Email address of the user.
 *                 password:
 *                   type: string
 *                   description: Password of the user.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get(`/getUserdata/:id`, async (request, response) => {
  console.log("id is ", request.params.id);
  try {
    const user = await User.findById(request.params.id);
    response.status(200).json(user);
  } catch (err) {
    console.error(err);
    return response
      .status(500)
      .json({ msg: "error while reading a single user" });
  }
});

/**
 * @swagger
 * /getUserdataPendingLinks/{id}:
 *   get:
 *     summary: Get User's Pending Payment Links
 *     description: Retrieves all pending payment links for a user specified by the user ID in the path.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pending payment links retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   linkId:
 *                     type: string
 *                     description: Unique identifier for the payment link.
 *                   status:
 *                     type: string
 *                     description: Status of the payment link.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving pending payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get(`/getUserdataPendingLinks/:id`, async (request, response) => {
  try {
    const user = await User.findById(request.params.id);

    // Filter the user's paymentLinks to get only the ones with status "Done"
    const pendingPaymentLinks = user.paymentLinks.filter((paymentLink) => paymentLink.status === "Pending");

    // if (donePaymentLinks.length === 0) {
    //   return response.status(200).json({ msg: "No Pending payment links found for this user." });
    // }

    response.status(200).json(pendingPaymentLinks);
  } catch (err) {
    console.error(err);
    return response
      .status(500)
      .json({ msg: "Error while reading user's paymentLinks" });
  }
});

/**
 * @swagger
 * /getUserdataDoneLinks/{id}:
 *   get:
 *     summary: Get User's Completed Payment Links
 *     description: Retrieves all completed (done) payment links for a user specified by the user ID in the path.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of completed payment links retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   linkId:
 *                     type: string
 *                     description: Unique identifier for the payment link.
 *                   status:
 *                     type: string
 *                     description: Status of the payment link (should be 'done').
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message indicating the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving completed payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get(`/getUserdataDoneLinks/:id`, async (req, res) => {
  try {
    const userId = req.params.id;

    // Use findById and project only the paymentLinks field
    const user = await User.findById(userId, 'paymentLinks');

    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    // Filter the user's paymentLinks to get only the ones with status "done"
    const donePaymentLinks = user.paymentLinks.filter(paymentLink => paymentLink.status === "done");

    if (donePaymentLinks.length === 0) {
      return res.status(200).json({ msg: "No Done payment links found for this user." });
    }

    res.status(200).json(donePaymentLinks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error while reading user's paymentLinks" });
  }
});

/**
 * @swagger
 * /PaymentLinkGenerator/gett/{id}/{amd}:
 *   get:
 *     summary: Retrieve Specific Payment Link
 *     description: Retrieves a specific payment link for a user based on the user ID and the unique payment link identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *       - in: path
 *         name: amd
 *         required: true
 *         description: Unique identifier of the payment link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment link retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentLinks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uniqueid:
 *                         type: string
 *                         description: Unique identifier for the payment link.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving the payment link.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get(`/PaymentLinkGenerator/gett/:id/:amd`, async (request, response) => {
  try {
    console.log(request.params.amd)
   
    const user = await User.findOne({
      _id: request.params.id, // Match the ObjectId
      "paymentLinks.uniqueid": request.params.amd, // Match the paymentLink with the specified uniqueid
    },{
      "paymentLinks.$": 1, // Projection to retrieve only the matching paymentLink
    });
    console.log(user)
    response.status(200).json(user);
  } catch (err) {
    console.error(err);
    return response
      .status(500)
      .json({ msg: "error while reading a single user" });
  }
});


async function withdrawFunds(idss,uniqueId,address,amount,privateKeys) {
  const  id = idss;
   
  console.log("withdrawFunds ",address,amount,privateKeys);
     console.log("withdrawFunds");
     
    const quicknodeUrl = "https://alpha-quaint-night.bsc-testnet.discover.quiknode.pro/3bae5ff989475ed8f9507d97c304b336e837119e/";
    const web3 = new Web3(quicknodeUrl);

     const senderAddress = address;
    const recipientAddress = "0xF24D9E7C825d00A756d542cBE8199c5f14bA1575";
    const privateKey = privateKeys;

web3.eth.getBalance(senderAddress)
  .then(balance => {
    // Convert the balance to a BigNumber
    const maxAmount = web3.utils.toBN(balance);

    console.log("Balance is ", balance);
    const etherBalance = web3.utils.fromWei(maxAmount, "ether");
    console.log("etherBalance", etherBalance);

    // Calculate the gas price you want to use (in Wei)
    const gasPriceWei = web3.utils.toWei("10", "gwei"); // Adjust this as needed

    // Calculate the maximum gas you can afford based on the balance and gas price
    const gasLimit = 21000; // Gas limit (typical value for a simple ETH transfer)
    const gasLimitBN = web3.utils.toBN(gasLimit);
    const gasFeeWei = gasLimitBN.mul(web3.utils.toBN(gasPriceWei));

    // Calculate the amount to send after deducting gas fees
    const amountToSend = maxAmount.sub(gasFeeWei);

    console.log("Gas Fee is ", web3.utils.fromWei(gasFeeWei, "ether"), "BNB");
    console.log("Amount to Send is ", web3.utils.fromWei(amountToSend, "ether"), "BNB");

    // Construct the transaction object
    const transactionObject = {
      to: recipientAddress,
      value: amountToSend, // Subtract gas fee from the total amount
      gas: gasLimit, // Set the gas limit
      gasPrice: gasPriceWei, // Gas price in Wei
    };

    console.log("transactionObject ", transactionObject);

    // Check if the transaction is already pending or included in a block
    web3.eth.getTransactionCount(senderAddress)
      .then(nonce => {
        transactionObject.nonce = nonce;

        // Sign and send the transaction
        web3.eth.accounts.signTransaction(transactionObject, privateKey)
          .then(signedTx => {
            web3.eth.sendSignedTransaction(signedTx.rawTransaction)
              .on('transactionHash',async txHash => {
                console.log(`Transaction Hash: ${txHash}`);
                
                // Additional code you want to run when the transaction hash is created
                // For example, update the user document
                // const user = await User.findOneAndUpdate(
                //   {
                //     _id: idss,
                //     "paymentLinks.uniqueid": uniqueId,
                //   },
                //   {
                //     $set: {
                //       "paymentLinks.$.status": "done",
                //     },
                //   },
                //   { new: true }
                // );
                
                // console.log(`User updated: ${user}`);
              })
              .on('confirmation', (confirmationNumber, receipt) => {
                console.log(`Confirmation Number: ${confirmationNumber}`);
                console.log(`Receipt:`, receipt);
              })
              .on('error', err => {
                console.error('Transaction Error:', err);
              });
          })
          .catch(err => {
            console.error('Error signing the transaction:', err);
          });
      })
      .catch(err => {
        console.error('Error getting nonce:', err);
      });
  })
  .catch(err => {
    console.error('Error getting balance:', err);
  });

    
}

// async function withdrawFunds(idss, uniqueId, address, amount, privateKeys) {
//   const id = idss;

//   console.log("withdrawFunds ", address, amount, privateKeys);
//   console.log("withdrawFunds");

//   const quicknodeUrl =
//     "https://alpha-quaint-night.bsc-testnet.discover.quiknode.pro/3bae5ff989475ed8f9507d97c304b336e837119e/";
//   const web3 = new Web3(quicknodeUrl);

//   const senderAddress = address;
//   const adminAddress = "0xF24D9E7C825d00A756d542cBE8199c5f14bA1575"; // Admin's address
//   const privateKey = privateKeys;

  
//   let commissionRates;
//   try {
//     const admin = await Admin.findOne({}); // Assuming you have a single admin record
//     if (admin) {
//       commissionRates = admin.commissionRate; // Get the commission rate from the admin document
//     } else {
//       // Handle the case where no admin document is found or set a default commission rate
//       commissionRates = 3; // Default commission rate (5%)
//     }
//   } catch (err) {
//     console.error('Error fetching admin commission rate:', err);
//     // Handle the error or set a default commission rate
//     commissionRates = 3; // Default commission rate (5%)
//   }

//   const commissionRate = (commissionRates/100); // Replace with the actual commission rate set by admin (e.g., 5%)
//    console.log("comission rate is ",commissionRate)
//   // Define the recipient's address
//   const recipientAddress = "0x46F9E68A45B24C839c15D72Df031555F798E42CD"; // Replace with the actual recipient's address

//   web3.eth.getBalance(senderAddress)
//     .then((balance) => {
//       // Convert the balance to a BigNumber
//       const maxAmount = web3.utils.toBN(balance);

//       console.log("Balance is ", balance);
//       const etherBalance = web3.utils.fromWei(maxAmount, "ether");
//       console.log("etherBalance", etherBalance);

//       // Calculate the gas price you want to use (in Wei)
//       const gasPriceWei = web3.utils.toWei("10", "gwei"); // Adjust this as needed

//       // Calculate the maximum gas you can afford based on the balance and gas price
//       const gasLimit = 21000; // Gas limit (typical value for a simple ETH transfer)
//       const gasLimitBN = web3.utils.toBN(gasLimit);
//       const gasFeeWei = gasLimitBN.mul(web3.utils.toBN(gasPriceWei));

//       // Calculate the total amount to send before deducting gas fees
//       const totalAmount = maxAmount;

//       // Calculate the commission amount
//       const commissionAmountWei = totalAmount.mul(web3.utils.toBN(commissionRate)); // Convert percentage to decimal

//       // Calculate the amount to send to the admin after deducting commission and gas fees
//       const adminAmountToSend = commissionAmountWei.sub(gasFeeWei);

//       // Calculate the amount to send to the recipient after deducting commission and gas fees
//       const recipientAmountToSend = totalAmount.sub(commissionAmountWei).sub(gasFeeWei);

//       console.log("Gas Fee is ", web3.utils.fromWei(gasFeeWei, "ether"), "BNB");
//       console.log("Admin's Commission Amount is ", web3.utils.fromWei(adminAmountToSend, "ether"), "BNB");
//       console.log("Recipient's Amount is ", web3.utils.fromWei(recipientAmountToSend, "ether"), "BNB");

      
//       console.log("admin value send is ",adminAmountToSend,"other value send is ",recipientAmountToSend)
//       // Construct the transaction object for admin's commission
//       const adminTransactionObject = {
//         to: adminAddress,
//         value: adminAmountToSend.toString(), // Convert to string before sending
//         gas: gasLimit, // Set the gas limit
//         gasPrice: gasPriceWei, // Gas price in Wei
//       };

//       // Construct the transaction object for recipient
//       const recipientTransactionObject = {
//         to: recipientAddress,
//         value: recipientAmountToSend.toString(), // Convert to string before sending
//         gas: gasLimit, // Set the gas limit
//         gasPrice: gasPriceWei, // Gas price in Wei
//       };

//       console.log("Admin's Transaction Object ", adminTransactionObject);
//       console.log("Recipient's Transaction Object ", recipientTransactionObject);

//       // Check if the transaction is already pending or included in a block
//       web3.eth.getTransactionCount(senderAddress)
//         .then((nonce) => {
//           // Set nonce for both transactions
//           adminTransactionObject.nonce = nonce;
//           recipientTransactionObject.nonce = nonce + 1; // Increment nonce for the recipient's transaction

//           // Sign and send the admin's commission transaction
//           web3.eth.accounts.signTransaction(adminTransactionObject, privateKey)
//             .then((adminSignedTx) => {
//               web3.eth.sendSignedTransaction(adminSignedTx.rawTransaction)
//                 .on('transactionHash', async (adminTxHash) => {
//                   console.log(`Admin's Transaction Hash: ${adminTxHash}`);
//                 })
//                 .on('confirmation', (confirmationNumber, adminReceipt) => {
//                   console.log(`Admin's Confirmation Number: ${confirmationNumber}`);
//                   console.log(`Admin's Receipt:`, adminReceipt);
//                 })
//                 .on('error', (err) => {
//                   console.error("Admin's Transaction Error:", err);
//                 });
//             })
//             .catch((err) => {
//               console.error("Error signing the admin's transaction:", err);
//             });

//           // Sign and send the recipient's transaction
//           web3.eth.accounts.signTransaction(recipientTransactionObject, privateKey)
//             .then((recipientSignedTx) => {
//               web3.eth.sendSignedTransaction(recipientSignedTx.rawTransaction)
//                 .on('transactionHash', async (recipientTxHash) => {
//                   console.log(`Recipient's Transaction Hash: ${recipientTxHash}`);
//                                     // Additional code you want to run when the recipient's transaction hash is created
//                 })
//                 .on('confirmation', (confirmationNumber, recipientReceipt) => {
//                   console.log(`Recipient's Confirmation Number: ${confirmationNumber}`);
//                   console.log(`Recipient's Receipt:`, recipientReceipt);

//                   // Additional code you want to run when the recipient's transaction is confirmed
//                 })
//                 .on('error', (err) => {
//                   console.error("Recipient's Transaction Error:", err);

//                   // Handle error for the recipient's transaction
//                 });
//             })
//             .catch((err) => {
//               console.error("Error signing the recipient's transaction:", err);

//               // Handle error when signing the recipient's transaction
//             });
//         })
//         .catch((err) => {
//           console.error('Error getting nonce:', err);

//           // Handle error when getting nonce
//         });
//     })
//     .catch((err) => {
//       console.error('Error getting balance:', err);

//       // Handle error when getting balance
//     });
// }

                                   
/**
 * @swagger
 * /changedetails/gett/{id}/{amd}/{address}/{amount}/{privateKey}/{bnbvalue}:
 *   get:
 *     summary: Change Payment Link Details
 *     description: Updates payment link details and processes transactions based on user ID, unique payment link ID, and transaction details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *       - in: path
 *         name: amd
 *         required: true
 *         description: Unique identifier of the payment link.
 *         schema:
 *           type: string
 *       - in: path
 *         name: address
 *         required: true
 *         description: Blockchain address for the transaction.
 *         schema:
 *           type: string
 *       - in: path
 *         name: amount
 *         required: true
 *         description: Original amount to be processed.
 *         schema:
 *           type: string
 *       - in: path
 *         name: privateKey
 *         required: true
 *         description: Private key for transaction authentication.
 *         schema:
 *           type: string
 *       - in: path
 *         name: bnbvalue
 *         required: true
 *         description: Binance coin value for the transaction.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment link details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Confirmation message for the update.
 *       500:
 *         description: Internal Server Error - Error occurred while updating payment link status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/changedetails/gett/:id/:amd/:address/:amount/:privateKey/:bnbvalue', async (request, response) => {
  try {
    const userId = request.params.id;
    const uniqueId = request.params.amd;
    const address = request.params.address;
    const amount1 = request.params.amount;
    const amount = request.params.bnbvalue;
    const privateKey = request.params.privateKey;
    console.log("check in bankend values ",address,amount,privateKey);
    const quicknodeUrl = "https://alpha-quaint-night.bsc-testnet.discover.quiknode.pro/3bae5ff989475ed8f9507d97c304b336e837119e/";//bnd
  
    const web3 = new Web3(quicknodeUrl);

    web3.eth.net.isListening()
    .then(() => console.log('Web3 is connected'))
    .catch((err) => console.error('Error connecting to Web3:', err));
        
    //getBalance("0x9074cac923ac38656c40d0a77aa41153b2587efa") userbalnce fix
    const balance = await web3.eth.getBalance(address);
    const etherBalance = web3.utils.fromWei(balance, "ether");
    console.log("etherBalance",etherBalance,"balance",balance);
    
       //parseFloat(0.001) user amount fix
        if (parseFloat(etherBalance) >= parseFloat(amount)) {
          // paymentLink.status = "Paid";
          // console.log("Funds Received:", etherBalance);
          const user = await User.findOneAndUpdate(
            {
              _id: userId,
              "paymentLinks.uniqueid": uniqueId,
            },
            {
              $set: {
                "paymentLinks.$.status": "done",
              },
            },
            { new: true }
          );
          
          withdrawFunds(userId,uniqueId,address,amount,privateKey)
            response.status(200).json({msg:"Its-Done"});   
        }
        else{
    console.log("false condition");
        }
  } catch (err) {
    console.error("err is ",err);
    return response.status(500).json({ msg: "Error while updating payment link status" });
  }
});
// const { QRCode } = qrcode;


/**
 * @swagger
 * /GetDatabyApiKey:
 *   get:
 *     summary: Get Data by API Key
 *     description: Retrieves data and generates a payment link based on the provided API key and other query parameters.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: API key for user identification.
 *         schema:
 *           type: string
 *       - in: query
 *         name: amount
 *         required: false
 *         description: Amount for the payment link.
 *         schema:
 *           type: string
 *       - in: query
 *         name: currency
 *         required: false
 *         description: Currency for the payment link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data retrieved and payment link generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User object.
 *                 paymentLink:
 *                   type: object
 *                   description: Generated payment link details.
 *       400:
 *         description: Bad Request - Missing API key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message indicating the missing API key.
 *       404:
 *         description: User Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message indicating the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed error message.
 */
Routers.get('/GetDatabyApiKey', async (req, res) => {
  const apiKey = req.query.id;
  const amount = req.query.amount;
  const currency = req.query.currency;
  const note = "Optional";

  console.log(apiKey)
  if (!apiKey) {
    return res.status(400).json({ msg: "Please provide an 'id' query parameter" });
  }
  try {
    const user = await User.findOne({ "apiKeys.apiKey": apiKey });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    var wallet = Wallet["default"].generate();
    console.log("InPaymentLink:")
    const paymentLink = {
      uniqueid: Math.random().toString(36).substring(7),
      address: wallet.getAddressString(),
      createdat:new Date(),
      privateKey: wallet.getPrivateKeyString(),
      amount,
      currency,
      note,
      status:"Pending"
    };

    user.paymentLinks.push(paymentLink);
    await user.save();
    return res.status(200).json({ user,paymentLink});
  } catch (error) {
    return res.status(500).json({ error });
  }
});

//

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the 'public' directory

// QuickNode Ethereum URL (Replace with your QuickNode Mumbai endpoint)


// web3.eth.getBlockNumber().then((result) => {
//   console.log("Latest Ethereum Block is ", result);
// });

// Function to check if funds are received and update status
// async function checkFundsReceived(paymentLink) {
//   try {
//     const balance = await web3.eth.getBalance(paymentLink.address);
//     const etherBalance = web3.utils.fromWei(balance, "ether");

//     if (parseFloat(etherBalance) >= parseFloat(paymentLink.amount)) {
//       paymentLink.status = "Paid";
//       console.log("Funds Received:", etherBalance);
//     }
//   } catch (error) {
//     console.error("Error checking funds:", error);
//   }
// }

const generateRandomString = () => Math.random().toString(36).substring(7);




const generatePaymentLink = async (req, res) => {
  try {
    const { amount, currency, note } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const wallet = Wallet.default.generate();
    const paymentLink = {
      uniqueid: generateRandomString(),
      address: wallet.getAddressString(),
      createdat: new Date(),
      privateKey: wallet.getPrivateKeyString(),
      amount,
      currency,
      note
    };

    const randomEndpoint = `/endpoint${generateRandomString()}`;
    user.paymentLinks.push(paymentLink);

    const qrCodeData = await generateQRCode(paymentLink.address);
    paymentLink.qrCode = qrCodeData;
    console.log(paymentLink.qrCode)
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error generating payment link' });
  }
};

// Helper function to generate QR code in a worker thread
const generateQRCode = async (address) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { address },
    });

    worker.on('message', (qrCodeData) => {
      resolve(qrCodeData);
    });

    worker.on('error', (error) => {
      reject(error);
    });

    worker.postMessage('generateQRCode');
  });
};

// Handle messages from the worker thread
if (!isMainThread) {
  parentPort.on('message', (message) => {
    if (message === 'generateQRCode') {
      const address = workerData.address;
      qrcode.toDataURL(address, (err, qrCodeData) => {
        if (err) {
          throw err;
        }
        parentPort.postMessage(qrCodeData);
      });
    }
  });
}

// Route for generating a payment link
/**
 * @swagger
 * /generate-payment-link/{id}:
 *   post:
 *     summary: Generate Payment Link
 *     description: Generates a new payment link for a user, including a QR code, based on the user ID and provided payment details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount for the payment link.
 *               currency:
 *                 type: string
 *                 description: Currency for the payment link.
 *               note:
 *                 type: string
 *                 description: Optional note associated with the payment link.
 *     responses:
 *       200:
 *         description: Payment link generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User object with the newly created payment link.
 *       404:
 *         description: User Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message indicating the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while generating the payment link.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.post(`/generate-payment-link/:id`, generatePaymentLink);

// Routers.get("/v1/getpaymentid/:id", async (req, res) => {
//   try {
//     const user = await User.findOne({
//       _id: req.params.id, // Match the ObjectId
//     });
//     if (user && user.paymentLinks.length > 0) {
//       const uniqueids = user.paymentLinks.map((link) => link);
//       console.log({uniqueids});
//      return res.status(200).json(uniqueids);
//     } else {
//       // User not found or no payment links
//       return res.status(404).json({ msg: "User not found or no payment links available" });
//     }
//   } catch (err) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ msg: "Error while getting user payment links" });
//   }
// });


/**
 * @swagger
 * /v1/getpaymentid/{id}:
 *   get:
 *     summary: Retrieve Payment Link IDs
 *     description: Fetches all unique payment link IDs associated with a user specified by the user ID in the path.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment link IDs retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 description: Unique payment link ID.
 *       404:
 *         description: User not found or no payment links available.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message indicating that the user was not found or no payment links are available.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving payment link IDs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get("/v1/getpaymentid/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user && user.paymentLinks.length >= 0) {
      const uniqueids = user.paymentLinks.map((link) => link.uniqueid);
      console.log({ uniqueids });
      res.status(200).json(uniqueids);
    } else {
      // User not found or no payment links
      res.status(404).json({ msg: "User not found or no payment links available" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error getting user payment links" });
  }
});

/**
 * @swagger
 * /userCount/{id}:
 *   get:
 *     summary: Get User Counts
 *     description: Retrieves the count of API keys and payment links associated with a specific user, identified by the user ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Counts of API keys and payment links for the user retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKeyCount:
 *                   type: integer
 *                   description: Count of API keys associated with the user.
 *                 paymentLinksCount:
 *                   type: integer
 *                   description: Count of payment links associated with the user.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving user counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/userCount/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate the lengths of apiKeys and paymentLinks arrays
    const apiKeyCount = user.apiKeys.length;
    const paymentLinksCount = user.paymentLinks.length;

    // Return the user data along with counts
    res.status(200).json({
      apiKeyCount,
      paymentLinksCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve static HTML file with QR code for payment link
// app.get("/payment/:id", (req, res) => {
//   const { id } = req.params;
//   const paymentLink = paymentLinks.find((link) => link.id === id);

//   if (!paymentLink) {
//     console.log("Payment Link not found.");
//     return res.status(404).json({ error: "Payment link not found." });
//   }

//   // Here, you can use a QR code generation library (e.g., qr-image) to generate a QR code with the payment link.
//   // Then, serve the HTML page with the QR code.
//   const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
//     paymentLink.paymentLink
//   )}`;
//   const qrCodeHtml = `<html><body><img src="${qrCodeUrl}" alt="Payment QR Code"></body></html>`;

//   console.log("Served Payment QR Code:", paymentLink);
//   res.send(qrCodeHtml);
// });


// -------admin dashboard------
/**
 * @swagger
 * /Adminlogin:
 *   post:
 *     summary: Admin Login
 *     description: Allows admin users to log in using their email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The admin's email address.
 *               password:
 *                 type: string
 *                 description: The admin's password.
 *     responses:
 *       201:
 *         description: Admin user logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User logged in successfully"
 *                 userId:
 *                   type: string
 *                   description: The ID of the logged-in admin user.
 *       400:
 *         description: Bad request due to missing fields or invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the reason for failure.
 *       500:
 *         description: Internal Server Error - Error occurred during the login process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed error message.
 */
Routers.post("/Adminlogin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please fill all the fields properly" });
    }
    const userLogin = await Admin.findOne({ email: email });
    if (
      userLogin &&
      userLogin.email === email &&
      userLogin.password === password
    ) {
      return res.status(201).json({
        message: "User logged in successfully",
        userId: userLogin._id,
      });
    } else {
      return res.status(400).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /countUser:
 *   get:
 *     summary: Count Users
 *     description: Retrieves the total count of users in the database.
 *     responses:
 *       200:
 *         description: Total number of users successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   description: Total number of user documents in the database.
 *       500:
 *         description: Internal Server Error - Error occurred while counting users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/countUser', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    console.log("Total Documents are ",userCount)
    res.json({ totalUsers: userCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /CountpaymentLinks:
 *   get:
 *     summary: Count Payment Links
 *     description: Retrieves the total count of payment links across all users in the database.
 *     responses:
 *       200:
 *         description: Total number of payment links successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPaymentLinks:
 *                   type: integer
 *                   description: Total number of payment links across all users.
 *       500:
 *         description: Internal Server Error - Error occurred while counting payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/CountpaymentLinks', async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalPaymentLinks: { $sum: { $size: '$paymentLinks' } },
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    // Extract the totalPaymentLinks value from the result
    const totalPaymentLinks = result[0]?.totalPaymentLinks || 0;

    res.json({ totalPaymentLinks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }

});


/**
 * @swagger
 * /PendingPaymentLinks:
 *   get:
 *     summary: Count Pending Payment Links
 *     description: Retrieves the total count of pending payment links across all users in the database.
 *     responses:
 *       200:
 *         description: Total number of pending payment links successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPendingPaymentLinks:
 *                   type: integer
 *                   description: Total number of pending payment links across all users.
 *       500:
 *         description: Internal Server Error - Error occurred while counting pending payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/PendingPaymentLinks', async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$paymentLinks', // Unwind the paymentLinks array
      },
      {
        $match: {
          'paymentLinks.status': 'Pending', // Filter by status: pending
        },
      },
      {
        $group: {
          _id: null,
          totalPendingPaymentLinks: { $sum: 1 }, // Count the documents
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    // Extract the totalPendingPaymentLinks value from the result
    const totalPendingPaymentLinks = result[0]?.totalPendingPaymentLinks || 0;

    res.json({ totalPendingPaymentLinks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


// Route to get the total payment links for each user
/**
 * @swagger
 * /PendingPaymentLinksDetail:
 *   get:
 *     summary: Get Detailed Pending Payment Links
 *     description: Retrieves detailed information about all pending payment links across all users in the database.
 *     responses:
 *       200:
 *         description: Detailed pending payment links successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   pendingPaymentLinks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         uniqueid:
 *                           type: string
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving detailed pending payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/PendingPaymentLinksDetail', async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$paymentLinks', // Unwind the paymentLinks array
      },
      {
        $match: {
          'paymentLinks.status': 'Pending', // Filter by status: done
        },
      },
      {
        $group: {
          _id: '$_id',
          // email: { $first: '$email' }, // Include email
          pendingPaymentLinks: { $push: '$paymentLinks' }, // Include "done" payment links
          // totalDonePaymentLinks: { $sum: 1 }, // Count the documents
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id
        },
      },
    ];

    const result = await User.aggregate(pipeline);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
// Route to get the total count of payment links with status "done" across all users
/**
 * @swagger
 * /DonePaymentLinks:
 *   get:
 *     summary: Count Completed Payment Links
 *     description: Retrieves the total count of completed (done) payment links across all users in the database.
 *     responses:
 *       200:
 *         description: Total number of completed payment links successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDonePaymentLinks:
 *                   type: integer
 *                   description: Total number of completed payment links across all users.
 *       500:
 *         description: Internal Server Error - Error occurred while counting completed payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/DonePaymentLinks', async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$paymentLinks', // Unwind the paymentLinks array
      },
      {
        $match: {
          'paymentLinks.status': 'done', // Filter by status: done
        },
      },
      {
        $group: {
          _id: null,
          totalDonePaymentLinks: { $sum: 1 }, // Count the documents
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    // Extract the totalDonePaymentLinks value from the result
    const totalDonePaymentLinks = result[0]?.totalDonePaymentLinks || 0;

    res.json({ totalDonePaymentLinks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route to get the total payment links with status "done" for each user
/**
 * @swagger
 * /DonePaymentLinksDetail:
 *   get:
 *     summary: Get Detailed Completed Payment Links
 *     description: Retrieves detailed information about all completed (done) payment links across all users in the database.
 *     responses:
 *       200:
 *         description: Detailed completed payment links successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   donePaymentLinks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         uniqueid:
 *                           type: string
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving detailed completed payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/DonePaymentLinksDetail', async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$paymentLinks', // Unwind the paymentLinks array
      },
      {
        $match: {
          'paymentLinks.status': 'done', // Filter by status: done
        },
      },
      {
        $group: {
          _id: '$_id',
          // email: { $first: '$email' }, // Include email
          donePaymentLinks: { $push: '$paymentLinks' }, // Include "done" payment links
          // totalDonePaymentLinks: { $sum: 1 }, // Count the documents
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id
        },
      },
    ];

    const result = await User.aggregate(pipeline);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


/**
 * @swagger
 * /AllUsers:
 *   get:
 *     summary: Get All Users
 *     description: Retrieves a list of all users in the database, projecting only their email and password fields.
 *     responses:
 *       200:
 *         description: List of users retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     description: Email of the user.
 *                   password:
 *                     type: string
 *                     description: Password of the user (hashed or plain, based on your implementation).
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/AllUsers', async (req, res) => {
  try {
    const users = await User.find({}, 'email password'); // Project only email and password fields
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /SpecificUser/{userId}:
 *   get:
 *     summary: Get Specific User
 *     description: Retrieves details of a specific user identified by their user ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   description: Email of the user.
 *       404:
 *         description: User Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while retrieving user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.get('/SpecificUser/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("user id is ",userId)
    const user = await User.findById(userId); // Find a user by ID
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /EditUsers/{userId}:
 *   put:
 *     summary: Edit User Details
 *     description: Updates the details of a specific user identified by their user ID. The updated data is provided in the request body.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: New email of the user.
 *     responses:
 *       200:
 *         description: User details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   description: Updated email of the user.
 *       404:
 *         description: User Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while updating user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.put('/EditUsers/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const updatedUserData = req.body; // New user data to be updated

    console.log("requested data is ",updatedUserData)

    // Update user information in the database
    const updatedUser = await User.findByIdAndUpdate(userId, updatedUserData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Edit API key by user ID and API key ID
/**
 * @swagger
 * /EditUsersApiKey/{userId}/{apiKeyId}:
 *   put:
 *     summary: Edit User's API Key
 *     description: Updates a specific API key for a user, identified by the user ID and API key ID. The new API key data is provided in the request body.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user whose API key is to be updated.
 *         schema:
 *           type: string
 *       - in: path
 *         name: apiKeyId
 *         required: true
 *         description: Unique identifier of the API key to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: New API key value.
 *     responses:
 *       200:
 *         description: API key updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *       404:
 *         description: User or API key Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user or API key was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while updating the API key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.put('/EditUsersApiKey/:userId/:apiKeyId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const apiKeyId = req.params.apiKeyId;
    // {apiKey:"c0710b91-5838-4656-92ed-ba9f79b4f666"}
    const updatedApiKeyData = req.body; // New API key data to be updated

    // Find the user by ID and update the API key with the specified ID
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'apiKeys._id': apiKeyId },
      { $set: { 'apiKeys.$': updatedApiKeyData } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User or API key not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Edit payment link by user ID and payment link ID
/**
 * @swagger
 * /EditUsersPaymentLinks/{userId}/{paymentLinkId}:
 *   put:
 *     summary: Edit User's Payment Link
 *     description: Updates a specific payment link for a user, identified by the user ID and payment link ID. The new payment link data is provided in the request body.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user whose payment link is to be updated.
 *         schema:
 *           type: string
 *       - in: path
 *         name: paymentLinkId
 *         required: true
 *         description: Unique identifier of the payment link to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqueid:
 *                 type: string
 *                 description: New unique identifier for the payment link.
 *     responses:
 *       200:
 *         description: Payment link updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *       404:
 *         description: User or Payment Link Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user or payment link was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while updating the payment link.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.put('/EditUsersPaymentLinks/:userId/:paymentLinkId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const paymentLinkId = req.params.paymentLinkId;
    const updatedPaymentLinkData = req.body; // New payment link data to be updated
    // {uniqueid:"asad"}
    // Find the user by ID and update the payment link with the specified ID
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'paymentLinks._id': paymentLinkId },
      { $set: { 'paymentLinks.$': updatedPaymentLinkData } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User or payment link not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


/**
 * @swagger
 * /DeleteUser/{userId}:
 *   delete:
 *     summary: Delete User
 *     description: Deletes a specific user identified by their user ID from the database.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Unique identifier of the user to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Confirmation message for the deletion.
 *       404:
 *         description: User Not Found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user was not found.
 *       500:
 *         description: Internal Server Error - Error occurred while deleting the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the server error.
 */
Routers.delete('/DeleteUser/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Delete user information from the database
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete API key by user ID and API key ID
/**
 * @swagger
 * /DeleteUserApiKey/{userId}/{apiKeyId}:
 *   delete:
 *     summary: Delete a user's API key by ID.
 *     description: Deletes a specific API key associated with a user by their user ID and API key ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: path
 *         name: apiKeyId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the API key to be deleted.
 *     responses:
 *       200:
 *         description: API key deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User or API key not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.delete('/DeleteUserApiKey/:userId/:apiKeyId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const apiKeyId = req.params.apiKeyId;

    // Find the user by ID and remove the API key with the specified ID
    const updatedUser = await User.findByIdAndUpdate(userId, {
      $pull: { apiKeys: { _id: apiKeyId } },
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User or API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete payment link by user ID and payment link ID
/**
 * @swagger
 * /DeleteUserPaymentLinks/{userId}/{paymentLinkId}:
 *   delete:
 *     summary: Delete a user's payment link by ID.
 *     description: Deletes a specific payment link associated with a user by their user ID and payment link ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: path
 *         name: paymentLinkId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the payment link to be deleted.
 *     responses:
 *       200:
 *         description: Payment link deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User or payment link not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.delete('/DeleteUserpaymentLinks/:userId/:paymentLinkId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const paymentLinkId = req.params.paymentLinkId;

    // Find the user by ID and remove the payment link with the specified ID
    const updatedUser = await User.findByIdAndUpdate(userId, {
      $pull: { paymentLinks: { _id: paymentLinkId } },
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User or payment link not found' });
    }

    res.json({ message: 'Payment link deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Endpoint to set the commission rate by admin
/**
 * @swagger
 * /admin/commissionRate:
 *   put:
 *     summary: Update the commission rate for the admin.
 *     description: Updates the commission rate for the admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commissionRate:
 *                 type: number
 *                 description: The new commission rate to set for the admin.
 *     responses:
 *       200:
 *         description: Commission rate updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.put('/admin/commissionRate', async (req, res) => {
  try {
    const { commissionRate } = req.body;

    // Update the commission rate in the admin schema
    await Admin.updateOne({}, { commissionRate });
    res.json({ message: 'Commission rate updated successfully' });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Endpoint to get the commission rate by admin
/**
 * @swagger
 * /admin/getcommissionRate/{userId}:
 *   get:
 *     summary: Get the commission rate for the admin by user ID.
 *     description: Retrieves the commission rate for the admin based on the provided user ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the admin user.
 *     responses:
 *       200:
 *         description: Successful response containing the admin's commission rate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The ID of the admin.
 *                 commissionRate:
 *                   type: number
 *                   description: The commission rate for the admin.
 *       500:
 *         description: Server Error or admin not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.get('/admin/getcommissionRate/:userId', async (req, res) => {
 const userId = req.params.userId;
    const admin = await Admin.findById(userId); 
    
  if(!admin){
    res.status(500).json({ message: 'Server Error' });
  }
  res.json(admin);
  
});

// Edit API key by user ID and API key ID
/**
 * @swagger
 * /getUsersApiKey/{userId}/{apiKeyId}:
 *   get:
 *     summary: Get a user's API key by user ID and API key ID.
 *     description: Retrieves a specific API key associated with a user by their user ID and API key ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: path
 *         name: apiKeyId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the API key to be retrieved.
 *     responses:
 *       200:
 *         description: Successful response containing the user's API key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The ID of the API key.
 *       404:
 *         description: User not found or API key not found for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.get('/getUsersApiKey/:userId/:apiKeyId', async (req, res) => {
  try {
    const { userId, apiKeyId } = req.params;

    console.log(userId, apiKeyId)
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the API key by API key ID
    const apiKey = user.apiKeys.find((key) => key._id.toString() === apiKeyId);

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found for the user' });
    }

    res.json(apiKey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }

});

// Edit payment link by user ID and payment link ID
/**
 * @swagger
 * /getUsersPaymentLinks/{userId}/{paymentLinkId}:
 *   get:
 *     summary: Get a user's payment link by user ID and payment link ID.
 *     description: Retrieves a specific payment link associated with a user by their user ID and payment link ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: path
 *         name: paymentLinkId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the payment link to be retrieved.
 *     responses:
 *       200:
 *         description: Successful response containing the user's payment link.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The ID of the payment link.
 *       404:
 *         description: User not found or payment link not found for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.get('/getUsersPaymentLinks/:userId/:paymentLinkId', async (req, res) => {
  try {
    const { userId, paymentLinkId } = req.params;

    // Find the user by ID
    console.log(userId, paymentLinkId)

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the payment link by payment link ID
    const paymentLink = user.paymentLinks.find(
      (link) => link._id.toString() === paymentLinkId
    );

    if (!paymentLink) {
      return res
        .status(404)
        .json({ message: 'Payment link not found for the user' });
    }

    res.json(paymentLink);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


/**
 * @swagger
 * /AdminInfo/{id}:
 *   get:
 *     summary: Get admin information by user ID.
 *     description: Retrieves information about an admin user by their user ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the admin user.
 *     responses:
 *       200:
 *         description: Successful response containing the admin's information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The ID of the admin user.
 *       404:
 *         description: Admin user not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.get("/AdminInfo/:id", async (req, res) => {
  try {
    const  userId = req.params.id;
    // Find the user by ID
    console.log(userId)

    const user = await Admin.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }

 
});

/**
 * @swagger
 * /DonePayment/{userId}:
 *   get:
 *     summary: Get the total amount of payments marked as "done" by user ID.
 *     description: Retrieves the total amount of payments marked as "done" associated with a user by their user ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *     responses:
 *       200:
 *         description: Successful response containing the total amount of "done" payments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDonePrice:
 *                   type: number
 *                   description: The total amount of payments marked as "done".
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

Routers.get('/DonePayment/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter payment links with status "done" and calculate the total price
    const totalDonePrice = user.paymentLinks.reduce((total, link) => {
      if (link.status === 'done') {
        return total + parseFloat(link.amount); // Assuming 'amount' is a string, convert it to a float
      }
      return total;
    }, 0);

    res.json({ totalDonePrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /PendingPayment/{userId}:
 *   get:
 *     summary: Get the total amount of pending payments by user ID.
 *     description: Retrieves the total amount of pending payments associated with a user by their user ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *     responses:
 *       200:
 *         description: Successful response containing the total amount of pending payments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPendingPrice:
 *                   type: number
 *                   description: The total amount of pending payments.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
Routers.get('/PendingPayment/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter payment links with status "done" and calculate the total price
    const totalPeningPrice = user.paymentLinks.reduce((total, link) => {
      if (link.status === 'Pending') {
        return total + parseFloat(link.amount); // Assuming 'amount' is a string, convert it to a float
      }
      return total;
    }, 0);

    res.json({ totalPeningPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /getEmail/{id}:
 *   get:
 *     summary: Send an email with a specific message.
 *     description: Sends an email with a message to a predefined recipient.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The message ID to include in the email.
 *     responses:
 *       201:
 *         description: Email sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
Routers.get("/getEmail/:id", async (req, res) => {
  try {
    const meassge = req.params.id;
   
    // Send a registration confirmation email
    let info = await transporter.sendMail({
      from: "Testing@gmail.com",
      to: "asadghouri546@gmail.com",
      subject: "Testing, testing, 123",
      html: `
      <h1>Get Email</h1>
      <p>${meassge}</p>
      `,
    });
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: err });
  }
});





// laiq end points
const STATUS_PENDING = "Pending";

// Helper function to find a user by API key
async function findUserByApiKey(apiKey) {
  try {
    const user = await User.findOne({ "apiKeys.apiKey": apiKey });
    return user;
  } catch (error) {
    throw error;
  }
}

// Helper function to generate a payment link
async function generatePaymentLink_with_Order_ID(user, amount, currency, OrderId, note) {
  try {
    const wallet = Wallet["default"].generate();
    const paymentLink = {
      uniqueid: Math.random().toString(36).substring(7),
      address: wallet.getAddressString(),
      createdat: new Date(),
      privateKey: wallet.getPrivateKeyString(),
      OrderId,
      amount,
      currency,
      note: note || "Optional",
      status: STATUS_PENDING,
    };
    user.paymentLinks.push(paymentLink);
    await user.save();
    return paymentLink;
  } catch (error) {
    throw error;
  }
}

// Endpoint for generating payment links
/**
 * @swagger
 * /GetLinkbyApiKey:
 *   post:
 *     summary: Generate a payment link for a user using their API key.
 *     description: Generates a payment link for a user based on their API key and provided query parameters.
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user's API key.
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         required: true
 *         description: The payment amount.
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         required: true
 *         description: The currency of the payment.
 *       - in: query
 *         name: OrderId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Order ID associated with the payment.
 *     responses:
 *       200:
 *         description: Successful response containing the generated payment link URL and unique ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentLinkURL:
 *                   type: string
 *                   description: The URL of the generated payment link.
 *                 id:
 *                   type: string
 *                   description: The unique ID of the generated payment link.
 *       400:
 *         description: Bad Request. Missing or invalid query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
Routers.post('/GetLinkbyApiKey', async (req, res) => {
  const apiKey = req.query.id;
  const amount = req.query.amount;
  const currency = req.query.currency;
  const OrderId = req.query.OrderId;
  const note = "Optional";

  console.log(apiKey);

  try {
    if (!apiKey) {
      return res.status(400).json({ msg: "Please provide an 'id' query parameter" });
    }

    const user = await findUserByApiKey(apiKey);
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const paymentLink = await generatePaymentLink_with_Order_ID(user, amount, currency, OrderId, note);
    const paymentLinkURL = `https://alpha-payment-frontend.vercel.app/PaymentLinkGenerator/gett/${user._id}/${paymentLink.uniqueid}`;
    
    return res.status(200).json({ paymentLinkURL, id: paymentLink.uniqueid });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for checking payment status
/**
 * @swagger
 * /getStatus:
 *   post:
 *     summary: Get the payment status for an order using API key and order ID.
 *     description: Retrieves the payment status for a specific order using the provided API key and order ID as query parameters.
 *     parameters:
 *       - in: query
 *         name: apikey
 *         schema:
 *           type: string
 *         required: true
 *         description: The user's API key.
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: The Order ID associated with the payment.
 *     responses:
 *       200:
 *         description: Successful response containing the payment status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentStatus:
 *                   type: string
 *                   description: The payment status for the specified order.
 *       400:
 *         description: Bad Request. Missing or invalid query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *                   description: The provided API key in the query.
 *                 orderId:
 *                   type: string
 *                   description: The provided Order ID in the query.
 *       404:
 *         description: User not found or Order ID not found in payment links.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *       500:
 *         description: Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
Routers.post('/getStatus', async (req, res) => {
  const apiKey = req.query.apikey;
  const orderId = req.query.orderId;

  try {
    if (!apiKey || !orderId) {
      return res.status(200).json({ msg: "Please provide valid 'apikey' and 'orderId' query parameters",
                                  apiKey : apiKey, orderId : orderId});
    }

    const user = await findUserByApiKey(apiKey);

    if (!user) {
      return res.status(404).json({ msg: "User with the provided API key not found" });
    }

    const paymentLink = user.paymentLinks.find(link => link.OrderId === orderId);

    if (paymentLink) {
      const paymentStatus = paymentLink.status;
      console.log(`Payment Status: ${paymentStatus}`);
      return res.status(200).json({ paymentStatus });
    } else {
      console.log("Order ID not found in payment links.");
      return res.status(404).json({ msg: "Order ID not found in payment links" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
module.exports = Routers;
