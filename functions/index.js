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
const { firestore } = require('firebase-admin');

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

  exports.onUserImageChange = functions
    .firestore.document('/users/{userId}')
    .onUpdate(change => {
      console.log(change.before.data())
      console.log(change.after.data())
      
      if(change.before.data().imageUrl !== change.after.data().imageUrl) {
        let batch = db.batch();
        return db.collection('screams').where('userHandle', '==', change.before.data().handle).get()
          .then(data => {
            data.forEach(doc => {
              const scream = db.doc(`/screams/${doc.id}`);
              batch.update(scream, { userImage: change.after.data().imageUrl});
            })
            return batch.commit();
          });
      } else return true;
    });

  // Trigger to all comments/likes associated with deleted scream
  exports.onScreamDelete = functions
    .firestore.document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
      const screamId = context.params.screamId;
      const batch = db.batch();
      
      return db
        .collection('comments')
        .where('screamId', '==', screamId)
        .get()
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/comments/${doc.id}`))
          })
          return db.collection('likes').where('screamId', '==', screamId).get();
        })
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/likes/${doc.id}`))
          })
          return db.collection('notifications').where('screamId', '==', screamId).get();
        })
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/notifications/${doc.id}`))
          })
          return batch.commit();
        })
        .catch(err => console.error(err));
    })

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

