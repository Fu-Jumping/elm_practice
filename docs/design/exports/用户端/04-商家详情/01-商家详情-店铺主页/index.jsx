import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopAppBar}>
        <div className={styles.container2}>
          <img src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-hlhjzwi.svg" className={styles.container} />
        </div>
        <p className={styles.text}>饿了么</p>
        <div className={styles.container4}>
          <img src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-8u0xjif.svg" className={styles.container3} />
        </div>
      </div>
      <div className={styles.merchantHeaderBanner}>
        <img src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42st-nq7f2vh.png" className={styles.image} />
        <div className={styles.container12}>
          <div className={styles.container5}>
            <div className={styles.backgroundBorderShad}>
              <img
                src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42st-frvk12e.png"
                className={styles.kFcLogoPlaceholder}
              />
            </div>
            <p className={styles.text2}>肯德基 (校园二餐店)</p>
          </div>
          <div className={styles.container11}>
            <div className={styles.container8}>
              <div className={styles.container7}>
                <img
                  src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-feiip3x.svg"
                  className={styles.container6}
                />
                <p className={styles.text3}>4.8</p>
              </div>
              <p className={styles.text4}>月售 8000+</p>
              <p className={styles.text5}>|</p>
              <p className={styles.text6}>约30分钟</p>
            </div>
            <div className={styles.container9}>
              <p className={styles.text4}>起送 ¥15</p>
              <p className={styles.text4}>配送 ¥2</p>
            </div>
            <div className={styles.promotionalTags}>
              <div className={styles.backgroundBorder}>
                <p className={styles.text7}>满50减10</p>
              </div>
              <div className={styles.backgroundBorder2}>
                <p className={styles.text8}>新客立减5</p>
              </div>
              <div className={styles.border}>
                <img
                  src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-qkiay0t.svg"
                  className={styles.container10}
                />
                <p className={styles.text9}>领券</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.tabBar}>
          <div className={styles.container13}>
            <p className={styles.text10}>点餐</p>
            <div className={styles.horizontalDivider} />
          </div>
          <p className={styles.text11}>评价</p>
        </div>
      </div>
      <div className={styles.mainContentContainer}>
        <div className={styles.list}>
          <div className={styles.item}>
            <div className={styles.overlayShadow} />
            <p className={styles.text12}>热销</p>
          </div>
          <p className={styles.text13}>汉堡</p>
          <p className={styles.text13}>小食</p>
          <p className={styles.text13}>饮品</p>
          <p className={styles.text13}>超值套餐</p>
        </div>
        <div className={styles.rightContentCanvas}>
          <div className={styles.heading2Margin}>
            <div className={styles.heading2}>
              <p className={styles.text14}>热销</p>
            </div>
          </div>
          <div className={styles.productItem1}>
            <div className={styles.burger}>
              <div className={styles.background}>
                <p className={styles.text15}>热卖</p>
              </div>
            </div>
            <div className={styles.container17}>
              <div className={styles.container14}>
                <p className={styles.text16}>香辣鸡腿堡</p>
                <p className={styles.text17}>经典香脆，辣味十足</p>
                <p className={styles.text18}>月售 1200+ · 好评率 98%</p>
              </div>
              <div className={styles.container16}>
                <div className={styles.paragraph}>
                  <p className={styles.text19}>¥</p>
                  <p className={styles.text20}>19.9</p>
                </div>
                <div className={styles.button}>
                  <img
                    src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-rjyqf6z.svg"
                    className={styles.container15}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.backgroundHorizontal}>
          <div className={styles.cartIconBadgeMargin}>
            <div className={styles.cartIconBadge}>
              <div className={styles.cartIconBadgeShadow}>
                <img
                  src="../../../shared-assets/用户端/04-商家详情/01-商家详情-店铺主页/mppd42sq-wkcivyh.svg"
                  className={styles.container18}
                />
                <div className={styles.backgroundBorder3}>
                  <p className={styles.text21}>2</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.priceInfo}>
            <p className={styles.text22}>¥ 19.9</p>
            <p className={styles.text23}>另需配送费 ¥2</p>
          </div>
          <div className={styles.actionButton}>
            <p className={styles.text24}>去结算</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
