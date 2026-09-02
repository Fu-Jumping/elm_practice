import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopNavigation}>
        <div className={styles.buttonBack}>
          <img src="../../../shared-assets/用户端/07-支付/04-支付失败/mppd7jjz-uitoy7a.svg" className={styles.container} />
        </div>
        <p className={styles.text}>支付失败</p>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.statusIconTitle}>
          <div className={styles.margin}>
            <div className={styles.background}>
              <img
                src="../../../shared-assets/用户端/07-支付/04-支付失败/mppd7jjz-2o7y8q3.svg"
                className={styles.container2}
              />
            </div>
          </div>
          <p className={styles.text2}>支付失败</p>
          <p className={styles.text3}>支付超时或余额不足，请尝试重新支付</p>
        </div>
        <div className={styles.orderDetailsCardMarg}>
          <div className={styles.orderDetailsCard}>
            <div className={styles.horizontalBorder}>
              <p className={styles.text3}>待支付金额</p>
              <p className={styles.text4}>¥38.90</p>
            </div>
            <div className={styles.container3}>
              <p className={styles.text5}>订单号</p>
              <p className={styles.text6}>1023 9485 2049 3921</p>
            </div>
          </div>
        </div>
        <div className={styles.actionButtons}>
          <div className={styles.button}>
            <p className={styles.text7}>重新支付</p>
          </div>
          <div className={styles.button2}>
            <p className={styles.text8}>联系客服</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
