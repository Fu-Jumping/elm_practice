import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopNavigation}>
        <div className={styles.buttonMargin}>
          <div className={styles.button}>
            <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/26_170-mtwdo453-jvhinyk.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>CampusBites</p>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.container2}>
          <div className={styles.button2}>
            <p className={styles.text2}>立即支付</p>
          </div>
        </div>
        <div className={styles.sectionPaymentAmount}>
          <p className={styles.text3}>支付剩余时间</p>
          <div className={styles.container4}>
            <img
              src="../../../shared-assets/用户端/12-订单与支付/02-支付页/26_170-mtwdo453-fj1i1rv.svg"
              className={styles.container3}
            />
            <p className={styles.text4}>14:59</p>
          </div>
          <p className={styles.text5}>订单金额</p>
          <p className={styles.text6}>¥ 45.00</p>
          <p className={styles.text7}>订单号：20231024883921</p>
        </div>
        <div className={styles.section}>
          <div className={styles.horizontalBorder}>
            <p className={styles.text8}>订单详情</p>
            <p className={styles.text9}>取消订单</p>
          </div>
          <div className={styles.container10}>
            <div className={styles.container5}>
              <p className={styles.text10}>商家</p>
              <p className={styles.text11}>麦当劳 (校园店)</p>
            </div>
            <div className={styles.container6}>
              <p className={styles.text10}>订单编号</p>
              <p className={styles.text12}>20231024883921</p>
            </div>
            <div className={styles.container6}>
              <p className={styles.text10}>下单时间</p>
              <p className={styles.text12}>2023-10-24 12:00</p>
            </div>
            <div className={styles.container9}>
              <p className={styles.text10}>收货地址</p>
              <div className={styles.container8}>
                <p className={styles.text13}>12号楼 304室</p>
                <div className={styles.container7}>
                  <p className={styles.text14}>张同学 (先生) 138****5678</p>
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
