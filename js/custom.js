document.addEventListener('DOMContentLoaded', function() {
    const subtitle = document.getElementById('subtitle');
    subtitle.classList.add('visible'); // 页面加载后添加 visible 类
});

!(function() {
    /** 计时起始时间，自行修改 **/
    var start = new Date("2024/09/13 20:00:00");
  
    function update() {
      var now = new Date();
      now.setTime(now.getTime()+250);
      days = (now - start) / 1000 / 60 / 60 / 24;
      dnum = Math.floor(days);
      hours = (now - start) / 1000 / 60 / 60 - (24 * dnum);
      hnum = Math.floor(hours);
      if(String(hnum).length === 1 ){
        hnum = "0" + hnum;
      }
      minutes = (now - start) / 1000 /60 - (24 * 60 * dnum) - (60 * hnum);
      mnum = Math.floor(minutes);
      if(String(mnum).length === 1 ){
        mnum = "0" + mnum;
      }
      seconds = (now - start) / 1000 - (24 * 60 * 60 * dnum) - (60 * 60 * hnum) - (60 * mnum);
      snum = Math.round(seconds);
      if(String(snum).length === 1 ){
        snum = "0" + snum;
      }
      document.getElementById("timeDate").innerHTML = "本博客已生长&nbsp"+dnum+"&nbsp天";
      document.getElementById("times").innerHTML = hnum + "&nbsp小时&nbsp" + mnum + "&nbsp分&nbsp" + snum + "&nbsp秒";
    }
  
    update();
    setInterval(update, 1000);
  })();


  document
  .querySelector('#web_bg')
  .setAttribute('style', `background-image: ${document.querySelector('.banner').style.background.split(' ')[0]};position: fixed;width: 100%;height: 100%;z-index: -1;background-size: cover;`);

  document
  .querySelector("#banner")
  .setAttribute('style', 'background-image: url()')

  document
  .querySelector("#banner .mask")
  .setAttribute('style', 'background-color:rgba(0,0,0,0)')



  /*博客预加载 */
/*   $(function(){
    $("#Loadanimation").fadeOut(500);
 }); */


 $(window).on('load', function() {
  $("#Loadanimation").fadeOut(700);
});
