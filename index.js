const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config();
const cors = require("cors");
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

const appartmentCollection = client.db("assignment-12").collection("apartment");

app.get("/apartment", async (req, res) => {
    const result = await appartmentCollection.find().toArray();
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