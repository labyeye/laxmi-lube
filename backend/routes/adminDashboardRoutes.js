const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Collection = require('../models/Collection');
const User = require('../models/User');
const Retailer = require('../models/Retailer');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const moment = require('moment');

router.get('/dashboard', protect, adminOnly, async (req, res) => {
  try {
    // Use UTC day boundaries so they align with collectedOn dates stored as UTC midnight
    const startOfDay = moment.utc().startOf('day').toDate();
    const endOfDay = moment.utc().endOf('day').toDate();

    // Get unpaid or partially paid bills (dueDate removed from model)
    const billsDueToday = await Bill.find({
      status: { $in: ['Unpaid', 'Partially Paid'] }
    });

    const collectionsToday = await Collection.find({ 
      collectedOn: { $gte: startOfDay, $lte: endOfDay } 
    }).populate('bill');

    let totalBillAmount = 0;
    let totalPaidAmount = 0;
    let totalRemainingAmount = 0;

    collectionsToday.forEach((collection) => {
      totalPaidAmount += collection.amountCollected;
    });

    billsDueToday.forEach((bill) => {
      totalBillAmount += bill.amount;
      totalRemainingAmount += bill.dueAmount;
    });

    const totalStaff = await User.countDocuments({ role: 'staff' });

    // Counts for dashboard summary
    const totalBills = await Bill.countDocuments({ deleted: { $ne: true } });
    const pendingBills = await Bill.countDocuments({
      status: { $in: ['Unpaid', 'Partially Paid'] },
      deleted: { $ne: true }
    });

    const totalRetailers = await Retailer.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Get delivery vehicle counts
    const deliveredVehicles = await Delivery.countDocuments({ 
      deliveryStatus: 'Delivered' 
    });
    const pendingVehicles = await Delivery.countDocuments({ 
      deliveryStatus: { $in: ['Pending', 'In Transit'] } 
    });

    const recentCollections = await Collection.find()
      .sort({ collectedOn: -1 })
      .limit(5)
      .populate('bill collectedBy');

    // Get collection trends
    const collectionTrends = {
      daily: await getDailyCollectionTrends(),
      weekly: await getWeeklyCollectionTrends(),
      monthly: await getMonthlyCollectionTrends()
    };

    // Get bill trends
    const billTrends = {
      daily: await getDailyBillTrends(),
      weekly: await getWeeklyBillTrends(),
      monthly: await getMonthlyBillTrends()
    };

    // Get DSR-wise collection data
    const dsrCollections = await getDSRCollections();
    const outstandingDSRs = await getOutstandingDSRs();

    res.json({
      success: true,
      totalBillAmount,
      totalPaidAmount,
      totalRemainingAmount,
      // counts
      totalBills,
      pendingBills,
      totalRetailers,
      totalProducts,
      totalStaff,
      deliveredVehicles,
      pendingVehicles,
      recentCollections,
      collectionTrends,
      billTrends,
      dsrCollections,
      outstandingDSRs
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard data',
      error: err.message 
    });
  }
});

// Helper functions for collection trends
async function getDailyCollectionTrends() {
  const hours = [8, 10, 12, 14, 16, 18]; // 8AM to 6PM in 2-hour intervals
  // Use UTC startOf day to match how collectedOn is stored
  const todayBase = moment.utc().startOf('day');
  const labels = [];
  const data = [];

  for (const hour of hours) {
    const start = todayBase.clone().add(hour, 'hours');
    const end = start.clone().add(2, 'hours');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: start.toDate(),
        $lt: end.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(start.format('hA'));
    data.push(total);
  }

  return { labels, data };
}

async function getWeeklyCollectionTrends() {
  const labels = [];
  const data = [];
  const days = 7;

  // Use UTC week start to match collectedOn stored as UTC midnight
  const weekStart = moment.utc().startOf('week');
  
  for (let i = 0; i < days; i++) {
    const dayBase = weekStart.clone().add(i, 'days');
    // Clone before calling startOf/endOf to avoid mutating dayBase
    const start = dayBase.clone().startOf('day');
    const end = dayBase.clone().endOf('day');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(dayBase.format('ddd'));
    data.push(total);
  }

  return { labels, data };
}

