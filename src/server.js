require('dotenv').load();

const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const defaultIdentity = 'alice';
const callerId = 'client:quick_start';
var client = require('twilio');

require('dotenv').config();

// Use a valid Twilio number by adding to your account via https://www.twilio.com/console/phone-numbers/verified
const callerNumber = '+919998947040';


/**
 * Creates an access token with VoiceGrant using your Twilio credentials.
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {string} - The Access Token string
 */
function tokenGenerator(request, response) {
  // Parse the identity from the http request
  var identity = null;
  if (request.method == 'POST') {
    identity = request.body.identity;
  } else {
    identity = request.query.identity;
  }

  if (!identity) {
    identity = defaultIdentity;
  }

  // Used when generating any kind of tokens
  const twilioAccountSid = process.env.TWILLIO_ACCOUNT_SID;
  const twilioApiKey = process.env.TWILLIO_API_KEY;
  const twilioApiSecret = process.env.TWILLIO_API_KEY_SECRET;

  // Used specifically for creating Voice tokens
  const pushCredSid = process.env.PUSH_CREDENTIAL_SID;
  const outgoingApplicationSid = process.env.TWILLIO_TWIML_APP_SID;

  console.log('Keys : ' + twilioAccountSid);
  // console.log('Response:' + voiceResponse.toString());

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: outgoingApplicationSid,
    incomingAllow: true,
    pushCredentialSid: pushCredSid
  });

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
  token.addGrant(voiceGrant);
  token.identity = identity;
  const currentTime = new Date().getTime();
  const oneDayTime = (24 * 60 * 60);
  const next24Hour = currentTime + (oneDayTime * 1000);
  token.ttl = oneDayTime;
  console.log("Next24Hour", currentTime);
  console.log("Next24Hour", next24Hour);

  const jwtToken = token.toJwt();
  console.log('Token:' + jwtToken);
  const generatedToken = {
    "token": jwtToken,
    "tokenGenerateTime": currentTime,
    "tokenExpiredTime": next24Hour,
  };
  return response.send(generatedToken);
}

/**
 * Creates an endpoint that can be used in your TwiML App as the Voice Request Url.
 * <br><br>
 * In order to make an outgoing call using Twilio Voice SDK, you need to provide a
 * TwiML App SID in the Access Token. You can run your server, make it publicly
 * accessible and use `/makeCall` endpoint as the Voice Request Url in your TwiML App.
 * <br><br>
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {Object} - The Response Object with TwiMl, used to respond to an outgoing call
 */
function makeCall(request, response) {
  // The recipient of the call, a phone number or a client
  var to = null;
  var callerNumber = null;

  if (request.method == 'POST') {
    to = request.body.to;
    callerNumber = request.body.callerId;
  } else {
    to = request.query.to;
    callerNumber = request.query.callerId;
  }

  console.log("To : ", to);
  console.log("callerNumber : ", callerNumber);

  const voiceResponse = new VoiceResponse();
  voiceResponse.time

  if (to) {
    // voiceResponse.say("Congratulations! You have made your first call! Good bye.");

    if (isNumber(to)) {
      const dial = voiceResponse.dial({
        callerId: callerNumber
      });
      dial.number(to);
    } else {
      const dial = voiceResponse.dial({
        callerId: callerNumber
      });
      // dial.identity(callerNumber);
      dial.client(to);
    }
  } else {
    const dial = voiceResponse.dial({
      callerId: callerId
    });
    dial.client(to);
  }
  console.log('Response:' + voiceResponse.toString());
  return response.send(voiceResponse.toString());
}

/**
 * Makes a call to the specified client using the Twilio REST API.
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {string} - The CallSid
 */
async function placeCall(request, response) {
  // The recipient of the call, a phone number or a client
  var to = null;
  if (request.method == 'POST') {
    to = request.body.to;
  } else {
    to = request.query.to;
  }
  console.log('Request : ' + request);
  console.log(to);
  // The fully qualified URL that should be consulted by Twilio when the call connects.
  var url = request.protocol + '://' + request.get('host') + '/incoming';
  console.log(url);
  const accountSid = process.env.TWILLIO_ACCOUNT_SID;
  const authTokenTwilio = process.env.TWILLIO_AUTH_TOKEN;

  // const apiKey = process.env.API_KEY;
  // const apiSecret = process.env.API_KEY_SECRET;

  const client = await require('twilio')(accountSid, authTokenTwilio);
  // const client = await require('twilio')("AC1ac13934ef9d3eefb6d89ee60212d8eb", "7ef9d05bd61f1f74175c1806a055b123");

  if (!to) {
    console.log("Calling default client:" + defaultIdentity);
    call = await client.calls.create({
      url: url,
      to: defaultIdentity,
      from: callerId,
    });
  } else if (isNumber(to)) {
    console.log("Calling number:" + to);
    call = await client.calls.create({
      url: url,
      to: to,
      from: callerNumber,
    });
  } else {
    console.log("Calling client:" + to);
    call = await client.calls.create({
      url: url,
      to: to,
      from: callerId,
    });
  }
  console.log(call.sid)
  //call.then(console.log(call.sid));
  return response.send(call.sid);
}

/**
 * Creates an endpoint that plays back a greeting.
 */
function incoming() {
  const voiceResponse = new VoiceResponse();
  voiceResponse.say("Congratulations! You have received your first inbound call! Good bye.");
  console.log('Response:' + voiceResponse.toString());
  return voiceResponse.toString();
}

async function welcome() {
  const accountSid = process.env.TWILLIO_ACCOUNT_SID;
  const authTokenTwilio = process.env.TWILLIO_AUTH_TOKEN;

  console.log("AccountId : " + accountSid);

  const voiceResponse = new VoiceResponse();
  voiceResponse.say("Welcome to Twilio");
  console.log('Response:' + voiceResponse.toString());
  return voiceResponse.toString();
}

function isNumber(to) {
  if (to.length == 1) {
    if (!isNaN(to)) {
      console.log("It is a 1 digit long number" + to);
      return true;
    }
  } else if (String(to).charAt(0) == '+') {
    number = to.substring(1);
    if (!isNaN(number)) {
      console.log("It is a number " + to);
      return true;
    };
  } else {
    if (!isNaN(to)) {
      console.log("It is a number " + to);
      return true;
    }
  }
  console.log("not a number");
  return false;
}

exports.tokenGenerator = tokenGenerator;
exports.makeCall = makeCall;
exports.placeCall = placeCall;
exports.incoming = incoming;
exports.welcome = welcome;