// api/lookup.js — Vercel Serverless Function (Node 18+)
export default async function handler(req, res) {
  const { ean = '' } = req.query;
  const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'tu-id-21';

  // Simulamos catálogo conocido (puedes añadir más)
  const KNOWN = {
    '9788408306863': {
      asin: 'B00E8KEYPC',
      title: 'Cien años de soledad – Gabriel García Márquez',
      category: 'Libros',
      image: 'https://m.media-amazon.com/images/I/81s9QAXZ7VL._AC_UF1000,1000_QL80_.jpg',
      price: '18.95'
    },
    '8433548037768': {
      asin: 'B00KQJZQ4A',
      title: 'El Padrino (DVD)',
      category: 'Películas y TV',
      image: 'https://m.media-amazon.com/images/I/81x7P9Z1NFL._AC_UF1000,1000_QL80_.jpg',
      price: '9.99'
    }
  };

  let product = KNOWN[ean];
  if (!product) {
    const searchUrl = `https://www.amazon.es/s?k=${encodeURIComponent(ean)}&tag=${ASSOCIATE_TAG}`;
    product = {
      asin: null,
      title: 'Búsqueda en Amazon',
      category: 'General',
      image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon',
      price: null,
      affiliateLink: searchUrl
    };
  }

  const affiliateLink = product.asin
    ? `https://www.amazon.es/dp/${product.asin}/?tag=${ASSOCIATE_TAG}`
    : product.affiliateLink;

  res.status(200).json({
    success: true,
    product: {
      title: product.title,
      category: product.category,
      image: product.image,
      price: product.price, // en euros (string)
      affiliateLink
    }
  });
}
