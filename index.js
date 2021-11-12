const express = require('express');
const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.91aij.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const verifyUser = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({
      status: 'error',
      message: 'You are not authorized to access this resource',
    });
  }
  const token = authorization.split(' ')[1];
  const decoded = await admin.auth().verifyIdToken(token);
  if (decoded) {
    req.decodedEmail = decoded.email;
    next();
  } else {
    return res.status(401).json({
      status: 'error',
      message: 'You are not authorized to access this resource',
    });
  }
};

// Run Function
const run = async () => {
  try {
    await client.connect();
    const database = client.db('CarShop');
    const productCollection = database.collection('products');
    const orderCollection = database.collection('Orders');
    const userCollection = database.collection('Users');
    const reviewCollection = database.collection('Reviews');

    // ===================== products collection =====================
    // Get all the Products
    app.get('/api/products', async (req, res) => {
      const { limit } = req.query;
      if (limit) {
        const products = await productCollection
          .find()
          .limit(parseInt(limit))
          .toArray();

        res.status(200).send(products);
      } else {
        const products = await productCollection.find({}).toArray();
        res.status(200).json(products);
      }
    });

    // get a single product
    app.get('/api/products/:id', async (req, res) => {
      const { id } = req.params;
      const product = await productCollection.findOne({ _id: ObjectId(id) });
      if (product) {
        res.status(200).send(product);
      } else {
        res.status(404).send({ message: 'Product not found' });
      }
    });

    // Add a new product
    app.post('/api/products', verifyUser, async (req, res) => {
      const { name, price, description, image } = req.body;

      try {
        const result = await productCollection.insertOne({
          name,
          price,
          description,
          image,
        });
        return res.status(201).json(result);
      } catch (error) {
        return res.status(500).json(error);
      }
    });
    // ===================== products end =====================

    // ===================== orders collection =====================
    // Get all the Orders
    app.get('/api/orders', async (req, res) => {
      const { limit } = req.query;
      if (limit) {
        const orders = await orderCollection
          .find()
          .limit(parseInt(limit))
          .toArray();
        res.status(200).send(orders);
      } else {
        const orders = await orderCollection.find({}).toArray();
        res.send(orders);
      }
    });

    // get a single order
    app.get('/api/orders/:id', async (req, res) => {
      const { id } = req.params;
      const order = await orderCollection.findOne({ _id: ObjectId(id) });
      if (order) {
        res.status(200).send(order);
      } else {
        res.status(404).send({ message: 'Order not found' });
      }
    });

    // Add a new order
    app.post('/api/orders', async (req, res) => {
      const { name, price, description, imageUrl } = req.body;
      const result = await orderCollection.insertOne({
        name,
        price,
        description,
        imageUrl,
      });
      res.status(201).json(result);
    });
    // ===================== orders end =====================

    // ===================== users collection =====================
    // create an user account
    app.post('/api/users', async (req, res) => {
      const { name, email } = req.body;

      const result = await userCollection.insertOne({
        name,
        email,
      });

      res.status(201).json(result);
    });

    // make an user role admin
    app.put('/api/users/:id', async (req, res) => {
      const { id } = req.params;
      const result = await userCollection.findOneAndUpdate(
        { _id: ObjectId(id) },
        { $set: { role: 'admin' } }
      );

      if (user) {
        res.status(200).json(result);
      } else {
        res.status(404).send({ message: 'User not found' });
      }
    });
    // ===================== users end =====================

    // ===================== reviews collection =====================
    // Get all the Reviews
    app.get('/api/reviews', async (req, res) => {
      const { limit } = req.query;
      if (limit) {
        const reviews = await reviewCollection
          .find()
          .limit(parseInt(limit))
          .toArray();
        res.status(200).send(reviews);
      } else {
        const reviews = await reviewCollection.find({}).toArray();
        res.status(200).json(reviews);
      }
    });

    // create an review with rating and comment
    app.post('/api/reviews', async (req, res) => {
      const { rating, comment } = req.body;
      const result = await reviewCollection.insertOne({
        rating,
        comment,
      });
      res.status(201).json(result);
    });

    // ===================== reviews end =====================
  } finally {
    // await client.close()
  }
};
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('All Right');
});

app.listen(port, () => {
  console.log('Listening To Port ', port);
});
