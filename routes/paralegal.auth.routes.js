// routes/paralegalRoutes.js
const express = require('express');
const router = express.Router();
const paralegalController = require('../controllers/paralegalController');
const { protect } = require('../middleware/auth');
const Paralegal = require('../models/Paralegal');
const Task = require('../models/Task');


// POST /api/paralegals - Create a new paralegal
router.post('/', paralegalController.createParalegal);
router.post('/login', paralegalController.loginParalegal);
router.post('/auth/google-login', paralegalController.googlelogin);
router.get('/', paralegalController.getAllParalegals);
router.get('/verify-email/:token', paralegalController.verifyEmail);
// Forgot Password
router.post("/forgot-password", paralegalController.forgotPassword);

// Reset Password
router.post("/reset-password/:token", paralegalController.resetPassword);

router.use(protect);
// Finds paralegals who have tasks assigned by this attorney
router.get("/linked", protect, async (req, res) => {
  try {
    console.log("Fetching linked paralegals for attorney:", req.user._id);
    const attorneyId = req.user._id;

    const paralegals = await Task.distinct("assignedTo", {
      assignedBy: attorneyId
    });

    const list = await Paralegal.find({ _id: { $in: paralegals } })
      .select("firstName lastName email");

    res.json({ success: true, data: list });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch paralegals" });
  }
});

// Get Dashboard Info (Dynamic Paralegal & Task Data)
router.get('/dashboard/info', paralegalController.getDashboardInfo);

router.get('/singleparalegal', paralegalController.getParalegalById);
router.route('/availableStatus')
  .get(paralegalController.availableStatus)
  .patch(paralegalController.availableStatus);

// PUT /api/paralegals/:id - Update a paralegal by ID
router.put('/singleparalegal', paralegalController.updateParalegal);

// GET /api/paralegals - Get all paralegals

// GET /api/paralegals/:id - Get a single paralegal by ID



// DELETE /api/paralegals/:id - Delete a paralegal by ID
router.delete('/:id', paralegalController.deleteParalegal);

// POST /api/paralegals/login - Paralegal login

module.exports = router;
