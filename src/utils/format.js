// Formats a product's price according to its currency.
// VND is shown with no decimals and a trailing đ, per local convention.
export function formatPrice(product) {
  const { price, currency } = product;
  if (currency === 'VND') {
    return `${price.toLocaleString('vi-VN')}đ`;
  }
  return `$${price.toFixed(2)}`;
}

// Image source for React Native's <Image>: a bundled local image is a
// require()'d number, a remote image is a URL string that needs wrapping
// in { uri }.
export function imageSource(image) {
  return typeof image === 'string' ? { uri: image } : image;
}
