const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  title: String,
  measurement: String,
  tagKey: String,
  tagValue: String,
  field: String,
  dateRange: { type: String, default: '-1h' },
  chartType: { type: String, enum: ['line', 'bar'], default: 'line' },
  order: Number
});

const dashboardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  isDefault: { type: Boolean, default: false },
  widgets: [widgetSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dashboard', dashboardSchema);
