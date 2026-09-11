import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.htmlBody}>
      <div className={styles.overlayOverlayBlur}>
        <div className={styles.background}>
          <div className={styles.overlayShadow}>
            <div className={styles.container2}>
              <p className={styles.text}>取消订单</p>
              <div className={styles.button}>
                <img
                  src="../../../shared-assets/用户端/12-订单与支付/03-取消确认弹窗/27_2-mtweqrxc-5mx1uge.svg"
                  className={styles.container}
                />
              </div>
            </div>
            <div className={styles.container3}>
              <div className={styles.button2}>
                <p className={styles.text2}>再想想</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.headerTopNavigation}>
          <div className={styles.buttonMargin}>
            <div className={styles.button3}>
              <img
                src="../../../shared-assets/用户端/12-订单与支付/03-取消确认弹窗/27_2-mtweqrxc-gvbldon.svg"
                className={styles.container4}
              />
            </div>
          </div>
          <p className={styles.text3}>CampusBites</p>
        </div>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.bottomActionArea}>
          <div className={styles.button4}>
            <p className={styles.text4}>立即支付</p>
          </div>
        </div>
        <div className={styles.sectionPaymentAmount}>
          <p className={styles.text5}>支付剩余时间</p>
          <div className={styles.container6}>
            <img
              src="../../../shared-assets/用户端/12-订单与支付/03-取消确认弹窗/27_2-mtweqrxc-0g8u0i7.svg"
              className={styles.container5}
            />
            <p className={styles.text6}>14:59</p>
          </div>
          <p className={styles.text7}>订单金额</p>
          <p className={styles.text8}>¥ 45.00</p>
          <p className={styles.text9}>订单号：20231024883921</p>
        </div>
        <div className={styles.section}>
          <div className={styles.horizontalBorder}>
            <p className={styles.text10}>订单详情</p>
          </div>
          <div className={styles.container12}>
            <div className={styles.container7}>
              <p className={styles.text11}>商家</p>
              <p className={styles.text12}>麦当劳 (校园店)</p>
            </div>
            <div className={styles.container8}>
              <p className={styles.text11}>订单编号</p>
              <p className={styles.text13}>20231024883921</p>
            </div>
            <div className={styles.container8}>
              <p className={styles.text11}>下单时间</p>
              <p className={styles.text13}>2023-10-24 12:00</p>
            </div>
            <div className={styles.container11}>
              <p className={styles.text11}>收货地址</p>
              <div className={styles.container10}>
                <p className={styles.text14}>12号楼 304室</p>
                <div className={styles.container9}>
                  <p className={styles.text15}>张同学 (先生) 138****5678</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
