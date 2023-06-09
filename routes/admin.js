const express = require('express');
const adminRouter = express.Router();
const auth = require('../middlewares/auth_md')
const {Product} = require('../models/product');
const User = require('../models/user');

//Add a product
adminRouter.post('/admin/add-product',auth,async(req,res)=>{
    try{
        const{name,description,images,price,quantity,category}=req.body;
        let product = new Product({
            name,
            description,
            images,
            price,
            category,
            quantity
        });
        product = await product.save();
        res.json(product);
    }catch(e){
        res.status(500).json({error: e.message})
    }
});




//Get all Products
adminRouter.get('/admin/get-products',auth,async(req,res)=>{
    const products = await Product.find({});
    res.json(products);
});
//delete Product
adminRouter.post('/admin/delete-product',async(req,res)=>{
try{
    const {id}= req.body;
    let product = await Product.findByIdAndDelete(id);
    res.json(product);
}catch(e){
   res.status(500).json({error: e.message});
}
});
module.exports = adminRouter;

