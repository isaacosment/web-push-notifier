class SubscriptionRepository {
  constructor(dao) {
    this.dao = dao
  }

  createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT,
      expiration_time TEXT,
      key_p256dh TEXT,
      key_auth TEXT
    )`
    return this.dao.run(sql)
  }

  create(endpoint, expirationTime, keyP256dh, keyAuth) {
    const sql = 'INSERT INTO subscriptions (endpoint, expiration_time, key_p256dh, key_auth) VALUES (?,?,?,?)'
    const data = [endpoint, expirationTime, keyP256dh, keyAuth]
    return this.dao.run(sql, data)
  }

  async replace(endpoint, expirationTime, keyP256dh, keyAuth) {
    const existing = await this.getAllByEndpoint(endpoint)

    await this.create(endpoint, expirationTime, keyP256dh, keyAuth)

    if (existing) {
      for (let existingSubscription of existing) {
        this.delete(existingSubscription.id)
      }
    }
  }

  delete(id) {
    return this.dao.run(
      `DELETE FROM subscriptions WHERE id = ?`,
      [id]
    )
  }

  getAllByEndpoint(endpoint) {
    const rows = this.dao.all(
        `SELECT * FROM subscriptions WHERE endpoint = ?`,
        [endpoint]
      )
    const subscriptions = rows.map(this.mapSubscription)
    return subscriptions
  }

  getById(id) {
    return this.mapSubscription(
        this.dao.get(
        `SELECT * FROM subscriptions WHERE id = ?`,
        [id]
      )
    )
  }

  getAll() {
    return this.dao.all(`SELECT * FROM subscriptions`).map(this.mapSubscription)
  }

  getActive() {
    const rows = this.dao.all(`SELECT * FROM subscriptions WHERE expiration_time IS NULL OR expiration_time > time('now')`)
    return rows.map(this.mapSubscription)
  }

  mapSubscription(row) {
    const subscription = {
      id: row.id,
      endpoint: row.endpoint,
      expirationTime: row.expiration_time,
      keys: {
        p256dh: row.key_p256dh,
        auth: row.key_auth
      }
    }

    return subscription
  }
}

module.exports = SubscriptionRepository;