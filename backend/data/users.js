import bcrypt from 'bcryptjs';

const users = [
  // Development/staging bootstrap users only. Rotate credentials before production.
  {
    name: 'Admin User',
    email: 'admin@apexlinkgroup.com',
    password: bcrypt.hashSync('password123', 10),
    isAdmin: true,
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: bcrypt.hashSync('password123', 10),
  },
];

export default users;
