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
var AuthorizationV1 = require('watson-developer-cloud/authorization/v1');
var youtube = require('./youtube');
var cloudant = {
		 		 url : "https://eb3a04c9-89cb-4a62-9f20-fcc94e6c1019-bluemix:ca37a9c21daf17bb507acc46c1c3ed1ad25fbe9fa0e7ee788d10371c714c3a7c@eb3a04c9-89cb-4a62-9f20-fcc94e6c1019-bluemix.cloudant.com" 		 		 
};
const https = require('https');
var app = express();

if (process.env.hasOwnProperty("VCAP_SERVICES")) {
  // Running on Bluemix. Parse out Cloudant settings.
  console.log('running on Bluemix');
  var env = JSON.parse(process.env.VCAP_SERVICES);
  cloudant = env['cloudantNoSQLDB'][0].credentials;  
  console.log('cloudant config: ', cloudant);
}
else {
  console.log('running locally');
  console.log('SPEECH_TO_TEXT_USERNAME: ', process.env.SPEECH_TO_TEXT_USERNAME);
  console.log('SPEECH_TO_TEXT_PASSWORD: ', process.env.SPEECH_TO_TEXT_PASSWORD);
}

var nano = require('nano')(cloudant.url);
var db = nano.db.use('video_transcripts');

var authService;
try { 
  authService = new AuthorizationV1(extend({
    username: process.env.SPEECH_TO_TEXT_USERNAME,
    password: process.env.SPEECH_TO_TEXT_PASSWORD,
    url: 'https://stream.watsonplatform.net/speech-to-text/api'
  }, vcapServices.getCredentials('speech_to_text')));

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

app.get('/show_transcript', function(req, res) {
  res.render('show_transcript');
});

app.get('/tos', function(req, res) {
  res.render('tos');
});

app.post('/api/concepts', function(req, res, next) {

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

app.get('/save_transcript', function(request, response) {
  var name = request.query.transcript_name;
  var sentence = request.query.transcript_text;
  var sentence_num = request.query.sentence_num;

  var transcriptRecord = { 'name': name, 'sentence' : sentence, 'sentence_num' : parseInt(sentence_num), 'date': new Date() };
  db.insert(transcriptRecord, function(err, body, header) {
    if (!err) {       
      response.send('Successfully added one sentence to the DB');
    }
  });
});

app.get('/view_transcript', function(request, response) {
  var queryUrl = cloudant.url + "/video_transcripts/_design/transcript_design/_view/transcript-by-title";
  var sentences = [];
  if (request.query.title){
    queryUrl = queryUrl + "?key=" + request.query.title;
    console.log("title: ", request.query.title);
  }
  //console.log('url: ', queryUrl);
  
  var callback=function(data)
    {
    	//console.log(data);
      data.rows.forEach(function(doc) {
        //console.log("sentence: ", doc.value);
        sentences[doc.value[0]] = doc.value[1];		      
      });
      response.send(JSON.stringify(sentences));
    }

  https.get(queryUrl, (res) => {
      var body='';
        res.on('data', function(data){
            body+=data;
        });
        res.on('end', function(){
            var result=JSON.parse(body);
            callback(result);
        });
  });    

});


// error-handler application settings
require('./config/error-handler')(app);

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
app.listen(port);
// eslint-disable-next-line
console.log('listening at: ', port);
