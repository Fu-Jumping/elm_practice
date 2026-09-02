import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.simulatedAppBackgrou} />
      <div className={styles.backdropOverlayLevel}>
        <div className={styles.bottomSheetDrawerLev}>
          <div className={styles.handleAndCloseButton}>
            <div className={styles.background} />
            <div className={styles.frame}>
              <img
                src="../../../shared-assets/用户端/05-商品详情与购物车/01-商品详情弹层/mppd4lo2-r82ewys.svg"
                className={styles.container}
              />
            </div>
          </div>
          <div className={styles.container8}>
            <img
              src="../../../shared-assets/用户端/05-商品详情与购物车/01-商品详情弹层/mppd4lo4-er55ror.png"
              className={styles.productImage}
            />
            <div className={styles.productInfo}>
              <p className={styles.text}>香辣鸡腿堡</p>
              <p className={styles.text2}>
                经典香脆鸡腿肉，搭配新鲜生菜和特制沙拉酱，每一口都满
                <br />
                足。
              </p>
              <div className={styles.container2}>
                <p className={styles.text3}>月售 2000+</p>
                <p className={styles.text3}>好评度 98%</p>
              </div>
            </div>
            <div className={styles.horizontalDivider} />
            <div className={styles.specifications}>
              <p className={styles.text4}>辣度 (必选)</p>
              <div className={styles.container3}>
                <div className={styles.button}>
                  <p className={styles.text5}>中辣</p>
                </div>
                <div className={styles.button2}>
                  <p className={styles.text6}>微辣</p>
                </div>
                <div className={styles.button2}>
                  <p className={styles.text6}>不辣</p>
                </div>
              </div>
            </div>
            <div className={styles.addOns}>
              <p className={styles.text4}>加料 (可选)</p>
              <div className={styles.container4}>
                <div className={styles.autoWrapper}>
                  <div className={styles.button3}>
                    <p className={styles.text6}>芝士片</p>
                    <p className={styles.text7}>+￥2</p>
                  </div>
                  <div className={styles.button3}>
                    <p className={styles.text6}>培根</p>
                    <p className={styles.text7}>+￥3</p>
                  </div>
                </div>
                <div className={styles.button4}>
                  <p className={styles.text6}>双层鸡腿排</p>
                  <p className={styles.text7}>+￥8</p>
                </div>
              </div>
            </div>
            <div className={styles.bottomActionBar}>
              <div className={styles.container7}>
                <div className={styles.paragraph}>
                  <img
                    src="../../../shared-assets/用户端/05-商品详情与购物车/01-商品详情弹层/mppd4lo2-hno9u1k.svg"
                    className={styles.icon}
                  />
                  <p className={styles.text8}>18.00</p>
                </div>
                <div className={styles.quantityStepper}>
                  <div className={styles.buttonDecreaseQuanti}>
                    <img
                      src="../../../shared-assets/用户端/05-商品详情与购物车/01-商品详情弹层/mppd4lo2-i45ihku.svg"
                      className={styles.container5}
                    />
                  </div>
                  <p className={styles.text9}>1</p>
                  <div className={styles.buttonIncreaseQuanti}>
                    <img
                      src="../../../shared-assets/用户端/05-商品详情与购物车/01-商品详情弹层/mppd4lo2-dyampxi.svg"
                      className={styles.container6}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.button5}>
                <p className={styles.text10}>加入购物车</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
