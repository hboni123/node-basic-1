const express = require('express');
const mongoose = require('mongoose');
const Customer = require('./models/customer.js');
const moment = require('moment');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { google } = require('googleapis');
const crypto = require('crypto');
const url = require('url');

require('dotenv').config();

const app = express();
const PORT = 3000;
const URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: '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',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

let userCredential = null;

app.get('/', (req, res) => {
  res.send("Hello World");
});

app.get('/login', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.state = state;
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    state: state
  });
  res.redirect(authorizationUrl);
});

app.get('/oauth2callback', async (req, res) => {
  let q = url.parse(req.url, true).query;
  if (q.error) {
    console.log('Error:' + q.error);
    res.status(500).json({ error: q.error });
  } else if (q.state !== req.session.state) {
    console.log('Invalid state');
    res.status(401).json({ error: 'Invalid state' });
  } else {
    try {
      const { tokens } = await oauth2Client.getToken(q.code);
      oauth2Client.setCredentials(tokens);
      userCredential = tokens;
      req.session.accessToken = tokens.access_token;
      req.session.refreshToken = tokens.refresh_token;
      res.redirect('/protected');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
});

app.get('/protected', async (req, res) => {
  if (!req.session.accessToken) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(req.session.accessToken);
      if (tokenInfo.exp * 1000 < Date.now()) {
        // access token expired, use refresh token to get new access token
        const newTokens = await oauth2Client.refreshToken(req.session.refreshToken);
        req.session.accessToken = newTokens.access_token;
        req.session.refreshToken = newTokens.refresh_token;
      }
      res.json({ message: 'Welcome, ' + tokenInfo.sub });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
});

const authenticateAPI = async (req, res, next) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const tokenInfo = await oauth2Client.getTokenInfo(req.session.accessToken);
    if (tokenInfo.exp * 1000 < Date.now()) {
      // access token expired, use refresh token to get new access token
      const newTokens = await oauth2Client.refreshToken(req.session.refreshToken);
      req.session.accessToken = newTokens.access_token;
      req.session.refreshToken = newTokens.refresh_token;
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

app.post('/db-save', authenticateAPI, async (req, res) => {
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
      console.log("Customer saved!!")
      res.status(200).json(customer)
  } catch (error) {
      console.error('Error saving customer:', error);
      res.status(500).json({ message: error });
  }
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
