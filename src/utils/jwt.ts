import jwt from 'jsonwebtoken';


export const generateWebToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET ||   'default-secret',
    { expiresIn: '7d' }
  );
};