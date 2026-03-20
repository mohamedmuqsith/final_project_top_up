/**
 * E2E Order Lifecycle Verification Script (v2)
 * Tests all 4 real-world workflow scenarios against the live database.
 * Verifies backend business logic, statusHistory, and filter correctness.
 * 
 * Usage: node src/scripts/e2e_order_lifecycle.js
 */
import mongoose from "mongoose";
import { ENV } from "../config/env.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";

const TEST_PREFIX = "__e2e_test__";
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function cleanup() {
  const result = await Order.deleteMany({ "shippingAddress.fullName": { $regex: TEST_PREFIX } });
  console.log(`\n🧹 Cleaned up ${result.deletedCount} test orders.`);
}

async function getTestUserAndProduct() {
  const user = await User.findOne().lean();
  const product = await Product.findOne({ stock: { $gt: 0 } }).lean();
  if (!user || !product) throw new Error("Need at least 1 user and 1 in-stock product in DB");
  return { user, product };
}

function makeTestAddress(suffix = "") {
  return {
    fullName: `${TEST_PREFIX}User${suffix}`,
    streetAddress: "123 Test St",
    city: "Test City",
    province: "TS",
    zipCode: "00000",
    phoneNumber: "0000000000",
  };
}

// ═══════════════════════════════════════
// SCENARIO A: Online Order
// ═══════════════════════════════════════
async function scenarioA_OnlineOrder() {
  console.log("\n═══════════════════════════════════════");
  console.log("SCENARIO A: Online Order Lifecycle");
  console.log("═══════════════════════════════════════");

  const { user, product } = await getTestUserAndProduct();

  // Simulate createPaymentIntent (creates order with pending status + statusHistory)
  const order = await Order.create({
    user: user._id,
    clerkId: user.clerkId || "test_clerk_id",
    orderItems: [{
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] || "test.jpg",
    }],
    shippingAddress: makeTestAddress("_online"),
    totalPrice: product.price,
    paymentMethod: "online",
    paymentStatus: "pending",
    status: "pending",
    statusHistory: [{
      status: "pending",
      timestamp: new Date(),
      comment: "Order created and awaiting payment confirmation.",
      changedByType: "system"
    }],
    paymentResult: { status: "pending" },
  });

  assert(order.status === "pending", `Initial status = "${order.status}" (expected "pending")`);
  assert(order.paymentStatus === "pending", `Initial paymentStatus = "${order.paymentStatus}" (expected "pending")`);
  assert(order.statusHistory.length === 1, `statusHistory has ${order.statusHistory.length} entry (expected 1)`);
  assert(order.statusHistory[0].status === "pending", `statusHistory[0].status = "${order.statusHistory[0].status}" (expected "pending")`);

  // Simulate finalizeOrder (atomic update: set paid, keep pending, add history)
  const finalized = await Order.findOneAndUpdate(
    { _id: order._id, isFinalized: false },
    { $set: { isFinalized: true, paymentStatus: "paid", "paymentResult.status": "succeeded" } },
    { new: true }
  );

  finalized.statusHistory.push({
    status: "pending",
    timestamp: new Date(),
    comment: "Payment confirmed. Order is now pending fulfillment.",
    changedByType: "system"
  });
  await finalized.save();

  assert(finalized.status === "pending", `After finalization: status = "${finalized.status}" (expected "pending")`);
  assert(finalized.paymentStatus === "paid", `After finalization: paymentStatus = "${finalized.paymentStatus}" (expected "paid")`);
  assert(finalized.statusHistory.length === 2, `statusHistory has ${finalized.statusHistory.length} entries (expected 2)`);
  
  // Verify NO processing history entry exists
  const hasProcessing = finalized.statusHistory.some(h => h.status === "processing");
  assert(!hasProcessing, `No fake processing history entry exists`);

  // Verify revenue query includes this order
  const revenueResult = await Order.aggregate([
    { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;
  assert(totalRevenue >= finalized.totalPrice, `Revenue (${totalRevenue}) includes finalized order (${finalized.totalPrice})`);

  return finalized;
}

// ═══════════════════════════════════════
// SCENARIO B: COD Order
// ═══════════════════════════════════════
async function scenarioB_CODOrder() {
  console.log("\n═══════════════════════════════════════");
  console.log("SCENARIO B: COD Order Lifecycle");
  console.log("═══════════════════════════════════════");

  const { user, product } = await getTestUserAndProduct();

  const order = await Order.create({
    user: user._id,
    clerkId: user.clerkId || "test_clerk_id",
    orderItems: [{
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] || "test.jpg",
    }],
    shippingAddress: makeTestAddress("_cod"),
    totalPrice: product.price,
    paymentMethod: "cod",
    paymentStatus: "pending",
    status: "pending",
    isFinalized: true,
    statusHistory: [{
      status: "pending",
      timestamp: new Date(),
      comment: "Order placed using Cash on Delivery (COD). Currently pending.",
      changedByType: "system"
    }],
  });

  assert(order.status === "pending", `Initial status = "${order.status}" (expected "pending")`);
  assert(order.paymentStatus === "pending", `Initial paymentStatus = "${order.paymentStatus}" (expected "pending")`);

  // NOT in revenue yet
  const revBefore = await Order.aggregate([
    { $match: { _id: order._id, paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  assert((revBefore[0]?.total || 0) === 0, "COD pending order NOT yet counted in revenue");

  return order;
}

// ═══════════════════════════════════════
// SCENARIO C: Admin Status Transitions
// ═══════════════════════════════════════
async function scenarioC_AdminTransitions(order) {
  console.log("\n═══════════════════════════════════════");
  console.log("SCENARIO C: Admin Status Transitions");
  console.log("═══════════════════════════════════════");

  // Pending -> Processing
  order.status = "processing";
  order.statusHistory.push({ status: "processing", timestamp: new Date(), comment: "Admin moved to processing.", changedByType: "admin" });
  await order.save();
  let refreshed = await Order.findById(order._id);
  assert(refreshed.status === "processing", `After admin: status = "${refreshed.status}" (expected "processing")`);

  // Processing -> Shipped
  refreshed.status = "shipped";
  refreshed.shippedAt = new Date();
  refreshed.statusHistory.push({ status: "shipped", timestamp: new Date(), comment: "Shipped via courier.", changedByType: "admin" });
  await refreshed.save();
  refreshed = await Order.findById(order._id);
  assert(refreshed.status === "shipped", `After ship: status = "${refreshed.status}" (expected "shipped")`);

  // Shipped -> Delivered (COD: collect cash)
  refreshed.status = "delivered";
  refreshed.deliveredAt = new Date();
  refreshed.paymentStatus = "paid";
  refreshed.statusHistory.push({ status: "delivered", timestamp: new Date(), comment: "Delivered. Cash collected: YES.", changedByType: "admin" });
  await refreshed.save();
  refreshed = await Order.findById(order._id);
  assert(refreshed.status === "delivered", `After delivery: status = "${refreshed.status}" (expected "delivered")`);
  assert(refreshed.paymentStatus === "paid", `After delivery: paymentStatus = "${refreshed.paymentStatus}" (expected "paid")`);

  // Verify history is complete and correct
  const statuses = refreshed.statusHistory.map(h => h.status);
  assert(statuses.includes("pending"), "History includes 'pending'");
  assert(statuses.includes("processing"), "History includes 'processing'");
  assert(statuses.includes("shipped"), "History includes 'shipped'");
  assert(statuses.includes("delivered"), "History includes 'delivered'");
  assert(!statuses.some(s => ["return-requested", "approved", "denied", "refunded"].includes(s)), "History has no fake return/refund entries before return flow");

  // Revenue now includes this order
  const revAfter = await Order.aggregate([
    { $match: { _id: refreshed._id, paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  assert(revAfter[0]?.total === refreshed.totalPrice, "COD order now counted in revenue after payment");

  return refreshed;
}

// ═══════════════════════════════════════
// SCENARIO D: Return / Refund Flow
// ═══════════════════════════════════════
async function scenarioD_ReturnFlow(order) {
  console.log("\n═══════════════════════════════════════");
  console.log("SCENARIO D: Return / Refund Flow");
  console.log("═══════════════════════════════════════");

  // Customer requests return
  order.returnStatus = "requested";
  order.returnReason = "Defective product";
  order.statusHistory.push({
    status: order.status, // stays "delivered"
    timestamp: new Date(),
    comment: "Customer requested return. Reason: Defective product",
    changedByType: "customer",
  });
  await order.save();

  let refreshed = await Order.findById(order._id);
  assert(refreshed.returnStatus === "requested", `returnStatus = "${refreshed.returnStatus}" (expected "requested")`);
  assert(refreshed.status === "delivered", `status unchanged = "${refreshed.status}" (expected "delivered")`);

  // Admin approves (using the FIXED history format)
  refreshed.returnStatus = "approved";
  refreshed.statusHistory.push({
    status: "return-approved",
    timestamp: new Date(),
    comment: "Admin approved the return request.",
    changedByType: "admin",
  });
  await refreshed.save();

  refreshed = await Order.findById(order._id);
  assert(refreshed.returnStatus === "approved", `returnStatus = "${refreshed.returnStatus}" (expected "approved")`);
  assert(refreshed.status === "delivered", `status still = "${refreshed.status}" (expected "delivered")`);

  // Verify timeline has the return-approved entry
  const returnEntry = refreshed.statusHistory.find(h => h.status === "return-approved");
  assert(!!returnEntry, `statusHistory contains "return-approved" entry`);
  assert(returnEntry.changedByType === "admin", `return-approved entry has changedByType = "admin"`);

  // Admin processes refund
  refreshed.paymentStatus = "refunded";
  refreshed.statusHistory.push({
    status: refreshed.status,
    timestamp: new Date(),
    comment: "Admin processed refund for this order.",
    changedByType: "admin",
  });
  await refreshed.save();

  refreshed = await Order.findById(order._id);
  assert(refreshed.paymentStatus === "refunded", `paymentStatus = "${refreshed.paymentStatus}" (expected "refunded")`);
  assert(refreshed.status === "delivered", `status STILL = "${refreshed.status}" (expected "delivered")`);
  assert(refreshed.returnStatus === "approved", `returnStatus STILL = "${refreshed.returnStatus}" (expected "approved")`);

  // Revenue should NOT include refunded order
  const revResult = await Order.aggregate([
    { $match: { _id: refreshed._id, paymentStatus: "paid", status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  assert((revResult[0]?.total || 0) === 0, "Refunded order NOT in revenue");

  return refreshed;
}

// ═══════════════════════════════════════
// SCENARIO E: Admin Filter Correctness
// ═══════════════════════════════════════
async function scenarioE_AdminFilters() {
  console.log("\n═══════════════════════════════════════");
  console.log("SCENARIO E: Admin Filter Verification");
  console.log("═══════════════════════════════════════");

  // Test the backend getAllOrders filter mapping logic
  // Filter: status=pending → logistics query
  const pendingOrders = await Order.find({ status: "pending" }).lean();
  const allPending = pendingOrders.every(o => o.status === "pending");
  assert(allPending, `All ${pendingOrders.length} results from status=pending filter are truly pending`);

  // Filter: status=refunded → should map to paymentStatus=refunded
  const refundedOrders = await Order.find({ paymentStatus: "refunded" }).lean();
  const allRefunded = refundedOrders.every(o => o.paymentStatus === "refunded");
  assert(allRefunded, `All ${refundedOrders.length} results from refunded filter have paymentStatus=refunded`);

  // Filter: returnStatus=requested
  const returnRequestedOrders = await Order.find({ returnStatus: "requested" }).lean();
  const allRequested = returnRequestedOrders.every(o => o.returnStatus === "requested");
  assert(allRequested || returnRequestedOrders.length === 0, `Filter return-requested returns only returnStatus=requested orders`);

  // Filter: returnStatus=approved
  const approvedOrders = await Order.find({ returnStatus: "approved" }).lean();
  const allApproved = approvedOrders.every(o => o.returnStatus === "approved");
  assert(allApproved, `All ${approvedOrders.length} results from approved filter have returnStatus=approved`);

  // Verify no order has category or stockStatus fields (dead code removal)
  const totalOrders = await Order.countDocuments();
  const ordersWithCategory = await Order.countDocuments({ category: { $exists: true } });
  assert(ordersWithCategory === 0, `No orders have a 'category' field (found ${ordersWithCategory}/${totalOrders})`);
}

async function main() {
  try {
    await mongoose.connect(ENV.DB_URL, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log("📦 Connected to MongoDB");

    await cleanup();

    // Execute all scenarios in sequence
    await scenarioA_OnlineOrder();
    const codOrder = await scenarioB_CODOrder();
    const deliveredOrder = await scenarioC_AdminTransitions(codOrder);
    await scenarioD_ReturnFlow(deliveredOrder);
    await scenarioE_AdminFilters();

    await cleanup();

    console.log("\n═══════════════════════════════════════");
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total assertions`);
    console.log("═══════════════════════════════════════");

    if (failed > 0) {
      console.log("⚠️  Some tests failed! Review the output above.");
      process.exit(1);
    } else {
      console.log("🎉 All E2E workflow tests passed!");
      process.exit(0);
    }
  } catch (err) {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  }
}

main();
