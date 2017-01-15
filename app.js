/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('dotenv').config({ silent: true });

var express = require('express');
var vcapServices = require('vcap_services');
var extend = require('extend');
var AlchemyLanguageV1 = require('watson-developer-cloud/alchemy-language/v1');
var AuthorizationV1 = require('watson-developer-cloud/authorization/v1');
var youtube = require('./youtube');

var app = express();

if (process.env.hasOwnProperty("VCAP_SERVICES")) {
  // Running on Bluemix. Parse out the port and host that we've been assigned.
  console.log('running on Bluemix');
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var host = process.env.VCAP_APP_HOST;
  var port = process.env.VCAP_APP_PORT;

  // Also parse out Cloudant settings.
  //cloudant = env['cloudantNoSQLDB'][0].credentials;  
}
else {
  console.log('running locally');
}
console.log('ALCHEMY_LANGUAGE_API_KEY: ', process.env.ALCHEMY_LANGUAGE_API_KEY);
console.log('SPEECH_TO_TEXT_USERNAME: ', process.env.SPEECH_TO_TEXT_USERNAME);
console.log('SPEECH_TO_TEXT_PASSWORD: ', process.env.SPEECH_TO_TEXT_PASSWORD);

var authService;
var alchemyLanguage;
try { 
  authService = new AuthorizationV1(extend({
    username: process.env.SPEECH_TO_TEXT_USERNAME,
    password: process.env.SPEECH_TO_TEXT_PASSWORD,
    url: 'https://stream.watsonplatform.net/speech-to-text/api'
  }, vcapServices.getCredentials('speech_to_text')));

  alchemyLanguage = new AlchemyLanguageV1({});

} catch (error) {
  console.log('Error: ', error);
}

// Bootstrap application settings
require('./config/express')(app);

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/dashboard', function(req, res) {
  res.render('dashboard');
});

app.get('/tos', function(req, res) {
  res.render('tos');
});

app.post('/api/concepts', function(req, res, next) {
  alchemyLanguage.concepts(req.body, function(err, result) {
    if (err)
      next(err);
    else
      res.json(result);
    }
  );
});

app.get('/api/video', function(req, res, next) {
  youtube.getVideoChunk(req.query, req, res, next);
});

app.get('/api/video_url', function(req, res, next) {
  youtube.getInternalUrl(req.query, function(err, url) {
    if (err)
      next(err);
    else
      res.json(url);
    }
  );
});

// Get token using your credentials
app.post('/api/token', function(req, res, next) {
  authService.getToken({
    url: 'https://stream.watsonplatform.net/speech-to-text/api'
  }, function(err, token) {
    if (err)
      next(err);
    else
      res.send(token);
    }
  );
});

// error-handler application settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
// eslint-disable-next-line
console.log('listening at: ', port);
