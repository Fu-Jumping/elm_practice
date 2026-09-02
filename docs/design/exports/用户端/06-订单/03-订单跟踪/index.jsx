import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.footerActions}>
        <div className={styles.button}>
          <p className={styles.text}>联系商家</p>
        </div>
        <div className={styles.button2}>
          <p className={styles.text2}>查看配送进度</p>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.button3}>
          <img src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4quf-12zk2ly.svg" className={styles.container} />
        </div>
        <p className={styles.text3}>订单详情</p>
      </div>
      <div className={styles.main}>
        <div className={styles.statusSection}>
          <div className={styles.container2}>
            <p className={styles.text4}>商家已接单</p>
            <p className={styles.text5}>预计 12:30 送达</p>
          </div>
          <div className={styles.progressStepper}>
            <div className={styles.progressStepperConte}>
              <div className={styles.horizontalDivider} />
            </div>
            <div className={styles.background2}>
              <div className={styles.background} />
              <p className={styles.text6}>已下单</p>
            </div>
            <div className={styles.background3}>
              <div className={styles.background} />
              <p className={styles.text6}>已支付</p>
            </div>
            <div className={styles.background5}>
              <div className={styles.backgroundBorder}>
                <div className={styles.background4} />
              </div>
              <p className={styles.text7}>商家接单</p>
            </div>
            <div className={styles.background7}>
              <div className={styles.background6} />
              <p className={styles.text8}>配送中</p>
            </div>
            <div className={styles.background8}>
              <div className={styles.background6} />
              <p className={styles.text8}>已完成</p>
            </div>
          </div>
        </div>
        <div className={styles.orderItemsSection}>
          <div className={styles.horizontalBorder}>
            <p className={styles.text9}>肯德基</p>
            <img
              src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4quf-p5udvb2.svg"
              className={styles.container3}
            />
          </div>
          <div className={styles.container6}>
            <div className={styles.item1}>
              <div className={styles.container5}>
                <img src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4qul-h48ixj0.png" className={styles.frame} />
                <div className={styles.container4}>
                  <p className={styles.text10}>香辣脆皮鸡腿堡</p>
                  <p className={styles.text11}>x1</p>
                </div>
              </div>
              <p className={styles.text12}>¥ 19.9</p>
            </div>
            <div className={styles.item1}>
              <div className={styles.container5}>
                <img src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4qul-95ktjdv.png" className={styles.frame} />
                <div className={styles.container4}>
                  <p className={styles.text10}>薯条(中)</p>
                  <p className={styles.text11}>x1</p>
                </div>
              </div>
              <p className={styles.text12}>¥ 11.5</p>
            </div>
            <div className={styles.item1}>
              <div className={styles.container5}>
                <img src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4qum-j6jqyoc.png" className={styles.frame} />
                <div className={styles.container4}>
                  <p className={styles.text10}>可乐(大)</p>
                  <p className={styles.text11}>x1</p>
                </div>
              </div>
              <p className={styles.text12}>¥ 9.0</p>
            </div>
          </div>
          <div className={styles.subtotals}>
            <div className={styles.container7}>
              <p className={styles.text13}>配送费</p>
              <p className={styles.text14}>¥ 3.5</p>
            </div>
            <div className={styles.container9}>
              <div className={styles.container8}>
                <img
                  src="../../../shared-assets/用户端/06-订单/03-订单跟踪/mppd4quf-j2hztni.svg"
                  className={styles.background9}
                />
                <p className={styles.text13}>满减优惠</p>
              </div>
              <p className={styles.text15}>-¥ 5.0</p>
            </div>
          </div>
          <div className={styles.horizontalBorder2}>
            <p className={styles.text13}>共 3 件商品</p>
            <div className={styles.paragraph}>
              <p className={styles.text16}>实付</p>
              <p className={styles.text17}>¥ 38.9</p>
            </div>
          </div>
        </div>
        <div className={styles.deliveryInfoSection}>
          <div className={styles.heading3}>
            <p className={styles.text9}>配送信息</p>
          </div>
          <div className={styles.container13}>
            <div className={styles.container11}>
              <p className={styles.text18}>配送地址</p>
              <div className={styles.container10}>
                <p className={styles.text19}>天津大学软件园校区 4号楼</p>
                <p className={styles.text20}>张同学 138****8888</p>
              </div>
            </div>
            <div className={styles.container12}>
              <p className={styles.text21}>配送服务</p>
              <p className={styles.text19}>由 蜂鸟专送 提供配送服务</p>
            </div>
          </div>
        </div>
        <div className={styles.orderInfoSection}>
          <div className={styles.heading3}>
            <p className={styles.text9}>订单信息</p>
          </div>
          <div className={styles.container17}>
            <div className={styles.container15}>
              <p className={styles.text13}>订单号</p>
              <div className={styles.container14}>
                <p className={styles.text14}>3492847192837482</p>
                <div className={styles.border}>
                  <p className={styles.text7}>复制</p>
                </div>
              </div>
            </div>
            <div className={styles.container7}>
              <p className={styles.text13}>下单时间</p>
              <p className={styles.text14}>2023-10-27 11:45:23</p>
            </div>
            <div className={styles.container16}>
              <p className={styles.text13}>支付方式</p>
              <p className={styles.text22}>微信支付</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
