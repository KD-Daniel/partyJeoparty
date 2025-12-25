import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE || 'partyjeoparty',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Track database connection state
let dbConnected = false

// Check if database is connected (synchronous)
export function isConnected(): boolean {
  return dbConnected
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    console.log('MySQL connection successful')
    connection.release()
    dbConnected = true
    return true
  } catch (error) {
    console.error('MySQL connection failed - using in-memory storage')
    dbConnected = false
    return false
  }
}

export default pool
