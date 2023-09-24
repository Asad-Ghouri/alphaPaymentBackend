const express = require("express");
const Routers = express.Router();
const User = require("../Modles/User");
const Admin = require('../Modles/Admin');
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


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // SMTP server address (usually mail.your-domain.com)
  port: 465, // Port for SMTP (usually 465)
  secure: true, 
  auth: {
    user: 'asadghouri546@gmail.com',
    pass: 'ymsz tfvn unqm jogj',
  },
});

Routers.post("/Registration", async (req, res) => {
  try {
    const { Name, email, password } = req.body;
    // const Name = "asad";
    // const email = "l2s013s34@lhr.nu.edu.pk";
    // const password  = "dsgdd";
    console.log( Name, email, password)
    if (!Name || !email || !password) {
      return res
        .status(422)
        .json({ error: "Please fill all the fields properly" });
    }
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      return res.status(422).json({ message: "Email already exists" });
    }
    const user = new User({ Name, email, password });
    await user.save();
 
    // Send a registration confirmation email
    let info = await transporter.sendMail({
      from: email,
      to: "asadghouri546@gmail.com",
      subject: "Testing, testing, 123",
      html: `
      <h1>Hello there</h1>
      <p>Isn't NodeMailer useful?</p>
      `,
    });
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: err });
  }
});

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
    let info = await transporter.sendMail({
      from: email,
      to: "asadghouri546@gmail.com",
      subject: "Login Successfully",
      html: `
      <h1>Hello there</h1>
      <p>Isn't NodeMailer useful?</p>
      `,
    });
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

                                   

Routers.get('/changedetails/gett/:id/:amd/:address/:amount/:privateKey/', async (request, response) => {
  try {
    const userId = request.params.id;
    const uniqueId = request.params.amd;
    const address = request.params.address;
    const amount = request.params.amount;
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


Routers.post('/GetDatabyApiKey', async (req, res) => {
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
      note,
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
Routers.get('/PendingPaymentLinksDetail', async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$paymentLinks', // Unwind the paymentLinks array
      },
      {
        $group: {
          _id: '$_id',
          // email: { $first: '$email' }, // Include email
          paymentLinks: { $push: '$paymentLinks' }, // Include payment links
          // totalPaymentLinks: { $sum: 1 }, // Count the documents
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

Routers.get('/AllUsers', async (req, res) => {
  try {
    const users = await User.find({}, 'email password'); // Project only email and password fields
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

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
Routers.get('/admin/getcommissionRate/:userId', async (req, res) => {
 const userId = req.params.userId;
    const admin = await admins.findById(userId); 
    
  if(!admin){
    res.status(500).json({ message: 'Server Error' });
  }
  res.json(admin);
  
});

// Edit API key by user ID and API key ID
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

module.exports = Routers;
