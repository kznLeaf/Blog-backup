

// 检查是否已初始化
if (!window._colorToggleInitialized) {

    //为点击事件绑定切换背景的功能
    document.querySelector('#color-toggle-btn').addEventListener("click", setBackgroundImage);

    window._colorToggleInitialized = true; // 标记为已初始化
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
 * 通过Open Graph meta判断当前页面是不是文章页
 * 如果是，则根据当前的模式替换背景图片
 */
function setBackgroundImage() {

    const ogTypeMeta = document.querySelector('meta[property="og:type"]');
    const isPost = ogTypeMeta && ogTypeMeta.content === 'article';

    if (isPost) {
        const bgDiv = document.getElementById('web_bg');

        if (bgDiv) {

            if (getCurrentMode() === 'light') bgDiv.style.backgroundImage = 'url("/img/night.webp")';

            else bgDiv.style.backgroundImage = 'url("/img/about.webp")';

            //console.log("成功替换");
        }
    }

}

/**
 * 上面的代码只有当点击日夜切换按钮时才生效。
 * 如果在首页就也切换为黑夜模式，进入文章页后会发现背景仍然是白色的
 * 这里利用了 DOMContentLoaded 事件，每当一个页面的HTML结构加载完成时判断是否是文章页，是的话就根据模式替换背景
 */
document.addEventListener('DOMContentLoaded', function () {
    // 通过 Open Graph 协议判断
    const ogTypeMeta = document.querySelector('meta[property="og:type"]');
    const isPost = ogTypeMeta && ogTypeMeta.content === 'article';

    if (isPost) { // 判断进入文章页

        const bgDiv = document.getElementById('web_bg');

        if (bgDiv) {

            if (getCurrentMode() === 'light') bgDiv.style.backgroundImage = 'url("/img/night.webp")';

            else bgDiv.style.backgroundImage = 'url("/img/about.webp")';

            //console.log("成功替换");
        }
    }
});


