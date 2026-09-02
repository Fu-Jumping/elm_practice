import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame5}>
      <div className={styles.headerTopAppBar}>
        <div className={styles.frame2}>
          <div className={styles.frame}>
            <img src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-g4h2drc.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>评价订单</p>
      </div>
      <div className={styles.footerStickyPrimaryB}>
        <div className={styles.button}>
          <p className={styles.text2}>提交评价</p>
        </div>
      </div>
      <div className={styles.mainContentCanvas}>
        <div className={styles.sectionHeaderRestaur}>
          <div className={styles.margin}>
            <div className={styles.border}>
              <img src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6h-p5cr670.png" className={styles.frame3} />
            </div>
          </div>
          <p className={styles.text3}>肯德基</p>
          <p className={styles.text4}>为本次服务打分</p>
          <div className={styles.a5StarRating}>
            <img
              src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-21dugg4.svg"
              className={styles.container2}
            />
            <img
              src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-21dugg4.svg"
              className={styles.container2}
            />
            <img
              src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-21dugg4.svg"
              className={styles.container2}
            />
            <img
              src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-21dugg4.svg"
              className={styles.container2}
            />
            <img
              src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-21dugg4.svg"
              className={styles.container2}
            />
          </div>
          <p className={styles.text5}>非常好</p>
          <div className={styles.margin2}>
            <div className={styles.container5}>
              <div className={styles.container4}>
                <div className={styles.backgroundBorder}>
                  <img
                    src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6h-sm2rcrp.png"
                    className={styles.frame4}
                  />
                </div>
                <div className={styles.container3}>
                  <p className={styles.text6}>香辣脆皮鸡腿堡</p>
                  <p className={styles.x1}>x1</p>
                </div>
              </div>
              <div className={styles.container4}>
                <div className={styles.backgroundBorder}>
                  <img
                    src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6h-5jvsw8x.png"
                    className={styles.frame4}
                  />
                </div>
                <div className={styles.container3}>
                  <p className={styles.text6}>薯条(中)</p>
                  <p className={styles.x1}>x1</p>
                </div>
              </div>
              <div className={styles.container4}>
                <div className={styles.backgroundBorder}>
                  <img
                    src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6h-hzxevqg.png"
                    className={styles.frame4}
                  />
                </div>
                <div className={styles.container3}>
                  <p className={styles.text6}>可乐(大)</p>
                  <p className={styles.x1}>x1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.tagsSection}>
          <p className={styles.text7}>评价标签</p>
          <div className={styles.container6}>
            <div className={styles.button2}>
              <p className={styles.text8}>配送快</p>
            </div>
            <div className={styles.button3}>
              <p className={styles.text4}>味道好</p>
            </div>
            <div className={styles.button3}>
              <p className={styles.text4}>包装完整</p>
            </div>
            <div className={styles.button3}>
              <p className={styles.text4}>分量足</p>
            </div>
          </div>
        </div>
        <div className={styles.sectionCommentArea}>
          <div className={styles.container7}>
            <p className={styles.text9}>说说本次用餐体验，分享给更多想吃的朋友吧</p>
          </div>
          <div className={styles.imageUploadPlacehold}>
            <div className={styles.border2}>
              <img
                src="../../../shared-assets/用户端/08-评价/01-评价订单/mppd4t6f-8antlee.svg"
                className={styles.container8}
              />
              <p className={styles.text10}>添加图片</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
