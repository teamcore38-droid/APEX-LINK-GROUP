import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/apexlinkgroup';
const stateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const connectDB = async (options = {}) => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  const primaryUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const localUri = process.env.LOCAL_MONGO_URI || DEFAULT_LOCAL_URI;

  const tryConnect = async (uri, label) => {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    console.log(`MongoDB Connected (${label}): ${conn.connection.host}`);
    return true;
  };

  try {
    if (primaryUri) {
      return await tryConnect(primaryUri, 'primary');
    }
  } catch (error) {
    console.warn(`MongoDB primary connection failed: ${error.message}`);
    if (options.strict || process.env.NODE_ENV === 'production') {
      throw error;
    }
  }

  try {
    return await tryConnect(localUri, 'local');
  } catch (error) {
    console.warn(`MongoDB local connection failed: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MongoDB connection failed and no fallback database is available.');
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await tryConnect(memoryUri, 'memory');
    console.log(`MongoDB Memory Server started at ${memoryUri}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return false;
  }
};

export const getMongoConnectionState = () => stateMap[mongoose.connection.readyState] || 'unknown';

export default connectDB;
