const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');

router.get('/', async (req, res) => {
  const collections = await Collection.find().populate('bill collectedBy');
  res.json(collections);
});

router.post('/', async (req, res) => {
  const collection = new Collection(req.body);
  await collection.save();
  res.json(collection);
});

module.exports = router; 
