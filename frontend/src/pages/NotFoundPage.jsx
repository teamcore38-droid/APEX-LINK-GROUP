import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
      <AlertCircle size={80} className="text-brand-accent mb-6" />
      <h1 className="text-5xl font-serif font-bold text-brand-dark mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-6">Page Not Found</h2>
      <p className="text-gray-600 max-w-md mb-8">
        We're sorry, the page you requested could not be found. Please go back to the homepage or try searching for what you need.
      </p>
      <Link to="/" className="btn-primary px-8 py-3">
        Back to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
