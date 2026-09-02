import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame7}>
      <div className={styles.searchHeader}>
        <div className={styles.autoWrapper}>
          <div className={styles.frame2}>
            <div className={styles.frame}>
              <img
                src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-v1p8xnc.svg"
                className={styles.container}
              />
            </div>
          </div>
          <div className={styles.margin2}>
            <div className={styles.backgroundBorder}>
              <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-39xosg8.svg" className={styles.margin} />
              <p className={styles.text}>汉堡</p>
              <div className={styles.frame3}>
                <img
                  src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-0yw4qxt.svg"
                  className={styles.container2}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.container4}>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-ze4g322.svg" className={styles.container3} />
          <p className={styles.text2}>天津大学软件园校区</p>
        </div>
      </div>
      <div className={styles.filterBar}>
        <div className={styles.button}>
          <p className={styles.text3}>综合</p>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-t99ytxg.svg" className={styles.container5} />
        </div>
        <p className={styles.text4}>销量</p>
        <p className={styles.text4}>距离</p>
        <div className={styles.button2}>
          <p className={styles.text4}>筛选</p>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-0g96986.svg" className={styles.container6} />
        </div>
      </div>
      <div className={styles.mainContentResultsLi}>
        <div className={styles.container11}>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkj-toms1sc.png" className={styles.frame4} />
          <div className={styles.container10}>
            <div className={styles.container8}>
              <p className={styles.text5}>老王小店</p>
              <div className={styles.container7}>
                <p className={styles.text6}>4.8</p>
                <p className={styles.text7}>月售 5000+</p>
                <p className={styles.text8}>30分钟 | 800m</p>
              </div>
            </div>
            <p className={styles.text9}>起送 ¥20 | 配送费 ¥0</p>
            <div className={styles.container9}>
              <div className={styles.background}>
                <p className={styles.text10}>满30减10</p>
              </div>
              <div className={styles.background2}>
                <p className={styles.text11}>免配送费</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.articleResultCard2Kf}>
          <div className={styles.container16}>
            <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkj-gqf12nl.png" className={styles.frame4} />
            <div className={styles.container15}>
              <div className={styles.container13}>
                <p className={styles.text5}>肯德基</p>
                <div className={styles.container12}>
                  <p className={styles.text6}>4.9</p>
                  <p className={styles.text7}>月售 10000+</p>
                  <p className={styles.text12}>25分钟 | 500m</p>
                </div>
              </div>
              <p className={styles.text9}>起送 ¥20 | 配送费 ¥5</p>
              <div className={styles.container14}>
                <div className={styles.background}>
                  <p className={styles.text10}>满50减15</p>
                </div>
                <div className={styles.border}>
                  <p className={styles.text13}>品牌</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.specificItemsList}>
            <div className={styles.container18}>
              <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkj-8lbfkvm.png" className={styles.frame5} />
              <div className={styles.container17}>
                <p className={styles.text14}>香辣鸡腿堡</p>
                <p className={styles.text15}>¥19</p>
              </div>
            </div>
            <div className={styles.frame6}>
              <img
                src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkg-ky50hlb.svg"
                className={styles.container19}
              />
            </div>
          </div>
        </div>
        <div className={styles.container23}>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/02-商家列表搜索结果/mppd3tkj-a3odvdz.png" className={styles.frame4} />
          <div className={styles.container22}>
            <div className={styles.container21}>
              <p className={styles.text5}>麦当劳</p>
              <div className={styles.container20}>
                <p className={styles.text6}>4.7</p>
                <p className={styles.text7}>月售 8000+</p>
                <div className={styles.margin3}>
                  <p className={styles.text16}>35分钟 | 1.2km</p>
                </div>
              </div>
            </div>
            <p className={styles.text9}>起送 ¥20 | 配送费 ¥4</p>
            <div className={styles.container14}>
              <div className={styles.background}>
                <p className={styles.text10}>满40减12</p>
              </div>
              <div className={styles.border}>
                <p className={styles.text13}>品牌</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
