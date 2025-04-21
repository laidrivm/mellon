import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'
import PouchDBAuth from 'pouchdb-authentication'

PouchDB.plugin(PouchDBFind)
PouchDB.plugin(PouchDBAuth)

const localDB = new PouchDB('mellon')

const REMOTE_DB_URL =
  process.env.REACT_APP_COUCH_URL || 'http://localhost:5984/mellon'
const remoteDB = new PouchDB(REMOTE_DB_URL)

export {localDB, remoteDB}
