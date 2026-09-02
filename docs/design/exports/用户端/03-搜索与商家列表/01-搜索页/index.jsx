import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame5}>
      <div className={styles.headerSearchBar}>
        <div className={styles.frame}>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/01-搜索页/mppd40zj-5z8iimm.svg" className={styles.container} />
        </div>
        <div className={styles.background}>
          <img src="../../../shared-assets/用户端/03-搜索与商家列表/01-搜索页/mppd40zj-finploo.svg" className={styles.margin} />
          <div className={styles.container2}>
            <p className={styles.text}>搜索商家、商品名称</p>
          </div>
        </div>
        <p className={styles.text2}>搜索</p>
      </div>
      <div className={styles.main}>
        <div className={styles.frame3}>
          <div className={styles.container4}>
            <p className={styles.text3}>最近搜索</p>
            <div className={styles.frame2}>
              <img
                src="../../../shared-assets/用户端/03-搜索与商家列表/01-搜索页/mppd40zi-8rzw6wh.svg"
                className={styles.container3}
              />
            </div>
          </div>
          <div className={styles.container5}>
            <div className={styles.background2}>
              <p className={styles.text4}>肯德基</p>
            </div>
            <div className={styles.background2}>
              <p className={styles.text4}>麦当劳</p>
            </div>
            <div className={styles.background2}>
              <p className={styles.text4}>汉堡</p>
            </div>
            <div className={styles.background2}>
              <p className={styles.text4}>披萨</p>
            </div>
          </div>
        </div>
        <div className={styles.frame4}>
          <p className={styles.text5}>热门搜索</p>
          <div className={styles.container6}>
            <div className={styles.autoWrapper}>
              <div className={styles.item1}>
                <p className={styles.text6}>1</p>
                <p className={styles.text7}>麻辣烫</p>
                <div className={styles.margin2}>
                  <div className={styles.background3}>
                    <p className={styles.text8}>HOT</p>
                  </div>
                </div>
              </div>
              <div className={styles.item2}>
                <p className={styles.text9}>2</p>
                <p className={styles.text7}>奶茶</p>
              </div>
            </div>
            <div className={styles.autoWrapper2}>
              <div className={styles.item3}>
                <p className={styles.text10}>3</p>
                <p className={styles.text7}>烧烤</p>
                <div className={styles.margin2}>
                  <div className={styles.background3}>
                    <p className={styles.text8}>HOT</p>
                  </div>
                </div>
              </div>
              <div className={styles.item4}>
                <p className={styles.text11}>4</p>
                <p className={styles.text7}>炸鸡</p>
              </div>
            </div>
            <div className={styles.autoWrapper3}>
              <div className={styles.item4}>
                <p className={styles.text11}>5</p>
                <p className={styles.text7}>寿司</p>
              </div>
              <div className={styles.item4}>
                <p className={styles.text11}>6</p>
                <p className={styles.text7}>饺子</p>
              </div>
            </div>
            <div className={styles.autoWrapper3}>
              <div className={styles.item4}>
                <p className={styles.text11}>7</p>
                <p className={styles.text7}>面条</p>
              </div>
              <div className={styles.item4}>
                <p className={styles.text11}>8</p>
                <p className={styles.text7}>沙拉</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.bottomPromotionalBan}>
        <div className={styles.background4}>
          <div className={styles.container7}>
            <p className={styles.text12}>配送优惠</p>
            <p className={styles.text13}>今日最高立减50%</p>
          </div>
          <div className={styles.overlayOverlayBlur}>
            <img
              src="../../../shared-assets/用户端/03-搜索与商家列表/01-搜索页/mppd40zj-vzyhx2h.svg"
              className={styles.container8}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
