const functions = require('firebase-functions');
const express = require('express');     // express routing
const app = express();
const FBAuth = require('./util/fbAuth');   

const { 
  getAllScreams, 
  postOneScream, 
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream
} = require('./handlers/screams');
const { 
  signup, 
  login, 
  uploadImage, 
  addUserDetails, 
  getAuthenticatedUser 
} = require('./handlers/users');

// ROUTES
// first arg is name of route, second is handler
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream)     // Delete scream
app.get('/scream/:screamId/like', FBAuth, likeScream);      // like post
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);  // unlike post   
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);  // Comment scream

// USER Route
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);

