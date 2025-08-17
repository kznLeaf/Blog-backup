const  navbarBrand  =  document.querySelector('.container a');

/* <object> 标签会阻止点击事件传递到父元素。这是因为 <object> 内部的内容（SVG）会"吸收"点击事件。使用 pointer-events: none 可以解决这个问题 */

navbarBrand.innerHTML = `
  <object type="image/svg+xml" data="/img/icon.svg" style="pointer-events: none;"></object>
`;

navbarBrand.addEventListener('click', function() {
  window.location.href = 'https://kznleaf.site';
});


