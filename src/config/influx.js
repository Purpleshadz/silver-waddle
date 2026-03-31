const { InfluxDB } = require('@influxdata/influxdb-client');

function getClient() {
  return new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
}

async function influxQuery(fluxQuery) {
  try {
    const client = getClient();
    const queryApi = client.getQueryApi(process.env.INFLUX_ORG);
    const rows = [];
    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          rows.push(tableMeta.toObject(row));
        },
        error(err) { reject(err); },
        complete() { resolve(); }
      });
    });
    return rows;
  } catch (err) {
    console.error('InfluxDB query error:', err.message);
    return [];
  }
}

async function getInfluxMeasurements() {
  const bucket = process.env.INFLUX_BUCKET;
  const query = `import "influxdata/influxdb/schema"
schema.measurements(bucket: "${bucket}")`;
  try {
    const rows = await influxQuery(query);
    return rows.map(r => r._value).filter(Boolean);
  } catch (err) {
    console.error('getInfluxMeasurements error:', err.message);
    return [];
  }
}

async function getInfluxTags(measurement) {
  const bucket = process.env.INFLUX_BUCKET;
  const query = `import "influxdata/influxdb/schema"
schema.tagKeys(bucket: "${bucket}", predicate: (r) => r._measurement == "${measurement}")`;
  try {
    const rows = await influxQuery(query);
    return rows.map(r => r._value).filter(v => v && !v.startsWith('_'));
  } catch (err) {
    console.error('getInfluxTags error:', err.message);
    return [];
  }
}

async function getInfluxFields(measurement) {
  const bucket = process.env.INFLUX_BUCKET;
  const query = `import "influxdata/influxdb/schema"
schema.fieldKeys(bucket: "${bucket}", predicate: (r) => r._measurement == "${measurement}")`;
  try {
    const rows = await influxQuery(query);
    return rows.map(r => r._value).filter(Boolean);
  } catch (err) {
    console.error('getInfluxFields error:', err.message);
    return [];
  }
}

module.exports = { influxQuery, getInfluxMeasurements, getInfluxTags, getInfluxFields };
