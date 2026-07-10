import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { hasPermission } from '../utils/permissions.js';

const getTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
};

const attachUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(decoded.id).select('-password');
};

const protect = async (req, res, next) => {
  let token;

  token = getTokenFromRequest(req);

  if (token) {
    try {
      req.user = await attachUserFromToken(token);
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const protectOptional = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    req.user = await attachUserFromToken(token);
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (hasPermission(req.user, permission)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for this admin action' });
  }
};

const vendor = (req, res, next) => {
  if (req.user && (req.user.isVendor || req.user.isAdmin)) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a vendor' });
  }
};

export { protect, protectOptional, admin, requirePermission, vendor };
