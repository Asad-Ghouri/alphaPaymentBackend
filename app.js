const express = require('express');
const app =express();
const doteenv =require('dotenv');
const cors = require('cors'); // Import the CORS middleware

doteenv.config({path: './config.env'});
require('./DB/connection');
const port = 5000;

app.use(express.json());
app.use(require('./Router/auth.js'));

// const corsOptions = {
//     origin: '*',
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true, // Enable credentials (cookies, HTTP authentication) if needed
//     optionsSuccessStatus: 204, // Respond to preflight requests with a 204 status code
//   };
  
//   app.use(cors(corsOptions)); // 

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});


app.listen(port,() =>{
    console.log(`Sever is running at localhost ${port}`);  
})