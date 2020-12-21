const functions = require('firebase-functions');

const express = require('express');     // express routing
const app = express();

const FBAuth = require('./util/fbAuth');   

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { signup, login, uploadImage } = require('./handlers/users');

// ROUTES
// first arg is name of route, second is handler
app.get('/screams', getAllScreams);
// Create Scream 
app.post('/scream', FBAuth, postOneScream);

// USER Route
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)

// 
exports.api = functions.https.onRequest(app);

