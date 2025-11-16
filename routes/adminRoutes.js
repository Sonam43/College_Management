const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Complaint, Feedback } = require('../models');

// Simple admin role check middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).send('Forbidden');
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const [
      totalComplaints,
      openComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalFeedback,
      recentFeedbacks
    ] = await Promise.all([
      Complaint.count(),
      Complaint.count({ where: { status: 'open' } }),
      Complaint.count({ where: { status: 'in_progress' } }),
      Complaint.count({ where: { status: 'resolved' } }),
      Feedback.count(),
      Feedback.findAll({ order: [['createdAt', 'DESC']], limit: 5 })
    ]);

    const counts = {
      complaints: {
        total: totalComplaints,
        open: openComplaints,
        in_progress: inProgressComplaints,
        resolved: resolvedComplaints
      },
      feedback: {
        total: totalFeedback
      }
    };

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      counts,
      recentFeedbacks
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      counts: {
        complaints: { total: 0, open: 0, in_progress: 0, resolved: 0 },
        feedback: { total: 0 }
      },
      recentFeedbacks: []
    });
  }
});

router.get('/complaints', requireAdmin, async (req, res) => {
  const complaints = await Complaint.findAll({ order: [['createdAt', 'DESC']] });
  res.render('admin/complaints', { title: 'Complaints', complaints });
});

// Feedback management
router.get('/feedbacks', requireAdmin, async (req, res) => {
  const feedbacks = await Feedback.findAll({ order: [['createdAt', 'DESC']] });
  res.render('admin/feedbacks', { title: 'Feedback', feedbacks });
});

router.post('/feedbacks/:id/update', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { rating, comments } = req.body;
  try {
    await Feedback.update(
      { rating: parseInt(rating, 10), comments },
      { where: { id } }
    );
  } catch (e) {
    console.error('Error updating feedback:', e);
  }
  res.redirect('/admin/feedbacks');
});

router.post('/feedbacks/:id/delete', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await Feedback.destroy({ where: { id } });
  } catch (e) {
    console.error('Error deleting feedback:', e);
  }
  res.redirect('/admin/feedbacks');
});

// View single feedback
router.get('/feedbacks/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findOne({ where: { id } });
    if (!feedback) return res.redirect('/admin/feedbacks');
    res.render('admin/feedback-view', { title: `Feedback #${id}`, feedback });
  } catch (e) {
    console.error('Error fetching feedback:', e);
    res.redirect('/admin/feedbacks');
  }
});
router.post('/complaints/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // expected: open, in_progress, resolved
  await Complaint.update({ status }, { where: { id } });
  res.redirect('/admin/complaints');
});

router.post('/complaints/:id/delete', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the complaint first to get attachment info
    const complaint = await Complaint.findOne({ where: { id } });
    
    if (!complaint) {
      return res.status(404).redirect('/admin/complaints');
    }
    
    // Delete the attachment file if it exists
    if (complaint.attachmentUrl) {
      // attachmentUrl is stored as /uploads/filename.ext
      const filePath = path.join(__dirname, '..', complaint.attachmentUrl);
      
      // Check if file exists and delete it
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete the complaint from database
    await Complaint.destroy({ where: { id } });
    
    res.redirect('/admin/complaints');
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).redirect('/admin/complaints');
  }
});

module.exports = router;


