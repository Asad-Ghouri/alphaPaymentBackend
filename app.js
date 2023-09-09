const express = require('express');
const app =express();
const doteenv =require('dotenv');

doteenv.config({path: './config.env'});
require('./DB/connection');
const port = 5000;

app.use(express.json());
app.use(require('./Router/auth.js'));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://payment-asad-ghouri.vercel.app');
    // You can also specify additional CORS headers as needed.
    // ...
    next();
  });
  

app.listen(port,() =>{
    console.log(`Sever is running at localhost ${port}`);  
})