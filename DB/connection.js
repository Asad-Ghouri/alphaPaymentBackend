const mongose = require("mongoose");


const db = "mongodb+srv://asadghouri546:7Oj4ABEpgn93Is9Z@cluster0.wirmp0f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongose.connect(db , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(()=>{
    console.log("connection Done!");
}).catch((err)=>{
    console.log(err);
})