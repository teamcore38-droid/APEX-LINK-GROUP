const categories = [
  // Parent Category 1: Women
  {
    name: 'Women',
    slug: 'women',
    description: 'Curated luxury fashion, accessories, footwear, and handbags for women.',
    image: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1400',
    isActive: true,
    displayOrder: 1,
    children: [
      {
        name: 'Shoes',
        slug: 'women-shoes',
        description: 'Designer heels, boots, flats, and luxury footwear.',
        image: 'https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Handbags',
        slug: 'women-handbags',
        description: 'Premium leather totes, clutches, and crossbody bags.',
        image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 2,
      },
      {
        name: 'Accessories',
        slug: 'women-accessories',
        description: 'Elegant jewelry, scarves, belts, and luxury sunglasses.',
        image: 'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 3,
      },
      {
        name: 'Apparel & Dresses',
        slug: 'women-apparel',
        description: 'Designer gowns, evening dresses, and premium textiles.',
        image: 'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 4,
      },
    ],
  },
  // Parent Category 2: Men
  {
    name: 'Men',
    slug: 'men',
    description: 'Bespoke tailoring, casual wear, leather shoes, and accessories for men.',
    image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1400',
    isActive: true,
    displayOrder: 2,
    children: [
      {
        name: 'Shirts & Tops',
        slug: 'men-shirts',
        description: 'Formal dress shirts, polo shirts, and casual tops.',
        image: 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Footwear',
        slug: 'men-footwear',
        description: 'Leather Oxfords, loafers, and handcrafted boots.',
        image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 2,
      },
      {
        name: 'Men Accessories',
        slug: 'men-accessories',
        description: 'Watches, leather belts, wallets, and ties.',
        image: 'https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 3,
      },
    ],
  },
  // Parent Category 3: IT Solutions & Electronics
  {
    name: 'IT Solutions & Electronics',
    slug: 'it-solutions-electronics',
    description: 'Enterprise hardware, software solutions, and consumer electronics.',
    image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1400',
    isActive: true,
    displayOrder: 3,
    children: [
      {
        name: 'Audio & Headsets',
        slug: 'audio-headsets',
        description: 'High-fidelity headphones, wireless earbuds, and speakers.',
        image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Smart Devices',
        slug: 'smart-devices',
        description: 'Smartwatches, tablets, and mobile technology.',
        image: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 2,
      },
    ],
  },
  // Parent Category 4: Spices & Food Products
  {
    name: 'Spices & Food Products',
    slug: 'spices-food-products',
    description: 'Authentic Ceylon spices, gourmet teas, and organic packaged foods.',
    image: 'https://images.pexels.com/photos/1435894/pexels-photo-1435894.jpeg?auto=compress&cs=tinysrgb&w=1400',
    isActive: true,
    displayOrder: 4,
    children: [
      {
        name: 'Ceylon Spices',
        slug: 'ceylon-spices',
        description: 'Pure Ceylon cinnamon, cardamom, cloves, and organic pepper.',
        image: 'https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Tea & Beverages',
        slug: 'tea-beverages',
        description: 'Single-origin Ceylon black, green, and herbal teas.',
        image: 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 2,
      },
    ],
  },
  // Parent Category 5: Home & Living
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Elegant furniture, decor, and lifestyle essentials.',
    image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1400',
    isActive: true,
    displayOrder: 5,
    children: [
      {
        name: 'Decor & Furniture',
        slug: 'decor-furniture',
        description: 'Handcrafted wooden furniture and accent decor.',
        image: 'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg?auto=compress&cs=tinysrgb&w=1400',
        isActive: true,
        displayOrder: 1,
      },
    ],
  },
];

export default categories;
