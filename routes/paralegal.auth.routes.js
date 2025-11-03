// routes/paralegalRoutes.js
const express = require('express');
const router = express.Router();
const paralegalController = require('../controllers/paralegalController');
const { protect } = require('../middleware/paralegalauth');


// POST /api/paralegals - Create a new paralegal
router.post('/', paralegalController.createParalegal);
router.post('/login', paralegalController.loginParalegal);
router.post('/auth/google-login', paralegalController.googlelogin);
router.get('/', paralegalController.getAllParalegals);
router.get('/verify-email/:token', paralegalController.verifyEmail);

router.use(protect);
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
