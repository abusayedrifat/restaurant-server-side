require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const corsOption = {
    origin: ['http://localhost:5000', 'http://localhost:5173'],
    credentials: true
}
const app = express()
const port = process.env.PORT || 5000

app.use(express.json())
app.use(cors(corsOption))
app.use(cookieParser())

app.get('/', (req, res) => {
    res.send('restuarant server running')
})


const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.faxnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//middleware

const verifyToken = async (req, res, next) => {
    const token = req.cookies ?.accessToken
    console.log('ur token is:', token);

    if (!token) {
        return res.status(401).send({
            message: 'forbidden'
        })
    }

    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: 'ur not authorized'
            })
        }
        console.log('value in the token', decoded);
        req.user = decoded
        next()
    })
}

async function run() {
    try {

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const foodItemsCollection = client.db('restuarantDB').collection('foodItems')
        const foodPurchasingCollection = client.db('restuarantDB').collection('foodPurchasingData')

        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.SECRET_TOKEN, {
                expiresIn: '1h'
            })

            res
            .cookie('accessToken', token, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax'
                })
                .send({
                    success: true
                })
        })

        app.post('/foodItems', async (req, res) => {
            const foodItem = req.body
            const result = await foodItemsCollection.insertOne(foodItem)
            res.send(result)
        })

        app.get('/foodItems', async (req, res) => {
            const result = await foodItemsCollection.find().toArray()
            res.send(result)
        })
        app.get('/foodItems/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await foodItemsCollection.findOne(query)
            res.send(result)
        })

        app.post('/purchasingSingleFoodByUser', async (req, res) => {
            const purchasingInfo = req.body
            const result = await foodPurchasingCollection.insertOne(purchasingInfo)
            res.send(result)
        })



        //user orders
        app.get('/purchasingSingleFoodByUser', verifyToken,async(req,res)=>{

            console.log(req.user.email);
            
            if (req.query.email !== req.user.email) {
                return res.status(401).send({message:'forbidden access'})
            }
            let query ={}
            if (req.query?.email) {
                query ={
                    email:req.query.email
                }
            }
            const result = await foodPurchasingCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/purchasingSingleFoodByUser/:id',async(req,res)=>{
            const deleteId = req.params.id
            const query = {
                _id: new ObjectId(deleteId) 
            }
            const result = await foodPurchasingCollection.deleteOne(query)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({
        //     ping: 1
        // });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log('port is running', port);

})