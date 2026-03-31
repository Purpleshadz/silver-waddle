const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { influxQuery, getInfluxMeasurements, getInfluxTags, getInfluxFields } = require('../config/influx');

// GET /api/measurements
router.get('/api/measurements', requireAdmin, async (req, res) => {
  try {
    const measurements = await getInfluxMeasurements();
    res.json(measurements);
  } catch (err) {
    console.error('API measurements error:', err);
    res.json([]);
  }
});

// GET /api/measurements/:measurement/tags
router.get('/api/measurements/:measurement/tags', requireAdmin, async (req, res) => {
  try {
    const tags = await getInfluxTags(req.params.measurement);
    res.json(tags);
  } catch (err) {
    console.error('API tags error:', err);
    res.json([]);
  }
});

// GET /api/measurements/:measurement/fields
router.get('/api/measurements/:measurement/fields', requireAdmin, async (req, res) => {
  try {
    const fields = await getInfluxFields(req.params.measurement);
    res.json(fields);
  } catch (err) {
    console.error('API fields error:', err);
    res.json([]);
  }
});

// GET /api/data
router.get('/api/data', requireAdmin, async (req, res) => {
  try {
    const { measurement, tagKey, tagValue, field, range } = req.query;

    if (!measurement || !field) {
      return res.status(400).json({ error: 'measurement and field are required' });
    }

    const bucket = process.env.INFLUX_BUCKET;
    const safeRange = range || '-1h';

    let query = `from(bucket: "${bucket}")
  |> range(start: ${safeRange})
  |> filter(fn: (r) => r._measurement == "${measurement}")`;

    if (tagKey && tagValue) {
      query += `\n  |> filter(fn: (r) => r["${tagKey}"] == "${tagValue}")`;
    }

    query += `\n  |> filter(fn: (r) => r._field == "${field}")`;
    query += `\n  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)`;
    query += `\n  |> yield(name: "mean")`;

    const rows = await influxQuery(query);
    const result = rows.map(r => ({ time: r._time, value: r._value }));
    res.json(result);
  } catch (err) {
    console.error('API data error:', err);
    res.json([]);
  }
});

module.exports = router;
