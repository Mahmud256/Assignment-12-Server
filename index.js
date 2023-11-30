const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5cknjnc.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors(
  {
  origin: [ 
    'https://assignment-12-6f6d3.web.app'
  ],
  credentials: true
}
));
app.use(express.json());

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
    const agreementCollection = client.db("assignment-12").collection("agree");
    const userCollection = client.db("assignment-12").collection("users");
    const paymentCollection = client.db("assignment-12").collection("payments");
    const announcementCollection = client.db("assignment-12").collection("announcement");



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

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
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

    app.get('/users/member/:email', verifyToken, async (req, res) => {
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

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch('/users/member/:id', verifyToken, verifyAdmin, async (req, res) => {
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

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = await userCollection.findOne(query);

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      if (user.role === 'admin' || user.role === 'member') {
        // Update the role to 'normal' instead of deleting
        const updateDoc = {
          $set: {
            role: ''
          }
        };
        const updateResult = await userCollection.updateOne(query, updateDoc);
        return res.send(updateResult);
      } else {
        // Delete all data for normal users
        const deleteResult = await userCollection.deleteOne(query);
        return res.send(deleteResult);
      }
    });


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

    // app.delete('/books/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await bookCollection.deleteOne(query);
    //   res.send(result);
    // });


    // ------------------ agreement Releted Api ------------------
    app.get("/agree", async (req, res) => {
      const result = await agreementCollection.find().toArray();
      res.send(result);
    });

    app.post('/agree', async (req, res) => {
      const agreement = req.body;
      const result = await agreementCollection.insertOne(agreement);
      res.send(result);
    });

    app.patch('/agree/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'member',
          status: 'active'
        }
      };
      const result = await agreementCollection.updateOne(filter, updatedDoc);
    
      // Check if the agreement update was successful
      if (result.modifiedCount === 1) {
        // Find the corresponding user in userCollection using the email from agreementCollection
        const agreement = await agreementCollection.findOne(filter);
        const userEmail = agreement.email;
        
        // Update the userCollection with the new role
        const userFilter = { email: userEmail };
        const userUpdateDoc = {
          $set: {
            role: 'member'
          }
        };
        await userCollection.updateOne(userFilter, userUpdateDoc);
        
        res.send({ message: 'Agreement updated successfully, and user role updated.' });
      } else {
        res.status(404).send({ message: 'Agreement not found' });
      }
    });

    app.delete('/agree/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await agreementCollection.deleteOne(query);
      res.send(result);
    });

    // de
    // if (agree.status ==='active') {
    //   // Update the role to 'normal' instead of deleting
    //   const updateDoc = {
    //     $set: {
    //       status: 'pending'
    //     }
    //   };
    //   const updateResult = await agreementCollection.updateOne(query, updateDoc);
    //   return res.send(updateResult);
    // }
    


    // ------------------ announcement Releted Api ------------------
    app.post('/announcement', async (req, res) => {
      const announce = req.body;
      const result = await announcementCollection.insertOne(announce);
      res.send(result);
    });

    app.get("/announcement", async (req, res) => {
      const result = await announcementCollection.find().toArray();
      res.send(result);
    });





    //------------------ payment Releted Api ------------------
    app.post('/create-payment-intent', async (req, res) => {
      const { rent } = req.body;
      const amount = parseInt(rent * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the book
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.bookIds.map(id => new ObjectId(id))
        }
      };

      // const deleteResult = await bookCollection.deleteMany(query);

      res.send({ paymentResult });
    })


    // stats or analytics
    // app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
    //   const users = await userCollection.estimatedDocumentCount();
    //   const apartmentRooms = await apartmentCollection.estimatedDocumentCount();
    //   const books = await paymentCollection.estimatedDocumentCount();

    //   const result = await paymentCollection.aggregate([
    //     {
    //       $group: {
    //         _id: null,
    //         totalRevenue: {
    //           $sum: '$rent'
    //         }
    //       }
    //     }
    //   ]).toArray();

    //   const revenue = result.length > 0 ? result[0].totalRevenue : 0;
    //   const percentage = apartmentRooms/books;

    //   res.send({
    //     users,
    //     apartmentRooms,
    //     books,
    //     percentage,
    //     revenue
    //   })
    // })

    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await userCollection.estimatedDocumentCount();
        const totalRooms = await apartmentCollection.estimatedDocumentCount();
        const bookedRooms = await paymentCollection.estimatedDocumentCount();
    
        const availableRooms = totalRooms - bookedRooms;
    
        const availableRoomsPercentage = (availableRooms / totalRooms) * 100;
        const bookedRoomsPercentage = (bookedRooms / totalRooms) * 100;
    
        const result = await paymentCollection.aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: '$rent'
              }
            }
          }
        ]).toArray();
    
        const revenue = result.length > 0 ? result[0].totalRevenue : 0;
    
        res.send({
          users,
          totalRooms,
          availableRooms,
          bookedRooms,
          availableRoomsPercentage,
          bookedRoomsPercentage,
          revenue,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });
    

    // using aggregate pipeline
    // app.get('/booked-stats', verifyToken, verifyAdmin, async (req, res) => {
    //   const result = await paymentCollection.aggregate([
    //     {
    //       $unwind: '$apartmentRoomIds'
    //     },
    //     {
    //       $lookup: {
    //         from: 'apartment',
    //         localField: 'apartmentRoomIds',
    //         foreignField: '_id',
    //         as: 'apartmentRooms'
    //       }
    //     },
    //     {
    //       $unwind: '$apartmentRooms'
    //     },
    //     {
    //       $group: {
    //         _id: '$apartmentRooms.aprtno',
    //         quantity: { $sum: 1 },
    //         revenue: { $sum: '$apartmentRooms.rent' }
    //       }
    //     },
    //     {
    //       $project: {
    //         _id: 0,
    //         aprtno: '$_id',
    //         quantity: '$quantity',
    //         revenue: '$revenue'
    //       }
    //     }
    //   ]).toArray();

    //   res.send(result);

    // })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// middleware

app.get("/", (req, res) => {
  res.send("Assignment-12 is Running ...");
});

app.listen(port, () => {
  console.log(`Assignment-12 is Running on port ${port}`);
});