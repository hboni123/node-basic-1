
const express = require('express');
const mongoose = require('mongoose');
const Customer = require('./models/customer.js');
const moment = require('moment');

require('dotenv').config();


const app = express();
const PORT = 3000;
const URI = process.env.MONGODB_URI;

let rateLimit = [];
let timeLimit1 = 0;
let timeLimit2 = 0;
let s = 1;
let timestamp = moment();


 

app.use(express.json());

const rateLimiters = {};

//rate check 2 mins

const checkRateLimit = (customerName) => {
    const limitCount = 1; 
    const limitTime = 2 * 60 * 1000; 
    const now = moment();
    if (!rateLimiters[customerName]) {
      rateLimiters[customerName] = {
        count: 1,
        lastRequest: now,
      };
      setTimeout(() => {
        delete rateLimiters[customerName];
      }, limitTime);
      return true;
    } else {
      rateLimiters[customerName].count++;
      const timeDiff = now.diff(rateLimiters[customerName].lastRequest);
      if (rateLimiters[customerName].count > limitCount || timeDiff < limitTime) {
        throw {
          message: 'Maximum limit reached'
        };
      } else {
        rateLimiters[customerName] = {
          count: 1,
          lastRequest: now,
        };
        setTimeout(() => {
          delete rateLimiters[customerName];
        }, limitTime);
        return true;
      }
    }
  };

let callHistory = [];

//5 min call limit

function checkRateLimit2() {
    const now = Date.now();
    
    callHistory = callHistory.filter(timestamp => now - timestamp <= 300000);
    
    if (callHistory.length < 2) {
        callHistory.push(now);
        return true;
    }
    
    const oldestCall = callHistory[0];
    if (now - oldestCall > 300000) {
        callHistory.shift();
        callHistory.push(now);
        return true;
    }
    
    throw {
      message: 'Only 2 hits allowed per 5 min'
    };
}

//time-based api
const checkTimeRestriction = () => {
    const now = moment();
    const dayOfWeek = now.day(); 
    const hourOfDay = now.hour();
  
    if (dayOfWeek === 1) { 
      throw {
        message: 'Please don’t use this API on Monday'
      };
    } else if (hourOfDay >= 8 && hourOfDay < 15) { 
      throw {
        message: 'Please try after 3pm'
      };
    }
  
    return true;
  };



app.get('/', (req,res) => {
    res.send("Hello World")
});

mongoose.connect(URI)
.then(() => {
        console.log("Connected to MongoDB");
})
.catch(() => {
        console.log("could not connect to DB")
});



app.post('/db-save', async (req, res) => {
    
  const { customer_name, dob, monthly_income } = req.body;
  
  try {   

      if (!customer_name || !dob || !monthly_income) {
          throw {
              message: 'All parameters are required'
          };
      }

      const dobMoment = moment(dob);
      const age = moment().diff(dobMoment, 'years');
      if (age <= 15) {
          throw {
          message: 'Age must be above 15'
          };
      }

      checkRateLimit2()     
      checkRateLimit(customer_name, 1, 120000);

      const customer = await Customer.create({
          customer_name,
          dob: new Date(dob),
          monthly_income
      });

      res.status(200).json(customer)
  } catch (error) {
      console.error('Error saving customer:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});



app.post('/time-based-api', async (req, res) => {
    const { customer_name, dob, monthly_income } = req.body;
  
    try {
      
      checkTimeRestriction();
  
      const customer = await Customer.create({
        customer_name,
        dob,
        monthly_income
        });
  
      res.status(201).json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  });

app.get('/db-search', async (req, res) => {
    try {
      const startTime = moment();
  
      const dobStartDate = moment().subtract(25, 'years');
      const dobEndDate = moment().subtract(10, 'years');
  
      const customers = await Customer.find({
        dob: {
          $gte: dobStartDate.toDate(),
          $lte: dobEndDate.toDate()
        }
      }, 'customer_name');
  
      const endTime = moment();
      const durationInSeconds = endTime.diff(startTime, 'seconds');
  
      res.status(200).json({
        customers: customers.map(customer => customer.customer_name),
        time_taken_seconds: durationInSeconds
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
