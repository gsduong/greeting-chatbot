'use strict';

require('dotenv').config();

// Imports dependencies and set up http server
const
	express = require('express'),
	bodyParser = require('body-parser'),
	request = require('request'),
	app = express().use(bodyParser.json()); // creates express http server
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

	// Parse the request body from the POST
	let body = req.body;

	// Check the webhook event is from a Page subscription
	if (body.object === 'page') {

		// Iterate over each entry - there may be multiple if batched
		body.entry.forEach(function(entry) {

			// Get the webhook event. entry.messaging is an array, but 
			// will only ever contain one event, so we get index 0
			let webhook_event = entry.messaging[0];
			console.log(webhook_event);
			// Get the sender PSID
			let sender_psid = webhook_event.sender.id;
			console.log('Sender PSID: ' + sender_psid);

			// Check if the event is a message or postback and
			// pass the event to the appropriate handler function
			if (webhook_event.message) {
				handleMessage(sender_psid, webhook_event.message);
			} else if (webhook_event.postback) {
				handlePostback(sender_psid, webhook_event.postback);
			}
		});

		// Return a '200 OK' response to all events
		res.status(200).send('EVENT_RECEIVED');

	} else {
		// Return a '404 Not Found' if event is not from a page subscription
		res.sendStatus(404);
	}

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

	// Your verify token. Should be a random string.
	let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

	// Parse the query params
	let mode = req.query['hub.mode'];
	let token = req.query['hub.verify_token'];
	let challenge = req.query['hub.challenge'];

	// Checks if a token and mode is in the query string of the request
	if (mode && token) {

		// Checks the mode and token sent is correct
		if (mode === 'subscribe' && token === VERIFY_TOKEN) {

			// Responds with the challenge token from the request
			console.log('WEBHOOK_VERIFIED');
			res.status(200).send(challenge);

		} else {
			// Responds with '403 Forbidden' if verify tokens do not match
			res.sendStatus(403);
		}
	}
});

// routes
app.get('/', (req, res) => {
	res.status(200).send("It works!");
});
app.get('/setup', function(req, res) {

	setupGetStartedButton(res);
});

// Handles messages events
function handleMessage(sender_psid, received_message) {

	let response;

	// Check if the message contains text
	if (received_message.text) {
		// Create the payload for a basic text message
		response = {
			"text": `Chúng tôi vừa nhận được tin nhắn của bạn: "${received_message.text}"`
		}
	}

	// Sends the response message
	callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
	let response;

	// Get the payload for the postback
	let payload = received_postback.payload;
	// Set the response based on the postback payload
	if (payload === 'USER_GETTING_STARTED') {
		response = {
			"text": `TopJob Funny xin chào bạn :) Hãy để lại số điện thoại của bạn để chúng tôi có thể hỗ trợ cho bạn sớm nhất có thể!`
		}
	}
	// Send the message to acknowledge the postback
	callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
	// SenderAction ...
	sendTypingAction(sender_psid);

	// Construct the message body
	let request_body = {
		"recipient": {
			"id": sender_psid
		},
		"message": response
	}

	// Send the HTTP request to the Messenger Platform
	request({
		"uri": "https://graph.facebook.com/v2.6/me/messages",
		"qs": {
			"access_token": process.env.PAGE_ACCESS_TOKEN
		},
		"method": "POST",
		"json": request_body
	}, (err, res, body) => {
		if (!err) {
			console.log('message sent!')
		} else {
			console.error("Unable to send message:" + err);
		}
	});
}

function sendTypingAction(sender_psid) {

	let request_body = {
		"recipient": {
			"id": sender_psid
		},
		"sender_action": "typing_on"
	}
	// Send the HTTP request to the Messenger Platform
	request({
		"uri": "https://graph.facebook.com/v2.6/me/messages",
		"qs": {
			"access_token": process.env.PAGE_ACCESS_TOKEN
		},
		"method": "POST",
		"json": request_body
	}, (err, res, body) => {
		if (!err) {
			console.log('SenderAction sent!')
		} else {
			console.error("Unable to send sender action:" + err);
		}
	});
}

function setupGetStartedButton(res) {
	var messageData = {
		"get_started": {
			"payload": "USER_GETTING_STARTED"
		}
	};

	// Start the request
	request({
			url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + process.env.PAGE_ACCESS_TOKEN,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			form: messageData
		},
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				// Print out the response body
				res.send(body);

			} else {
				// TODO: Handle errors
				res.send(body);
			}
		});
}