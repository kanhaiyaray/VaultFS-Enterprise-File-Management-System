const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fingerprint: { type: String, required: true, index: true },
  deviceName: { type: String, default: '' },
  isTrusted: { type: Boolean, default: false },
  
  userAgent: String,
  platform: String,
  language: String,
  screenResolution: String,
  timezone: String,
  hardwareConcurrency: Number,
  deviceMemory: Number,
  touchSupport: Boolean,
  
  ipAddress: String,
  
  lastSeenAt: { type: Date, default: Date.now },
  firstSeenAt: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 0 },
  
  isSuspicious: { type: Boolean, default: false },
  suspicionReason: String,
}, { timestamps: true });

deviceSchema.index({ user: 1, fingerprint: 1 });
deviceSchema.index({ user: 1, isTrusted: 1 });

module.exports = mongoose.model('Device', deviceSchema);