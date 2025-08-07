/**
 * 预加载背景图片
 */
function preloadBackgroundImages() {
    const images = ['/img/night.webp', '/img/about.webp', 'icon.svg'];
    
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 检查是否已初始化
if (!window._colorToggleInitialized) {
    // 预加载图片
    preloadBackgroundImages();
    
    // 为点击事件绑定切换背景的功能
    document.querySelector('#color-toggle-btn').addEventListener("click", setBackgroundImage);
    window._colorToggleInitialized = true;
}

/**
 * 获取当前日/夜模式
 * @returns light:夜，dark:日（刚好反过来）
 */
function getCurrentMode() {
    return document.getElementById('color-toggle-icon').getAttribute('data');
}

/**
 * 设置背景图片
 */
function setBackgroundImage() {
    const ogTypeMeta = document.querySelector('meta[property="og:type"]');
    const isPost = ogTypeMeta && ogTypeMeta.content === 'article';
    if (isPost) {
        const bgDiv = document.getElementById('web_bg');
        if (bgDiv) {
            if (getCurrentMode() === 'light') bgDiv.style.backgroundImage = 'url("/img/night.webp")';
            else bgDiv.style.backgroundImage = 'url("/img/about.webp")';
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 确保图片已预加载
    preloadBackgroundImages();
    
    const ogTypeMeta = document.querySelector('meta[property="og:type"]');
    const isPost = ogTypeMeta && ogTypeMeta.content === 'article';
    if (isPost) {
        const bgDiv = document.getElementById('web_bg');
        if (bgDiv) {
            if (getCurrentMode() === 'light') bgDiv.style.backgroundImage = 'url("/img/night.webp")';
            else bgDiv.style.backgroundImage = 'url("/img/about.webp")';
        }
    }
});