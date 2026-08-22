const bcrypt = require('bcryptjs');

const hash = '$2b$12$xOuShiYPf9G4M2Yqi0OiJe4eNdWQjerbv8ErSfwgLpoE3xjE749ku';
const match = bcrypt.compareSync('ChangeMe123!', hash);
console.log("Password ChangeMe123! match result:", match);
