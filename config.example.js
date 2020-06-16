module.exports = {
  discord: {
    key: "",
  },
  bot: {
    prefix: '.killer',
  },
  db: {
    host: 'db',
    user: process.env.MYSQL_DATABASE,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  }
}
