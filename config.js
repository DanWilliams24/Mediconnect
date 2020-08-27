require('dotenv-safe').config();

const cfg = {};
//Sets whether to use twilio in development mode. This incurs no costs to your account and sends no real sms.
cfg.useTestCredentials = process.env.DEV_MODE
// HTTP Port to run our web application
cfg.port = process.env.PORT || 3000;

// A random string that will help generate secure one-time passwords and
// HTTP sessions
cfg.secret = process.env.APP_SECRET;

// Your Twilio account SID and auth token, both found at:
// https://www.twilio.com/user/account
//
// A good practice is to store these string values as system environment
// variables, and load them from there as we are doing below. Alternately,
// you could hard code these values here as strings.
cfg.accountSid = (cfg.useTestCredentials) ? process.env.TWILIO_TEST_ACCOUNT_SID : process.env.TWILIO_ACCOUNT_SID;
cfg.authToken = (cfg.useTestCredentials) ? process.env.TWILIO_TEST_AUTH_TOKEN :process.env.TWILIO_AUTH_TOKEN ;
// A Twilio number you control - choose one from:
// https://www.twilio.com/user/account/phone-numbers/incoming
// Specify in E.164 format, e.g. "+16519998877"
cfg.twilioNumber = process.env.TWILIO_NUMBER;
//My number used for testing purposes during development.
cfg.myNumber = process.env.MY_NUMBER;
cfg.MedicNumber = process.env.TWILIO_NUMBER_MEDIC || cfg.twilioNumber;
// MongoDB connection string - MONGO_URL is for dev,
cfg.mongoUrl = process.env.MONGO_URL; // default

// Export configuration object
module.exports = cfg;