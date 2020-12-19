const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const express = require('express');
const app = express();


// Get screams
// exports.getScreams = functions.https.onRequest((req, res) => {
//   admin.firestore()
//     .collection('screams')
//     .get()
//     .then(data => {
//       let screams = [];
//       data.forEach(doc => {
//         screams.push(doc.data());
//       });
//       return res.json(screams);
//     })
//     .catch(err => console.error(err));
// }); 


// GET screams using EXPRESS  
// first arg is name of route, second is handler
app.get('/screams', (req, res) => {
  admin.firestore()
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

  admin.firestore()
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

// 
exports.api = functions.https.onRequest(app);