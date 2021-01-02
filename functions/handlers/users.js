const { admin, db } = require('../util/admin');

const config = require('../util/config')

const firebase = require('firebase');
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');
const { user } = require('firebase-functions/lib/providers/auth');

// Sign up new user
exports.signup =  (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

 const { valid, errors } = validateSignupData(newUser);

 if(!valid) {
   return res.status(400).json(errors)
 }

 const noImg = 'no-img.png';
 
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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`, 
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
        return res.status(500).json({ general: 'Something went wrong, please try again' });
      }
    });
};

// Log in existing user
// kept minimal to reduce response time
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { valid, errors } = validateLoginData(user);

  if(!valid) {
    return res.status(400).json(errors)
  }

  // No errors, so now we can sign in user
  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });                   // only returns token. will rediect 
    })
    .catch(err => {
      console.error(err);
      // auth/wrong password
      // auth/user-not-found
      return res
        .status(403)
        .json({ general: 'invalid credentials, please try again'});
    })
};

// Add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added successfully' })
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
};

// Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
      if(doc.exists){
        userData.user = doc.data();
        return db
          .collection('screams')
          .where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        return res.status(404).json({ error: 'User not found' })
      }
    })
    .then(data => {
      userData.screams = [];
      data.forEach(doc => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.id
        })
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
}

// Get OWN user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};          // we add data to it as we go thru promise chain  
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => { 
      if(doc.exists){                      // good to have checks like this so app doesnt crash
        userData.credentials = doc.data();                 // creates the KEY  'credentials'
        return db.collection('likes').where('userHandle', '==', req.user.handle).get()
      } else {
        return
      }
    })
    .then(data => {
      userData.likes = [];                            // creates the KEY  'likes'
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db
        .collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          screamId: doc.data().screamId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        })
      })
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    })
};

// Upload a profile picture for user 
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');    // default node package
  const os = require('os');        // default node package
  const fs = require('fs');        // default node package

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if(mimetype !== 'image/jpeg' && mimetype !== 'image/png') {                   // make sure file uploaded is an IMAGE
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    const imageExtension = filename.split('.')[filename.split('.').length - 1];   // split file extension
    imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  })

  busboy.on('finish', () => {
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
    .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return db.doc(`/users/${req.user.handle}`).update({ imageUrl })
    })
    .then(() => {
      return res.json({ message: 'Image uploaded successfully '})
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    })
  })
  busboy.end(req.rawBody)
};

// Batch write = firebaase function that will update multiple documents
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch.commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
}