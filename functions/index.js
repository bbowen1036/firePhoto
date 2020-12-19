const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');     // express routing
const app = express();

admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyDheOqIXT8-rujMDsuCUH-Y4JH0pvbSESE",
  authDomain: "firephoto-fd0d1.firebaseapp.com",
  databaseURL: "https://firephoto-fd0d1-default-rtdb.firebaseio.com",
  projectId: "firephoto-fd0d1",
  storageBucket: "firephoto-fd0d1.appspot.com",
  messagingSenderId: "1040969201912",
  appId: "1:1040969201912:web:9c2ddeb3739dfe195ce30d",
  measurementId: "G-S5RWSZX51F"
};

//Authentication
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// GET screams using EXPRESS  
// first arg is name of route, second is handler
app.get('/screams', (req, res) => {
  db
  .collection('screams')
  .orderBy('createdAt', 'desc')           // order posts by descending order
  .get()
  .then(data => {
    let screams = [];
    data.forEach(doc => {
      screams.push({
        screamId: doc.id,               //this comes from doc model
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt
      });
    });
    return res.json(screams);
  })
  .catch(err => console.error(err));
});

// Create Scream
app.post('/scream', (req, res) => {

  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  };

  db
    .collection('screams')
    .add(newScream)
    .then(doc => {
      return res.json({ message: `document ${doc.id} created successfully`})
    })
    .catch(err => {
      res.status(500).json({ error: 'something went wrong'});
      console.error(err)
    });
});


// Signup Route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  // TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if(doc.exists) {
        return res.status(400).json({ handle: 'this handle is already taken' })
      } else {
        return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken()                       // Authentication Token
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId
      }
      return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
      return res.status(201).json({ token }); 
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use'){
        return res.status(400).json({ error: 'Email is already in use'});
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
})
// 
exports.api = functions.https.onRequest(app);

