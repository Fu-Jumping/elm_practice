import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopNavigation}>
        <div className={styles.buttonMargin}>
          <div className={styles.button}>
            <img src="../../../shared-assets/用户端/06-订单/02-订单详情/mppd7eb3-cgt07qm.svg" className={styles.container} />
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
          <div className={styles.horizontalBorder}>
            <p className={styles.text3}>订单详情</p>
          </div>
          <div className={styles.container10}>
            <div className={styles.orderedItems}>
              <div className={styles.container2}>
                <p className={styles.text4}>巨无霸汉堡套餐 x1</p>
                <p className={styles.text5}>¥ 35.00</p>
              </div>
              <div className={styles.container3}>
                <p className={styles.text5}>麦乐鸡块 (5块装) x1</p>
                <p className={styles.text5}>¥ 15.00</p>
              </div>
            </div>
            <div className={styles.deliveryInfo}>
              <div className={styles.container4}>
                <p className={styles.text6}>商家</p>
                <p className={styles.text7}>麦当劳 (校园店)</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>订单编号</p>
                <p className={styles.text8}>20231024883921</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>下单时间</p>
                <p className={styles.text8}>2023-10-24 12:00</p>
              </div>
              <div className={styles.container8}>
                <p className={styles.text6}>收货地址</p>
                <div className={styles.container7}>
                  <div className={styles.container6}>
                    <p className={styles.text5}>12号楼 304室</p>
                  </div>
                  <p className={styles.text9}>张同学 (先生) 138****5678</p>
                </div>
              </div>
            </div>
            <div className={styles.priceBreakdown}>
              <div className={styles.container5}>
                <p className={styles.text6}>商品小计</p>
                <p className={styles.text8}>¥ 50.00</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>包装费</p>
                <p className={styles.text8}>¥ 2.00</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>配送费</p>
                <p className={styles.text8}>¥ 3.00</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text6}>满减优惠</p>
                <p className={styles.text10}>-¥ 10.00</p>
              </div>
            </div>
            <div className={styles.container4}>
              <p className={styles.text6}>订单备注</p>
              <p className={styles.text7}>口味：少辣，不要香菜</p>
            </div>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.horizontalBorder}>
            <p className={styles.text3}>订单详情</p>
          </div>
          <div className={styles.container10}>
            <div className={styles.orderedItems}>
              <div className={styles.container2}>
                <p className={styles.text4}>巨无霸汉堡套餐 x1</p>
                <p className={styles.text5}>¥ 35.00</p>
              </div>
              <div className={styles.container3}>
                <p className={styles.text5}>麦乐鸡块 (5块装) x1</p>
                <p className={styles.text5}>¥ 15.00</p>
              </div>
            </div>
            <div className={styles.deliveryInfo}>
              <div className={styles.container4}>
                <p className={styles.text6}>商家</p>
                <p className={styles.text7}>麦当劳 (校园店)</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>订单编号</p>
                <p className={styles.text8}>20231024883921</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>下单时间</p>
                <p className={styles.text8}>2023-10-24 12:00</p>
              </div>
              <div className={styles.container8}>
                <p className={styles.text6}>收货地址</p>
                <div className={styles.container7}>
                  <div className={styles.container6}>
                    <p className={styles.text5}>12号楼 304室</p>
                  </div>
                  <p className={styles.text9}>张同学 (先生) 138****5678</p>
                </div>
              </div>
            </div>
            <div className={styles.priceBreakdown}>
              <div className={styles.container5}>
                <p className={styles.text6}>商品小计</p>
                <p className={styles.text8}>¥ 50.00</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>包装费</p>
                <p className={styles.text8}>¥ 2.00</p>
              </div>
              <div className={styles.container5}>
                <p className={styles.text6}>配送费</p>
                <p className={styles.text8}>¥ 3.00</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text6}>满减优惠</p>
                <p className={styles.text10}>-¥ 10.00</p>
              </div>
            </div>
            <div className={styles.container4}>
              <p className={styles.text6}>订单备注</p>
              <p className={styles.text7}>口味：少辣，不要香菜</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
