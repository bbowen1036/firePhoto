 const { db } = require('../util/admin')

 exports.getAllScreams = (req, res) => {
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
}

exports.postOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
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
}