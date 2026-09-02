import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopNavigation}>
        <div className={styles.buttonMargin}>
          <div className={styles.button}>
            <img src="../../../shared-assets/用户端/07-支付/01-收银台/mppd7fsl-xnsp3wn.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>CampusBites</p>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.bottomActionArea}>
          <div className={styles.button2}>
            <p className={styles.text2}>立即支付</p>
          </div>
        </div>
        <div className={styles.sectionPaymentAmount}>
          <p className={styles.text3}>支付剩余时间</p>
          <div className={styles.container3}>
            <img
              src="../../../shared-assets/用户端/07-支付/01-收银台/mppd7fsl-qfbo7zj.svg"
              className={styles.container2}
            />
            <p className={styles.text4}>14:58</p>
          </div>
          <p className={styles.text5}>订单金额</p>
          <p className={styles.text6}>¥ 45.00</p>
          <p className={styles.text7}>订单号：20231024883921</p>
        </div>
        <div className={styles.section}>
          <div className={styles.horizontalBorder}>
            <p className={styles.text8}>订单详情</p>
          </div>
          <div className={styles.container9}>
            <div className={styles.container4}>
              <p className={styles.text9}>商家</p>
              <p className={styles.text10}>麦当劳 (校园店)</p>
            </div>
            <div className={styles.container5}>
              <p className={styles.text9}>订单编号</p>
              <p className={styles.text11}>20231024883921</p>
            </div>
            <div className={styles.container5}>
              <p className={styles.text9}>下单时间</p>
              <p className={styles.text11}>2023-10-24 12:00</p>
            </div>
            <div className={styles.container8}>
              <p className={styles.text9}>收货地址</p>
              <div className={styles.container7}>
                <div className={styles.container6}>
                  <p className={styles.text12}>12号楼 304室</p>
                </div>
                <div className={styles.container6}>
                  <p className={styles.text12}>张同学 (先生) 138****5678</p>
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
