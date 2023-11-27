const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const app = express();

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5cknjnc.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const apartmentCollection = client.db("assignment-12").collection("apartment");
    const bookCollection = client.db("assignment-12").collection("books");
    const userCollection = client.db("assignment-12").collection("users");



    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // use verify member after verifyToken
    const verifyMember = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isMember = user?.role === 'member';
      if (!isMember) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }



    //------------------ User Releted Api ------------------

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email',verifyToken, async (req, res) => {
      const email = req.params.email;

       if (email !== req.decoded.email) {
         return res.status(403).send({ message: 'forbidden access' })
       }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.get('/users/member/:email',verifyToken, async (req, res) => {
      const email = req.params.email;

       if (email !== req.decoded.email) {
         return res.status(403).send({ message: 'forbidden access' })
       }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let member = false;
      if (user) {
        member = user?.role === 'member';
      }
      res.send({ member });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.patch('/users/member/:id',verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'member'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    //------------------ apartment Releted Api ------------------
    app.get("/apartment", async (req, res) => {
      const result = await apartmentCollection.find().toArray();
      res.send(result);
    });

    app.get('/apartment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await apartmentCollection.findOne(query);
      res.send(result);
    })

    app.post('/apartment', async (req, res) => {
      const item = req.body;
      const result = await apartmentCollection.insertOne(item);
      res.send(result);
    });

    app.patch('/apartment/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }

      const result = await apartmentCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.delete('/apartment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await apartmentCollection.deleteOne(query);
      res.send(result);
    })



    //------------------ book Releted Api ------------------
    app.get('/books', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/books', async (req, res) => {
      const bookRoom = req.body;
      const result = await bookCollection.insertOne(bookRoom);
      res.send(result);
    });

    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Assignment-12 is Running ...");
});

app.listen(port, () => {
  console.log(`Assignment-12 is Running on port ${port}`);
});