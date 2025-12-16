const Invoice = require('../models/Invoice');
const Transaction = require('../models/billTransaction');
const TimeEntry = require('../models/TimeEntry');
const Paralegal = require('../models/Paralegal');
const Attorney = require('../models/Attorney');
const { attorneyInvoiceAlertTemplate } = require('../lib/emailTemplates');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');

// Helper to generate unique invoice numbers
const generateInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

exports.createInvoice = async (req, res) => {
  try {
    // SECURITY: Ensure only Paralegals can generate invoices
    if (req.user.role !== 'paralegal') {
      return res.status(403).json({
        success: false,
        message: 'Only paralegals can generate invoices.'
      });
    }

    const paralegalId = req.user._id;
    const { attorneyId, startDate, endDate, dueDate, taskId } = req.body;

    // 1. Validate Target Attorney
    const attorney = await Attorney.findById(attorneyId);
    if (!attorney) return res.status(404).json({ message: 'Attorney not found' });

    // 2. Fix Date Objects
    // Ensure startDate is a Date object
    const start = new Date(startDate);
    
    // Ensure endDate includes the FULL day (23:59:59.999)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 3. Build Query
    const query = {
      user: paralegalId,
      isBillable: true,
      createdAt: {
        $gte: start,
        $lte: end, // <--- FIXED: Now includes the entire end day
      },
      $or: [
        { invoice: null },
        { invoice: { $exists: false } }
      ]
    };

    // Add Task Filter if provided
    if (taskId) {
      query.task = taskId;
    }

    console.log("Create Invoice Filter:", query);

    const timeEntries = await TimeEntry.find(query).populate('task');

    if (timeEntries.length === 0) {
      return res.status(400).json({ message: 'No billable time entries found for this period.' });
    }

    // 4. Calculate Line Items
    const paralegalProfile = await Paralegal.findById(paralegalId);
    const defaultRate = paralegalProfile.hourlyRate || 0;

    const items = timeEntries.map(entry => {
      const hours = (entry.duration / 3600);

      return {
        description: entry.description || (entry.task ? entry.task.title : 'General Work'),
        quantity: parseFloat(hours.toFixed(2)),
        rate: defaultRate,
        amount: parseFloat((hours * defaultRate).toFixed(2)),
        refType: 'TimeEntry',
        refId: entry._id
      };
    });

    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
    const tax = 0;
    const totalAmount = subtotal + tax;

    // 5. Create Invoice
    const invoice = new Invoice({
      invoiceNumber: generateInvoiceNumber(),
      attorney: attorneyId,
      paralegal: paralegalId,
      timeEntries: timeEntries.map(te => te._id),
      items,
      subtotal,
      tax,
      totalAmount,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Sent'
    });

    await invoice.save();



    // 6. Send Email Notification
    try {
      await sendBrevoEmailApi({
        to_email: [{
          email: attorney.email,
          name: attorney.fullName // Best practice to include name if available
        }],
        email_subject: `Invoice ${invoice.invoiceNumber} Generated – Juris-LPO`,
        htmlContent: attorneyInvoiceAlertTemplate(
          attorney.fullName, 
          attorney.firmName, 
          invoice.invoiceNumber, 
          totalAmount, 
          invoice.dueDate, 
          invoice._id
        ),
      });
    } catch (emailErr) {
      console.error("Failed to send invoice email:", emailErr);
      // We do NOT fail the request here, as the invoice was successfully created.
    }

    // 7. Update TimeEntries
    await TimeEntry.updateMany(
      { _id: { $in: timeEntries.map(te => te._id) } },
      { $set: { invoice: invoice._id } }
    );

    res.status(201).json({ success: true, data: invoice });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { status } = req.query;

    // SECURITY: Automatically filter by the logged-in user's ID and Role
    let query = {};

    if (req.user.role === 'attorney') {
      query.attorney = req.user._id;
    } else if (req.user.role === 'paralegal') {
      query.paralegal = req.user._id;
    }

    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .populate('attorney', 'fullName email firmName')
      .populate('paralegal', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('attorney', 'fullName firmName address')
      .populate('paralegal', 'firstName lastName email')
      .populate('items.refId');

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // SECURITY: Check ownership
    // Convert IDs to strings for comparison
    const isOwner =
      invoice.attorney._id.toString() === req.user._id.toString() ||
      invoice.paralegal._id.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    // SECURITY: Only Attorneys can pay invoices
    if (req.user.role !== 'attorney') {
      return res.status(403).json({ message: 'Only attorneys can process payments.' });
    }

    const { invoiceId, paymentMethod, transactionId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // SECURITY: Verify the logged-in attorney is the one billed on this invoice
    if (invoice.attorney.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the payer for this invoice.' });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({ message: 'Invoice is already paid' });
    }

    // 1. Create Transaction Record
    const transaction = new Transaction({
      invoice: invoiceId,
      payer: req.user._id, // Logged in Attorney
      payee: invoice.paralegal,
      amount: invoice.totalAmount,
      paymentMethod,
      transactionId,
      status: 'Completed'
    });

    await transaction.save();

    // 2. Update Invoice Status
    invoice.status = 'Paid';
    invoice.paidAt = Date.now();
    await invoice.save();

    res.status(200).json({ success: true, data: { invoice, transaction } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};