async function getMonthlyCollectionTrends() {
  const labels = [];
  const data = [];
  const weeks = 4;

  for (let i = weeks - 1; i >= 0; i--) {
    // Clone before startOf/endOf to avoid mutation
    const weekStart = moment.utc().subtract(i, 'weeks').startOf('week');
    const weekEnd = weekStart.clone().endOf('week');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: weekStart.toDate(),
        $lte: weekEnd.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(`Week ${weeks - i}`);
    data.push(total);
  }

  return { labels, data };
}

// Get DSR-wise collection data
async function getDSRCollections() {
  const dsrs = await User.find({ role: 'staff' }).select('name');
  
  const result = await Collection.aggregate([
    {
      $match: {
        collectedOn: {
          $gte: moment().startOf('month').toDate(),
          $lte: moment().endOf('month').toDate()
        }
      }
    },
    {
      $group: {
        _id: '$collectedBy',
        totalCollection: { $sum: '$amountCollected' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'dsr'
      }
    },
    {
      $unwind: '$dsr'
    },
    {
      $project: {
        dsrName: '$dsr.name',
        totalCollection: 1,
        count: 1
      }
    },
    {
      $sort: { totalCollection: -1 }
    }
  ]);

  return result;
}

// Get outstanding DSRs (top performers)
async function getOutstandingDSRs() {
  const result = await Collection.aggregate([
    {
      $group: {
        _id: '$collectedBy',
        totalCollection: { $sum: '$amountCollected' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'dsr'
      }
    },
    {
      $unwind: '$dsr'
    },
    {
      $project: {
        dsrName: '$dsr.name',
        totalCollection: 1,
        count: 1
      }
    },
    {
      $sort: { totalCollection: -1 }
    },
    {
      $limit: 5
    }
  ]);

  return result;
}

// Helper functions for bill trends
async function getDailyBillTrends() {
  const hours = [8, 10, 12, 14, 16, 18]; // 8AM to 6PM in 2-hour intervals
  const todayBase = moment.utc().startOf('day');
  const labels = [];
  const data = [];

  for (const hour of hours) {
    const start = todayBase.clone().add(hour, 'hours');
    const end = start.clone().add(2, 'hours');
    
    const bills = await Bill.find({
      createdAt: {
        $gte: start.toDate(),
        $lt: end.toDate()
      },
      deleted: { $ne: true }
    });

    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    
    labels.push(start.format('hA'));
    data.push(total);
  }

  return { labels, data };
}

async function getWeeklyBillTrends() {
  const labels = [];
  const data = [];
  const days = 7;

  // Use UTC week start
  const weekStart = moment.utc().startOf('week');
  
  for (let i = 0; i < days; i++) {
    const dayBase = weekStart.clone().add(i, 'days');
    const start = dayBase.clone().startOf('day');
    const end = dayBase.clone().endOf('day');
    
    const bills = await Bill.find({
      createdAt: {
        $gte: start.toDate(),
        $lte: end.toDate()
      },
      deleted: { $ne: true }
    });

    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    
    labels.push(dayBase.format('ddd'));
    data.push(total);
  }

  return { labels, data };
}

async function getMonthlyBillTrends() {
  const labels = [];
  const data = [];
  const weeks = 4;

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = moment.utc().subtract(i, 'weeks').startOf('week');
    const weekEnd = weekStart.clone().endOf('week');
    
    const bills = await Bill.find({
      createdAt: {
        $gte: weekStart.toDate(),
        $lte: weekEnd.toDate()
      },
      deleted: { $ne: true }
    });

    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    
    labels.push(`Week ${weeks - i}`);
    data.push(total);
  }

  return { labels, data };
}

module.exports = router;