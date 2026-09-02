import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContent}>
        <div className={styles.container}>
          <p className={styles.text}>常见问题解答</p>
          <p className={styles.text2}>
            请查看以下常见问题，如果您的问题没有得到解
            <br />
            决，可以联系在线客服。
          </p>
        </div>
        <div className={styles.fAqAccordion}>
          <div className={styles.button}>
            <p className={styles.text3}>如何修改收货地址?</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-4ra1kfo.svg"
              className={styles.container2}
            />
          </div>
          <div className={styles.button}>
            <p className={styles.text3}>优惠券如何使用?</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-4ra1kfo.svg"
              className={styles.container2}
            />
          </div>
          <div className={styles.button}>
            <p className={styles.text3}>如何申请退款?</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-4ra1kfo.svg"
              className={styles.container2}
            />
          </div>
          <div className={styles.button}>
            <p className={styles.text3}>配送超时怎么办?</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-4ra1kfo.svg"
              className={styles.container2}
            />
          </div>
          <div className={styles.question5Button}>
            <p className={styles.text3}>如何联系客服?</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-4ra1kfo.svg"
              className={styles.container2}
            />
          </div>
        </div>
        <div className={styles.contactSupportCta}>
          <p className={styles.text4}>没有找到您的问题？</p>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-jhufh9y.svg"
              className={styles.container3}
            />
            <p className={styles.text5}>联系在线客服</p>
          </div>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.buttonMargin}>
          <div className={styles.button3}>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/04-常见问题/mppd80df-u71xstx.svg"
              className={styles.container4}
            />
          </div>
        </div>
        <p className={styles.text6}>常见问题</p>
      </div>
    </div>
  );
}

export default Component;
