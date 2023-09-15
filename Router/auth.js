const express = require("express");
const Routers = express.Router();
const User = require("../Modles/User");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const bodyParser = require("body-parser");
const Wallet = require("ethereumjs-wallet");
const util = require('util');
const Tx = require("ethereumjs-tx");
const Web3 = require("web3");
const ethereumjsutil = require("ethereumjs-util");
const qrcode = require("qrcode");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
// const ethers =  require('ethers');
// import { ethers } from "ethers";


Routers.post("/Registration", async (req, res) => {
  try {
    const { Name, email, password } = req.body;
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
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
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
                const user = await User.findOneAndUpdate(
                  {
                    _id: idss,
                    "paymentLinks.uniqueid": uniqueId,
                  },
                  {
                    $set: {
                      "paymentLinks.$.status": "done",
                    },
                  },
                  { new: true }
                );
                
                console.log(`User updated: ${user}`);
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

module.exports = Routers;
