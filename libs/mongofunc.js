const { MongoClient } = require('mongodb')

const uri = process.env.MONGO_URI
const dbName = process.env.MONGO_DB_NAME || 'chainsaw_game'

if (!uri) {
  throw new Error('MONGO_URI is not set')
}

let client = null
let db = null

async function connect() {
  if (db) return { client, db }

  client = new MongoClient(uri)
  await client.connect()
  db = client.db(dbName)

  console.log('MongoDB connected:', dbName)

  return { client, db }
}

async function getCollection(colname) {
  const conn = await connect()
  return conn.db.collection(colname)
}

async function find(colname, filter = {}) {
  const collection = await getCollection(colname)
  return await collection.find(filter).toArray()
}

async function findOne(colname, filter = {}) {
  const collection = await getCollection(colname)
  return await collection.findOne(filter)
}

async function insertOne(colname, data) {
  const collection = await getCollection(colname)
  return await collection.insertOne(data)
}

async function insertMany(colname, data) {
  const collection = await getCollection(colname)
  return await collection.insertMany(data)
}

async function updateOne(colname, filter, updateObj, options = {}) {
  const collection = await getCollection(colname)
  return await collection.updateOne(filter, updateObj, options)
}

async function updateMany(colname, filter, updateObj, options = {}) {
  const collection = await getCollection(colname)
  return await collection.updateMany(filter, updateObj, options)
}

async function deleteMany(colname, filter) {
  const collection = await getCollection(colname)
  return await collection.deleteMany(filter)
}

module.exports = {
  connect,
  getCollection,
  find,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  updateMany,
  deleteMany
}