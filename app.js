"use strict";
/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
var express = require("express");
//var restify = require('restify');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');
var handoff = require("botbuilder-handoff");
//=========================================================
// Normal Bot Setup
//=========================================================
// Setup Express Server (N.B: If you are already using restify for your bot, you will need replace it with an express server)
var app = express();
// Setup Express Server
app.listen(process.env.port || process.env.PORT || 3978, '::', function () {
    console.log('Server Up');
});




// Setup Restify Server
// var server = restify.createServer();
// server.listen(process.env.port || process.env.PORT || 3978, function () {
//    console.log('%s listening to %s', server.name, server.url); 
// });

// For Emulator to work

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

var qnarecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: process.env.QnaKbId, 
	subscriptionKey: process.env.QnaSubKey,
    top: 4});

var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/' + process.env.LuisAppId;
model += '?subscription-key=' + process.env.LuisSubKey + '&verbose=true&timezoneOffset=0&q=';

var recognizer = new builder.LuisRecognizer(model);

// Listen for messages from users 
//server.post('/api/messages', connector.listen());
app.post('/api/messages', connector.listen());


//=========================================================
// Handoff Setup
//=========================================================
 
// Replace this functions with custom login/verification for agents

var isAgent = function (session) { 
    return session.message.user.name.startsWith("mrdwright"); };
/**
   bot: builder.UniversalBot
   app: express ( e.g. const app = express(); )
   isAgent: function to determine when agent is talking to the bot
   options: { }     
**/
handoff.setup(bot, app, isAgent, {
   mongodbProvider: process.env.MONGODB_PROVIDER,
   directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET,
   retainData: "true",
   customerStartHandoffCommand: "human"
});

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector,[
    function (session, args, next) {
        session.endConversation('Echo ' + session.message.text);
    }
]);

var intents = new builder.IntentDialog({ recognizers: [recognizer, qnarecognizer] });
//bot.dialog('/', intents);
//triggerHandoff manually
bot.dialog('/connectToHuman', function (session) {    
    session.send("Hold on, buddy! Connecting you to the next available agent!");
    handoff.triggerHandoff(session);
}).triggerAction({
    matches: /^agent/i
});

// intents.matches('Weather.GetCondition', builder.DialogAction.send('Inside LUIS Intent 1.'));

// intents.matches('Weather.GetForecast',[
//     function (session, args, next) {
//         isAgent;
//         session.send('username is ' + session.message.user.name);
//     }
// ]);

// intents.matches('qna', [
//     function (session, args, next) {
//         var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
//         session.send(answerEntity.entity);
//     }
// ]);

// intents.onDefault([
//     function(session){
//         session.send('Sorry!! No match!!');
// 	}
// ]);


