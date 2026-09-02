import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.bottomNavBar}>
        <div className={styles.linkHome}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-qdwi8hs.svg" className={styles.margin} />
          <p className={styles.text}>首页</p>
        </div>
        <div className={styles.linkMessages}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-03wt4d5.svg" className={styles.margin2} />
          <p className={styles.text}>消息</p>
        </div>
        <div className={styles.linkOrdersActive}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-j8zhk4n.svg" className={styles.margin3} />
          <p className={styles.text2}>订单</p>
        </div>
        <div className={styles.linkProfile}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-9nhiyw6.svg" className={styles.margin4} />
          <p className={styles.text}>我的</p>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.container}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-cnvixia.svg" className={styles.margin4} />
        </div>
        <p className={styles.text3}>饿了么</p>
        <div className={styles.container3}>
          <img src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-tx07aln.svg" className={styles.container2} />
        </div>
      </div>
      <div className={styles.mainContentCanvas}>
        <div className={styles.list}>
          <div className={styles.item}>
            <p className={styles.text4}>全部</p>
          </div>
          <p className={styles.text5}>待支付</p>
          <p className={styles.text5}>进行中</p>
          <p className={styles.text5}>已完成</p>
          <p className={styles.text5}>待评价</p>
        </div>
        <div className={styles.orderList}>
          <div className={styles.orderCard1Completed}>
            <div className={styles.container6}>
              <div className={styles.container5}>
                <div className={styles.background}>
                  <img
                    src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-64anwhl.png"
                    className={styles.restaurantLogo}
                  />
                </div>
                <p className={styles.text6}>香飘飘黄焖鸡米饭 (北区店)</p>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-vqqv26r.svg"
                  className={styles.container4}
                />
              </div>
              <p className={styles.text7}>订单已完成</p>
            </div>
            <div className={styles.container10}>
              <div className={styles.container7}>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-6yh7d5q.png"
                  className={styles.productThumbnail}
                />
              </div>
              <div className={styles.container8}>
                <p className={styles.text8}>经典黄焖鸡米饭大份 + 冰红茶</p>
                <p className={styles.a202310251230}>2023-10-25 12:30</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text9}>¥24.50</p>
                <p className={styles.text7}>共2件</p>
              </div>
            </div>
            <div className={styles.container11}>
              <div className={styles.button}>
                <p className={styles.text6}>再来一单</p>
              </div>
              <div className={styles.button2}>
                <p className={styles.text4}>去评价</p>
              </div>
            </div>
          </div>
          <div className={styles.orderCard2InProgress}>
            <div className={styles.container12}>
              <div className={styles.container5}>
                <div className={styles.background}>
                  <img
                    src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-ox2lm0u.png"
                    className={styles.restaurantLogo}
                  />
                </div>
                <p className={styles.text6}>味千拉面 (南门广场)</p>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-vqqv26r.svg"
                  className={styles.container4}
                />
              </div>
              <p className={styles.text10}>配送中</p>
            </div>
            <div className={styles.container10}>
              <div className={styles.container7}>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-1bm88r0.png"
                  className={styles.productThumbnail}
                />
              </div>
              <div className={styles.container8}>
                <p className={styles.text8}>招牌猪骨汤拉面 + 煎饺(3只)</p>
                <p className={styles.a202310251230}>预计 18:45 送达</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text9}>¥38.00</p>
                <p className={styles.text7}>共2件</p>
              </div>
            </div>
            <div className={styles.container11}>
              <div className={styles.button}>
                <p className={styles.text6}>联系骑手</p>
              </div>
              <div className={styles.button2}>
                <p className={styles.text4}>催单</p>
              </div>
            </div>
          </div>
          <div className={styles.orderCard3PendingPay}>
            <div className={styles.container13}>
              <div className={styles.container5}>
                <div className={styles.background}>
                  <img
                    src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-hh4m7c2.png"
                    className={styles.restaurantLogo}
                  />
                </div>
                <p className={styles.text6}>一点点 (东区商业街)</p>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofl-vqqv26r.svg"
                  className={styles.container4}
                />
              </div>
              <p className={styles.text11}>待支付 (14:59)</p>
            </div>
            <div className={styles.container10}>
              <div className={styles.container7}>
                <img
                  src="../../../shared-assets/用户端/06-订单/01-订单列表/mppd4ofo-u471gyu.png"
                  className={styles.productThumbnail}
                />
              </div>
              <div className={styles.container8}>
                <p className={styles.text8}>波霸奶茶 (大杯/正常糖/少冰) x2</p>
                <p className={styles.a202310251230}>2023-10-25 15:20</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text9}>¥32.00</p>
                <p className={styles.text7}>共2件</p>
              </div>
            </div>
            <div className={styles.container11}>
              <div className={styles.button}>
                <p className={styles.text6}>取消订单</p>
              </div>
              <div className={styles.button2}>
                <p className={styles.text4}>立即支付</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
