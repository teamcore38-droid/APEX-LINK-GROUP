const AboutPage = () => {
  return (
    <div>
      <div className="bg-brand-dark text-white py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Our Story</h1>
        <p className="text-xl max-w-2xl mx-auto text-gray-300">Connecting the world's finest manufacturers with customers everywhere.</p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-12 items-center mb-20">
          <div className="md:w-1/2">
            <img
              src="https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="Global trade and sourcing"
              className="rounded-lg shadow-lg w-full"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-serif font-bold mb-6">Built on Trust, Powered by Quality</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Apex Link Group began as a premium sourcing house and has grown into a global multi-industry marketplace. We saw that businesses and consumers alike struggled to find one trusted platform for genuinely premium products — whether textiles, food, technology, or industrial equipment.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We bypass unnecessary intermediaries, partnering directly with certified mills, growers, and manufacturers across Asia, Europe, Africa, and the Americas. Direct relationships mean fair compensation for producers, verified authenticity for customers, and enterprise-grade reliability on every order.
            </p>
          </div>
        </div>

        <div className="bg-[#edf1f7] -mx-4 px-4 py-16 mb-20">
          <div className="container mx-auto">
            <h2 className="text-3xl font-serif font-bold mb-12 text-center">Our Quality Promise</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">1</div>
                <h3 className="text-xl font-bold mb-3">Verified Suppliers</h3>
                <p className="text-gray-600">Every manufacturer and supplier is audited against international standards before joining our marketplace.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">2</div>
                <h3 className="text-xl font-bold mb-3">Ethically Sourced</h3>
                <p className="text-gray-600">We champion fair trade, responsible manufacturing, and sustainable practices across every industry we serve.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">3</div>
                <h3 className="text-xl font-bold mb-3">Quality Guaranteed</h3>
                <p className="text-gray-600">Category-specific quality checks, protective packaging, and a 30-day return promise on every order.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
