/* const  navbarBrand  =  document.querySelector('.container a');


navbarBrand.innerHTML = `
  <object type="image/svg+xml" data="/img/icon.svg" style="pointer-events: none;"></object>
`;

navbarBrand.addEventListener('click', function() {
  window.location.href = 'https://kznleaf.site';
}); */


fetch('/img/icon.svg')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(svgContent => {
    const navbarBrand = document.querySelector('.container a');
    if (navbarBrand) {
      // 直接插入 SVG 内容
      navbarBrand.innerHTML = svgContent;
      
      // 确保 SVG 不阻止点击事件传递到父元素
      const svg = navbarBrand.querySelector('svg');
      if (svg) {
        svg.style.pointerEvents = 'none';
        // 可以在这里设置 SVG 的其他样式
        svg.style.display = 'block';
        // svg.style.width = '32px';   // 根据需要设置尺寸
        // svg.style.height = '32px';  // 根据需要设置尺寸
      }
      
      // 添加点击事件监听器
      navbarBrand.addEventListener('click', function(e) {
        e.preventDefault(); // 防止默认的链接行为
        window.location.href = 'https://kznleaf.site';
      });
    }
  })