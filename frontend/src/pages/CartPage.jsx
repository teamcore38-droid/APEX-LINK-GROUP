import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/productUi';
import CustomSelect from '../components/CustomSelect';

const CartPage = () => {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  const checkoutHandler = () => {
    navigate('/login?redirect=/checkout');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-bold mb-8">Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 mb-6 text-lg">Your cart is currently empty.</p>
          <Link to="/products" className="btn-primary inline-block">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="hidden md:grid grid-cols-5 text-sm uppercase tracking-wider text-gray-500 font-semibold">
                  <div className="col-span-2">Product</div>
                  <div className="text-center">Price</div>
                  <div className="text-center">Quantity</div>
                  <div className="text-right">Total</div>
                </div>
              </div>
              
              <ul className="divide-y divide-gray-100">
                {cartItems.map(item => (
                  <li key={`${item.product}-${item.variantId || 'default'}`} className="p-6 flex flex-col md:grid md:grid-cols-5 items-center gap-4">
                    <div className="col-span-2 flex items-center w-full">
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                      <Link to={`/product/${item.product}`} className="ml-4 font-semibold text-brand-dark hover:text-brand-primary">
                        {item.name}
                        {item.variantLabel && (
                          <span className="mt-1 block text-xs font-medium text-gray-500">{item.variantLabel}</span>
                        )}
                      </Link>
                    </div>
                    <div className="text-center w-full md:w-auto font-medium">
                      {formatCurrency(item.price)}
                    </div>
                    <div className="flex justify-center w-full md:w-auto">
                      <CustomSelect
                        value={item.qty}
                        onChange={(nextValue) => addToCart(item, Number(nextValue))}
                        className="w-[92px]"
                        buttonClassName="py-1.5 pl-3 pr-8"
                        options={[...Array(item.countInStock).keys()].map((x) => ({
                          value: x + 1,
                          label: String(x + 1),
                        }))}
                        ariaLabel={`Quantity for ${item.name}`}
                      />
                    </div>
                    <div className="flex justify-between md:justify-end items-center w-full md:w-auto w-full font-bold">
                      <span className="md:hidden">Total: </span>
                      {formatCurrency(item.price * item.qty)}
                      <button 
                        onClick={() => removeFromCart(item.product)}
                        className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove from Cart"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-6">
              <Link to="/products" className="inline-flex items-center text-brand-primary hover:text-brand-dark font-medium">
                <ArrowLeft size={16} className="mr-2" /> Continue Shopping
              </Link>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-serif font-bold mb-6 pb-4 border-b border-gray-100">Order Summary</h2>
              
              <div className="flex justify-between mb-4 text-gray-600">
                <span>Items ({cartItems.reduce((acc, item) => acc + item.qty, 0)})</span>
                <span>{formatCurrency(cartItems.reduce((acc, item) => acc + item.qty * item.price, 0))}</span>
              </div>
              
              <div className="flex justify-between mb-6 text-gray-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              
              <div className="flex justify-between mb-8 pb-6 border-b border-gray-100 text-xl font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(cartItems.reduce((acc, item) => acc + item.qty * item.price, 0))}</span>
              </div>
              
              <button 
                onClick={checkoutHandler}
                className="w-full btn-primary py-3 text-lg font-bold uppercase tracking-wider"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
