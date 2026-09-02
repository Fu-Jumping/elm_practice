import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerSuccessBannerF2}>
        <div className={styles.headerSuccessBannerF}>
          <div className={styles.margin}>
            <div className={styles.background}>
              <img
                src="../../../shared-assets/用户端/07-支付/03-支付成功/mppd7hba-tp96k21.svg"
                className={styles.container}
              />
            </div>
          </div>
          <p className={styles.text}>支付成功</p>
          <p className={styles.text2}>¥ 50.00</p>
        </div>
      </div>
      <div className={styles.orderSummaryCardFull2}>
        <div className={styles.orderSummaryCardFull}>
          <div className={styles.container2}>
            <p className={styles.text3}>订单编号</p>
            <p className={styles.text4}>ELM202310248888</p>
          </div>
          <div className={styles.container3}>
            <p className={styles.text3}>支付方式</p>
            <p className={styles.text5}>支付宝</p>
          </div>
          <div className={styles.container2}>
            <p className={styles.text3}>支付时间</p>
            <p className={styles.text4}>2023-10-24 12:30:05</p>
          </div>
        </div>
      </div>
      <div className={styles.bonusPromotionFullBl2}>
        <div className={styles.bonusPromotionFullBl}>
          <div className={styles.container5}>
            <img src="../../../shared-assets/用户端/07-支付/03-支付成功/mppd7hba-pssqfh6.svg" className={styles.overlay} />
            <div className={styles.container4}>
              <p className={styles.text6}>获得 10 积分</p>
              <p className={styles.text7}>下次下单可抵扣 ¥0.1</p>
            </div>
          </div>
          <div className={styles.button}>
            <p className={styles.text8}>查看积分</p>
          </div>
        </div>
      </div>
      <div className={styles.actionsFullBleedMarg}>
        <div className={styles.actionsFullBleed}>
          <div className={styles.button2}>
            <p className={styles.text9}>查看订单</p>
          </div>
          <p className={styles.text10}>回到首页</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
