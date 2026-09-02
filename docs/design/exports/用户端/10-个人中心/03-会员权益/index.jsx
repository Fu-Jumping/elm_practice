import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopAppBarSeman}>
        <div className={styles.button}>
          <img src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-str1joc.svg" className={styles.container} />
        </div>
        <p className={styles.text}>会员权益</p>
      </div>
      <div className={styles.main}>
        <div className={styles.sectionHeroMembershi}>
          <img
            src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-fdq5rtt.svg"
            className={styles.decorativeElement}
          />
          <div className={styles.container6}>
            <div className={styles.container4}>
              <div className={styles.heading2}>
                <p className={styles.text2}>饿了么超级会员</p>
                <img
                  src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-n3gucy8.svg"
                  className={styles.container2}
                />
              </div>
              <div className={styles.container3}>
                <p className={styles.text3}>当前状态：已开通</p>
              </div>
            </div>
            <div className={styles.container5}>
              <p className={styles.text4}>有效期至: 2024-12-31</p>
              <div className={styles.button2}>
                <p className={styles.text5}>立即续费</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.sectionBenefitsGrid}>
          <p className={styles.text6}>核心权益</p>
          <div className={styles.container11}>
            <div className={styles.benefit1}>
              <div className={styles.background}>
                <img
                  src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-d46m044.svg"
                  className={styles.container7}
                />
              </div>
              <p className={styles.text7}>专享红包</p>
            </div>
            <div className={styles.benefit2}>
              <div className={styles.background2}>
                <img
                  src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-8yo2hms.svg"
                  className={styles.container8}
                />
              </div>
              <p className={styles.text7}>免配送费</p>
            </div>
            <div className={styles.benefit3}>
              <div className={styles.background3}>
                <img
                  src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-3rz6avv.svg"
                  className={styles.container9}
                />
              </div>
              <p className={styles.text7}>积分加速</p>
            </div>
            <div className={styles.benefit4}>
              <div className={styles.background4}>
                <img
                  src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-1uzayhy.svg"
                  className={styles.container10}
                />
              </div>
              <p className={styles.text7}>专属优惠</p>
            </div>
          </div>
        </div>
        <div className={styles.sectionDetailsList}>
          <p className={styles.text6}>权益详情</p>
          <div className={styles.list}>
            <div className={styles.item}>
              <div className={styles.margin}>
                <div className={styles.overlay}>
                  <img
                    src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-d46m044.svg"
                    className={styles.container7}
                  />
                </div>
              </div>
              <div className={styles.container12}>
                <p className={styles.text8}>每月专享大额红包</p>
                <p className={styles.text9}>
                  每月可领取总价值最高100元的无门槛或满减红
                  <br />
                  包，点餐更省钱。
                </p>
              </div>
            </div>
            <div className={styles.item2}>
              <div className={styles.margin2}>
                <div className={styles.overlay2}>
                  <img
                    src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-mesr0pm.svg"
                    className={styles.container13}
                  />
                </div>
              </div>
              <div className={styles.container14}>
                <p className={styles.text8}>无限次免配送费特权</p>
                <p className={styles.text10}>
                  在指定超级会员商家下单，满足起送价即可享
                  <br />
                  受免配送费服务，多点多省。
                </p>
              </div>
            </div>
            <div className={styles.item3}>
              <div className={styles.margin3}>
                <div className={styles.overlay3}>
                  <img
                    src="../../../shared-assets/用户端/10-个人中心/03-会员权益/mppd7mut-s733ax7.svg"
                    className={styles.container15}
                  />
                </div>
              </div>
              <div className={styles.container14}>
                <p className={styles.text8}>吃货豆多倍累积</p>
                <p className={styles.text10}>
                  每笔订单可获得基础吃货豆外，超级会员额外
                  <br />
                  奖励50%吃货豆，加速兑换奖励。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
