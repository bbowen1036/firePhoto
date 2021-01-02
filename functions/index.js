const functions = require('firebase-functions');
const express = require('express');     // express routing
const app = express();
const FBAuth = require('./util/fbAuth');   

const { db } = require('./util/admin');

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
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
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
app.get('/user/:handle', getUserDetails);             // public route, get user details
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        } else {
          return
        }
      })
      .catch((err) => {
        console.error(err);
        return
      });
  });

exports.deleteNotificationOnUnLike = functions
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        } else return 
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
//   .onCreate((snapshot) => {
//     db.doc(`/screams/${snapshot.data().screamId}`).get()
//       .then(doc => {
//         if(doc.exists){
//           return db.doc(`/notifications/${snapshot.id}`).set({
//             createdAt: new Date().toISOString(),
//             recipient: doc.data().userHandle,
//             sender: snapshot.data().userHandle,
//             type: 'like',
//             read: false,
//             screamId: doc.id
//           })
//         }
//       })
//       .then(() => {
//         return;
//       })
//       .catch(err => {
//         console.error(err);
//         return
//       })
//   });

// exports.createNotificationOnComment = functions
//   .firestore.document('comments/{id}')
//   .onCreate((snapshot) => {
//     db.doc(`/screams/${snapshot.data().screamId}`)
//       .get()
//       .then(doc => {
//         if(doc.exists){
//           return db.doc(`/notifications/${snapshot.id}`).set({
//             createdAt: new Date().toISOString(),
//             recipient: doc.data().userHandle,
//             sender: snapshot.data().userHandle,
//             type: 'comment',
//             read: false,
//             screamId: doc.id
//           })
//         }
//       })
//       .then(() => {
//         return;
//       })
//       .catch(err => {
//         console.error(err);
//         return
//       })
// });

// exports.deleteNotificationOnUnlike = functions
// .firestore.document('comments/{id}')
// .onDelete(snapshot => {
//   db.doc(`/notifications/${snapshot.id}`)
//     .delete()
//     .then(() => {
//       return;
//     })
//     .catch(err => {
//       console.error(err);
//       return;
//     })
// })

