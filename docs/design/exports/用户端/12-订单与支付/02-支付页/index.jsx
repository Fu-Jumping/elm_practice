import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.htmlBody}>
      <div className={styles.headerTopNavigation}>
        <div className={styles.buttonMargin}>
          <div className={styles.button}>
            <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwn-arv2qim.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>CampusBites</p>
      </div>
      <div className={styles.backgroundHorizontal}>
        <div className={styles.overlay}>
          <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwm-qz5j8ep.svg" className={styles.container2} />
          <div className={styles.container3}>
            <p className={styles.text2}>支付剩余时间</p>
          </div>
        </div>
        <p className={styles.text3}>14:59</p>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.section}>
          <div className={styles.horizontalBorder}>
            <div className={styles.container4}>
              <p className={styles.text4}>订单详情</p>
            </div>
            <div className={styles.button2}>
              <p className={styles.text5}>取消订单</p>
            </div>
          </div>
          <div className={styles.horizontalBorder2}>
            <div className={styles.container8}>
              <div className={styles.container6}>
                <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwq-gw1bxo2.png" className={styles.frame} />
                <div className={styles.container5}>
                  <p className={styles.text6}>麦辣鸡腿汉堡</p>
                  <p className={styles.text7}>x1</p>
                </div>
              </div>
              <div className={styles.container7}>
                <p className={styles.text8}>¥19.90</p>
              </div>
            </div>
            <div className={styles.container11}>
              <div className={styles.container10}>
                <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwq-fs8oiq7.png" className={styles.frame} />
                <div className={styles.container9}>
                  <p className={styles.text9}>香脆薯条 (中)</p>
                  <p className={styles.text10}>x1</p>
                </div>
              </div>
              <div className={styles.container7}>
                <p className={styles.text8}>¥11.50</p>
              </div>
            </div>
            <div className={styles.container14}>
              <div className={styles.container13}>
                <img src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwq-18sahfk.png" className={styles.frame} />
                <div className={styles.container12}>
                  <p className={styles.text11}>冰可口可乐 (大)</p>
                  <p className={styles.text12}>x1</p>
                </div>
              </div>
              <div className={styles.container7}>
                <p className={styles.text8}>¥9.00</p>
              </div>
            </div>
          </div>
          <div className={styles.horizontalBorder4}>
            <div className={styles.container15}>
              <p className={styles.text13}>商品小计</p>
              <p className={styles.text14}>¥40.40</p>
            </div>
            <div className={styles.container15}>
              <p className={styles.text13}>打包费</p>
              <p className={styles.text14}>¥2.00</p>
            </div>
            <div className={styles.container15}>
              <p className={styles.text13}>配送费</p>
              <p className={styles.text14}>¥3.50</p>
            </div>
            <div className={styles.container16}>
              <p className={styles.text13}>满减优惠</p>
              <p className={styles.text15}>-¥5.00</p>
            </div>
            <div className={styles.container16}>
              <p className={styles.text13}>红包优惠</p>
              <p className={styles.text15}>-¥2.00</p>
            </div>
            <div className={styles.margin}>
              <div className={styles.horizontalBorder3}>
                <p className={styles.text16}>实付金额</p>
                <div className={styles.container17}>
                  <p className={styles.text17}>¥</p>
                  <p className={styles.text18}>38.90</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.container28}>
            <div className={styles.container19}>
              <div className={styles.container18}>
                <p className={styles.text19}>商家</p>
              </div>
              <p className={styles.text20}>麦当劳 (校园店)</p>
            </div>
            <div className={styles.container23}>
              <div className={styles.container18}>
                <p className={styles.text19}>订单编号</p>
              </div>
              <div className={styles.container22}>
                <div className={styles.container20}>
                  <p className={styles.text21}>20231024883921</p>
                </div>
                <div className={styles.button3}>
                  <img
                    src="../../../shared-assets/用户端/12-订单与支付/02-支付页/28_2-mtwfhnwn-gyu7cl6.svg"
                    className={styles.container21}
                  />
                </div>
              </div>
            </div>
            <div className={styles.container25}>
              <div className={styles.container18}>
                <p className={styles.text19}>下单时间</p>
              </div>
              <div className={styles.container24}>
                <p className={styles.text22}>2023-10-24 12:00</p>
              </div>
            </div>
            <div className={styles.container27}>
              <p className={styles.text23}>收货地址</p>
              <div className={styles.container26}>
                <p className={styles.text14}>12号楼 304室</p>
                <p className={styles.text24}>张同学 (先生) 138****5678</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.container30}>
          <div className={styles.container29}>
            <p className={styles.text25}>立即支付</p>
            <p className={styles.text26}>¥</p>
            <p className={styles.text27}>38.90</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
