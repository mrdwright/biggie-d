"use strict";

var express = require("express");
var request = require('request');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');
//var handoff = require("botbuilder-handoff");
var handoff_1 = require("./handoff");
var commands_1 = require("./commands");
var weatherEndPoint = 'https://query.yahooapis.com/v1/public/yql?q=select%20item.condition%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text=%27Vancouver%27)%20and%20u=%27c%27&format=json';    
var app = express();

app.listen(process.env.port || process.env.PORT || 3978, '::', function () {
    console.log('Server Up');
});

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

app.post('/api/messages', connector.listen());

//=========================================================
// Handoff Setup
//=========================================================
 
// var isAgent = function (session) { return session.message.user.name.startsWith("agent"); };
// /**
//    bot: builder.UniversalBot
//    app: express ( e.g. const app = express(); )
//    isAgent: function to determine when agent is talking to the bot
//    options: { 
//         mongodbProvider: process.env.MONGODB_PROVIDER,
//         directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET,
//         textAnalyticsKey: process.env.CG_SENTIMENT_KEY,
//         appInsightsInstrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
//         retainData: process.env.RETAIN_DATA,
//         customerStartHandoffCommand: process.env.CUSTOMER_START_HANDOFF_COMMAND
//    }     
// **/
// handoff.setup(bot, app, isAgent, {
//    mongodbProvider: process.env.MONGODB_PROVIDER,
//    directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET,
//    retainData: "true",
//    customerStartHandoffCommand: "human"
// });

var bot = new builder.UniversalBot(connector);

var intents = new builder.IntentDialog({ recognizers: [recognizer, qnarecognizer] });
bot.dialog('/', intents);

bot.dialog('/connectToHuman', function (session) {        
    handoff.triggerHandoff(session);
}).triggerAction({
    matches: /^agent/i
});

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

const isAgent = (session) => session.message.user.name.startsWith("Agent");
const handoff = new handoff_1.Handoff(bot, isAgent);
//========================================================
// Bot Middleware
//========================================================
bot.use(commands_1.commandsMiddleware(handoff), handoff.routingMiddleware());


