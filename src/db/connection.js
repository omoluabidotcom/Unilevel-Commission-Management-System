/**
 * Placeholder DB connection module.
 *
 * Replace this with a real database (Postgres, MySQL, Mongo, etc.)
 * as your project grows.
 */

const users = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    password: 'password',
  },
  {
    id: '2',
    name: 'Distributor User',
    email: 'distributor@example.com',
    role: 'distributor',
    password: 'password',
  },
];

function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
}

function findUserById(id) {
  return users.find((u) => u.id === id);
}

module.exports = {
  findUserByEmail,
  findUserById,
};
