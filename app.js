"use strict";

var express = require("express");
var request = require('request');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');
// var handoff = require("botbuilder-handoff");

var weatherEndPoint = 'https://query.yahooapis.com/v1/public/yql?q=select%20item.condition%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text=%27Vancouver%27)%20and%20u=%27c%27&format=json';    

var app = express();

app.listen(process.env.port || process.env.PORT || 3978, '::', function () {
    console.log('Server Up');
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var instructions = 'Welcome! you can ask about holy water, the weather, or a dentist';

var bot = new builder.UniversalBot(connector);

app.post('/api/messages', connector.listen());

//=========================================================
// QnA Setup
//=========================================================
var qnarecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: process.env.QNA_KNOWLEDGEBASE_ID, 
	subscriptionKey: process.env.QNA_SUBSCRIPTION_KEY,
    top: 4});

//=========================================================
// LUIS Setup
//=========================================================
var luisrecognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/' + process.env.LUIS_APP_ID + '?subscription-key=' + process.env.LUIS_SUBSCRIPTION_KEY + '&verbose=true&timezoneOffset=0&q=');

//=========================================================
// Bot Handoff
//
// handoff.setup (
//   bot: builder.UniversalBot
//   app: express ( e.g. const app = express(); )
//   isAgent: function to determine when agent is talking to the bot
//   options: { 
//     mongodbProvider: process.env.MONGODB_PROVIDER,
//     directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET,
//     textAnalyticsKey: process.env.CG_SENTIMENT_KEY,
//     appInsightsInstrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
//     retainData: process.env.RETAIN_DATA,
//     customerStartHandoffCommand: process.env.CUSTOMER_START_HANDOFF_COMMAND
//   }     
// )
//=========================================================
const isAgent = (session) => session.message.user.name.startsWith("agent");

// handoff.setup(bot, app, isAgent, {
//     mongodbProvider: process.env.MONGODB_PROVIDER,
//     directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET,
//     retainData: "true",
//     customerStartHandoffCommand: "human"
//  });

//========================================================
// Bot Intents
//========================================================
var intents = new builder.IntentDialog({ recognizers: [luisrecognizer, qnarecognizer] });

intents.matches('Weather.GetCondition', builder.DialogAction.send('Inside LUIS Intent 1.'));

intents.matches('Weather.GetForecast', [
    function (session, args, next) {
        request.get({
            url : weatherEndPoint
        }, function (error, response, body) {
            var json = JSON.parse(body);
            session.send("It's " + json.query.results.channel.item.condition.temp + " °C and " + json.query.results.channel.item.condition.text );
        });      
    }
]);

intents.matches('qna', [
    function (session, args, next) {
        var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
        session.send(answerEntity.entity);
    }
]);

intents.onDefault([
    function(session){
        session.send('Sorry!! No match!!');
	}
]);

//========================================================
// Bot Dialogs
//========================================================
bot.dialog('/', intents);

// bot.dialog('/connectToHuman', function (session) {        
//     handoff.triggerHandoff(session);
// }).triggerAction({
//     matches: /^agent/i
// });

bot.on('conversationUpdate', function (activity) {
    // when user joins conversation, send instructions
    if (activity.membersAdded) {
        activity.membersAdded.forEach(function (identity) {
            if (identity.id === activity.address.bot.id) {
                var reply = new builder.Message()
                .address(activity.address)
                if(isAgent){
                    reply
                    .text('you are an agent!');                    
                }else{
                    reply
                    .text(instructions);                    
                }
                bot.send(reply);
            }
        });
    }
});