
  const products = [
    {
      title: "iPhone (X, XR, 11, 11 Pro, 12, 12 Pro, 13, 13 Pro) ",
      image: "https://res.cloudinary.com/dryaemkif/image/upload/f_webp,q_auto/v1745215735/iPhone_%28X%2C_XR%2C_11%2C_11_Pro%2C_12%2C_12_Pro%2C_13%2C_13_Pro%29%29__1745215734116_1.jpg.webp",
      link: "https://somba-teka.netlify.app/description?id=30"
    },
    {
      title: "ADIDAS Campus ",
      image: "https://res.cloudinary.com/dryaemkif/image/upload/f_webp,q_auto/v1752273334/products/products/product-1-1752273333168-hl0r30p.webp",
      link: "https://somba-teka.netlify.app/description?id=48"
    },
  ];

  const productList = document.getElementById('product-list');

  products.forEach(product => {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-lg-3';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => window.open(product.link, '_blank');

    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}">
      <h5>${product.title}</h5>
    `;

    col.appendChild(card);
    productList.appendChild(col);
  });
