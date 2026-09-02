import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentCanvas}>
        <div className={styles.couponList}>
          <div className={styles.modernFlatCard1}>
            <div className={styles.overlayVerticalBorde}>
              <div className={styles.paragraph}>
                <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-whfcjkz.svg" className={styles.icon} />
                <p className={styles.text}>8</p>
              </div>
              <p className={styles.text2}>满30可用</p>
            </div>
            <div className={styles.container3}>
              <div className={styles.container2}>
                <div className={styles.container}>
                  <div className={styles.background}>
                    <p className={styles.text3}>全平台</p>
                  </div>
                  <p className={styles.text4}>通用红包</p>
                </div>
                <p className={styles.text5}>限非外卖配送订单使用</p>
              </div>
              <p className={styles.text6}>今天 23:59 到期</p>
            </div>
          </div>
          <div className={styles.modernFlatCard2}>
            <div className={styles.overlayVerticalBorde2}>
              <div className={styles.paragraph2}>
                <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-whfcjkz.svg" className={styles.icon} />
                <p className={styles.text}>5</p>
              </div>
              <p className={styles.text2}>满25可用</p>
            </div>
            <div className={styles.container6}>
              <div className={styles.container5}>
                <div className={styles.container4}>
                  <div className={styles.overlayBorder}>
                    <p className={styles.text7}>商家</p>
                  </div>
                  <p className={styles.text4}>麦当劳专属红包</p>
                </div>
                <p className={styles.text5}>限麦当劳（大学城店）可用</p>
              </div>
              <p className={styles.text6}>还剩 3 天</p>
            </div>
          </div>
          <div className={styles.modernFlatCard3}>
            <div className={styles.overlayVerticalBorde3}>
              <div className={styles.paragraph3}>
                <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-whfcjkz.svg" className={styles.icon} />
                <p className={styles.text}>12</p>
              </div>
              <p className={styles.text2}>满50可用</p>
            </div>
            <div className={styles.container6}>
              <div className={styles.container5}>
                <div className={styles.container4}>
                  <div className={styles.overlayBorder}>
                    <p className={styles.text7}>品类</p>
                  </div>
                  <p className={styles.text4}>下午茶狂欢红包</p>
                </div>
                <p className={styles.text5}>限奶茶、甜品品类可用</p>
              </div>
              <p className={styles.text6}>还剩 5 天</p>
            </div>
          </div>
        </div>
        <p className={styles.text8}>没有更多可用红包了</p>
        <div className={styles.tabs}>
          <div className={styles.button}>
            <p className={styles.text9}>可用红包 (4)</p>
            <div className={styles.background2} />
          </div>
          <p className={styles.text10}>已失效</p>
        </div>
        <div className={styles.headerTopAppBar}>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-qj1csq5.svg"
              className={styles.container7}
            />
          </div>
          <p className={styles.text11}>红包</p>
        </div>
      </div>
      <div className={styles.nav}>
        <div className={styles.button3}>
          <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-uozobf6.svg" className={styles.icon2} />
          <p className={styles.text12}>首页</p>
        </div>
        <div className={styles.button4}>
          <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-jc44hh2.svg" className={styles.icon3} />
          <p className={styles.text12}>消息</p>
        </div>
        <div className={styles.button5}>
          <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-37kfpmt.svg" className={styles.icon4} />
          <p className={styles.text12}>订单</p>
        </div>
        <div className={styles.button6}>
          <img src="../../../shared-assets/用户端/10-个人中心/04-红包/mppd7u3l-psm3duf.svg" className={styles.container7} />
          <p className={styles.text3}>我的</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
