const express = require('express');
const productRouter = express.Router();
const bodyParser = require('body-parser');

const auth = require('../middlewares/auth_md');
const {Product} = require('../models/product');
const User = require('../models/user');
const Payment  = require('../models/paiement');

const multer = require('multer')
const path = require('path')

const app = express()
app.use(bodyParser.json());


const {COINBASE_API_KEY,COINBASE_WEBHOOK_SECRET, DOMAIN} = require("../config/config.js")

console.log(COINBASE_API_KEY,COINBASE_WEBHOOK_SECRET,DOMAIN)


const { Client , resources ,  Webhook } = require('coinbase-commerce-node')  
   
const { Charge } = resources;
Client.init(COINBASE_API_KEY);



const storage = multer.diskStorage({
    destination: (req,file, cb) => {
      cb( null , './public')
    },
    filename:  (req, file ,cb) => {
          
          cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
  })
const upload = multer({storage: storage}) 
module.exports = productRouter;




//get category
//api/products?category=mobiles
//{api/products:category=mobiles
//console.log(req.params.category)} 
productRouter.get('/api/products',async(req,res)=>{
try{
    console.log(req.query.category);
    const product = await Product.find({category: req.query.category});
    res.json(product);
}catch(e){
    res.status(500).json({error: e.message});
}
});

productRouter.get('/api/products/search/:name',async(req,res)=>{
    try{
        const searchedproducts = await Product.find({name:{$regex:req.params.name,$options:"i"}});
        res.json(searchedproducts);
    }catch(e){
        res.status(500).json({error: e.message});
    }
});

productRouter.post('/api/add-product',async(req,res)=>{
    

    const produit = await Product.create({
        name:req.body.name,
        description:req.body.description,
        quantity : req.body.quantity,
        category : req.body.category,
        price: req.body.price,
        images : req.body.images
      })
      produit.save;
      res.send(produit)

})

//rating products
productRouter.post('/api/rate-product',auth,async(req,res)=>{
    try{
        const{id,rating}=req.body;
    let product =await Product.findById(id);
    for(let i=0; i<product.ratings.length;i++){
        if(product.ratings[i].userId==req.user){
            product.ratings.splice(i, 1);
            break;
        }
    }
    const ratingSchema = {
        userId:req.user,
        rating,
    }
    product.ratings.push(ratingSchema);
    product = await product.save();
    res.json(product);
    }catch(e){
        res.status(500).json({error: e.message});
    }
});

//get the most rated product

productRouter.get('/api/deal-of-day',auth,async(req,res)=>{
    try{
      const products = await Product.find({});
      let maxRatingProduct;
      let maxRating = 0;
      for (let i = 0; i < products.length; i++) {
        let product = products[i];
        let ratingSum = 0;
        for(let j = 0; j < product.ratings.length; j++) {
          ratingSum += product.ratings[j].rating;
        }
        if (ratingSum > maxRating) {
          maxRating = ratingSum;
          maxRatingProduct = product;
        }
      }
      res.json(maxRatingProduct); 
    } catch(e){
      res.status(500).json({error: e.message});
    }
  });
  

  
  /*productRouter.get('/api/cart-subtotal', auth, async (req, res) => {
    try {
      let sum = 0;
      const user = await User.findById(req.user);
      if (!user || !user.cart) {
        return res.json({ subtotal: sum });
      }
      user.cart.forEach((item) => {
        sum += item.quantity * item.product.price;
      });
      res.json({ subtotal: sum });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });*/
  

productRouter.get('/api/cart-subtotal', auth, async (req, res) => {
    try {
        let sum = 0;
        const user = await User.findById(req.user);
        user.cart.forEach((item) => {
            sum += item.quantity * item.product.price;
        });

        // Créer une nouvelle charge Coinbase pour le montant total
        const chargeData = {
            name: 'Achat sur notre site',
            description: 'Achat de produits dans notre boutique en ligne',
            local_price: {
                amount: sum.toFixed(2),
                currency: 'USD'
            },
            pricing_type: 'fixed_price',
            metadata: {
                cart: JSON.stringify(user.cart),
                user: user
            },
            redirect_url: `${DOMAIN}/success-payment`,
            cancel_url: `${DOMAIN}/pasdepaiement/${req.params.user}`,
        };

        const charge = await Charge.create(chargeData);

        // Récupérer le chargeId à partir de l'URL
        const hostedUrl = charge.hosted_url;
        const chargeId = hostedUrl.split('/').pop();
        console.log('Charge ID:', chargeId);
        const paymentData = {
          user: user._id,
          chargeId: chargeId
        };
        const createdPayment = await Payment.create(paymentData);

        // Retourner l'URL hébergée de la charge au client
        res.json({ hostedUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

productRouter.post('/verify_payment', async (req, res) => {
  const rawBody = req.body;
  const signature = req.headers["x-cc-webhook-signature"];
  const webhookSecret = COINBASE_WEBHOOK_SECRET;

  let event;

  try {
    event = Webhook.verifyEventBody(JSON.stringify(rawBody), signature, webhookSecret);
    if (event.type === "charge:created") {
      const payment = await Payment.findOneAndUpdate(
        { chargeId: event.data.code },
        { status: 'success' },
        { new: true }
      );
      console.log(`Payment ${payment._id} updated to ${payment.status}`);
    }
    res.send(`success ${event.id}`);
  } catch (error) {
    console.log(error);
    res.status(400).send("failure");
  }
});

productRouter.get('/success_payment', auth, async (req, res) => {
  try{
    const paymentId = req.body.paymentId;
    const chargeId = req.body.chargeId;
    const user = await User.findById(req.user);

    // Vérifier que le paiement existe et qu'il appartient à l'utilisateur
    const payment = await Payment.findOne({_id: paymentId, user: user._id});
    if (!payment) {
        return res.status(404).json({error: 'Paiement introuvable'});
    }

    // Vérifier que le paiement n'a pas déjà été traité
    if (payment.isPaid) {
        return res.status(400).json({error: 'Ce paiement a déjà été traité'});
    }

    // Récupérer la charge Coinbase correspondante
    const charge = await Charge.findById(chargeId);
    if (!charge) {
        return res.status(404).json({error: 'Charge introuvable'});
    }

    // Marquer le paiement comme traité
    payment.isPaid = true;
    await payment.save();

    // Mettre à jour le panier de l'utilisateur
    const cartItems = JSON.parse(charge.metadata.cart);
    cartItems.forEach(async (cartItem) => {
        const product = await Product.findById(cartItem.product._id);
        if (product) {
            product.inventory -= cartItem.quantity;
            await product.save();
        }
    });

    res.json({success:true});
  }
  catch(e){
    res.status(500).json({error: e.message});
  }
});






