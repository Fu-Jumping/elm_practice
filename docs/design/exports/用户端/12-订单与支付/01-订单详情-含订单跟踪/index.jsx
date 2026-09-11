import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame5}>
      <div className={styles.footerFloatingBottom}>
        <div className={styles.button}>
          <p className={styles.text}>取消订单</p>
        </div>
        <div className={styles.button}>
          <p className={styles.text}>联系商家</p>
        </div>
        <div className={styles.button2}>
          <div className={styles.buttonShadow}>
            <p className={styles.text2}>查看配送进度</p>
          </div>
        </div>
      </div>
      <div className={styles.topWarmAmbientGradie}>
        <div className={styles.headerTopAppBarNavig}>
          <div className={styles.button3}>
            <img src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-h4yv3h2.svg" className={styles.container} />
          </div>
          <p className={styles.text3}>订单详情</p>
        </div>
        <div className={styles.statusStepperBanner}>
          <div className={styles.mainStatusTitle}>
            <div className={styles.heading2}>
              <p className={styles.text4}>商家已接单</p>
              <img
                src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-614wzhf.svg"
                className={styles.container2}
              />
            </div>
            <div className={styles.deliveryEstimationCa}>
              <img
                src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-fcsm4qy.svg"
                className={styles.container3}
              />
              <p className={styles.text7}>
                <span className={styles.text5}>预计&nbsp;</span>
                <span className={styles.text6}>12:30</span>
                <span className={styles.text5}>&nbsp;送达</span>
              </p>
            </div>
          </div>
          <div className={styles.container5}>
            <div className={styles.backgroundGreyTrack}>
              <div className={styles.activeOrangeGradient} />
            </div>
            <div className={styles.step1}>
              <div className={styles.background}>
                <img
                  src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-645zk6e.svg"
                  className={styles.container4}
                />
              </div>
              <p className={styles.text8}>已下单</p>
            </div>
            <div className={styles.step2}>
              <div className={styles.background}>
                <img
                  src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-645zk6e.svg"
                  className={styles.container4}
                />
              </div>
              <p className={styles.text8}>已支付</p>
            </div>
            <div className={styles.frame}>
              <div className={styles.backgroundBorder}>
                <div className={styles.overlayShadow}>
                  <div className={styles.background2} />
                </div>
              </div>
              <div className={styles.overlay} />
              <p className={styles.text9}>商家接单</p>
            </div>
            <div className={styles.step4}>
              <div className={styles.backgroundBorder2}>
                <div className={styles.background3} />
              </div>
              <p className={styles.text10}>配送中</p>
            </div>
            <div className={styles.step5}>
              <div className={styles.backgroundBorder2}>
                <div className={styles.background3} />
              </div>
              <p className={styles.text10}>已完成</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.mainContentContainer}>
        <div className={styles.sectionMerchantFoodO}>
          <div className={styles.merchantHeader}>
            <div className={styles.container6}>
              <p className={styles.text11}>肯德基</p>
              <img src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-cqld8u9.svg" className={styles.margin} />
            </div>
            <p className={styles.text10}>外卖自取/送达</p>
          </div>
          <div className={styles.dishesList}>
            <div className={styles.item1}>
              <div className={styles.container8}>
                <div className={styles.frame2} />
                <div className={styles.container7}>
                  <p className={styles.text12}>香辣脆皮鸡腿堡</p>
                  <p className={styles.text13}>x1</p>
                </div>
              </div>
              <p className={styles.text14}>¥ 19.9</p>
            </div>
            <div className={styles.item2}>
              <div className={styles.container10}>
                <div className={styles.frame3} />
                <div className={styles.container9}>
                  <p className={styles.text15}>薯条(中)</p>
                  <p className={styles.text16}>x1</p>
                </div>
              </div>
              <p className={styles.text14}>¥ 11.5</p>
            </div>
            <div className={styles.item3}>
              <div className={styles.container11}>
                <div className={styles.frame4} />
                <div className={styles.container9}>
                  <p className={styles.text15}>可乐(大)</p>
                  <p className={styles.text16}>x1</p>
                </div>
              </div>
              <p className={styles.text14}>¥ 9.0</p>
            </div>
          </div>
          <div className={styles.priceBreakdownDiscou}>
            <div className={styles.container12}>
              <p className={styles.text17}>配送费</p>
              <p className={styles.text18}>¥ 3.5</p>
            </div>
            <div className={styles.container14}>
              <div className={styles.container13}>
                <img
                  src="../../../shared-assets/用户端/12-订单与支付/01-订单详情-含订单跟踪/26_2-mtwdo0ye-jfqzj5v.svg"
                  className={styles.background4}
                />
                <p className={styles.text17}>满减优惠</p>
              </div>
              <p className={styles.text19}>-¥ 5.0</p>
            </div>
          </div>
          <div className={styles.totalPaymentSummary}>
            <p className={styles.text20}>共 3 件商品</p>
            <div className={styles.paragraph}>
              <p className={styles.text17}>实付</p>
              <p className={styles.text21}>¥</p>
              <p className={styles.text22}>38.9</p>
            </div>
          </div>
        </div>
        <div className={styles.sectionDeliveryInfoC}>
          <div className={styles.heading3}>
            <div className={styles.background5} />
            <p className={styles.text23}>配送信息</p>
          </div>
          <div className={styles.container19}>
            <div className={styles.container16}>
              <p className={styles.text24}>配送地址</p>
              <div className={styles.container15}>
                <p className={styles.text25}>天津大学软件园校区 4号楼</p>
                <p className={styles.text26}>张同学 138****8888</p>
              </div>
            </div>
            <div className={styles.container18}>
              <p className={styles.text24}>配送服务</p>
              <div className={styles.container17}>
                <div className={styles.backgroundBorder3}>
                  <p className={styles.text27}>蜂鸟专送</p>
                </div>
                <p className={styles.text28}>由 蜂鸟专送 提供配送服务</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.sectionOrderInfoCard}>
          <div className={styles.heading3}>
            <div className={styles.background5} />
            <p className={styles.text23}>订单信息</p>
          </div>
          <div className={styles.container25}>
            <div className={styles.container21}>
              <p className={styles.text17}>订单号</p>
              <div className={styles.container20}>
                <p className={styles.text29}>3492847192837482</p>
                <div className={styles.button4}>
                  <p className={styles.text30}>复制</p>
                </div>
              </div>
            </div>
            <div className={styles.container22}>
              <p className={styles.text17}>下单时间</p>
              <p className={styles.text28}>2023-10-27 11:45:23</p>
            </div>
            <div className={styles.container24}>
              <p className={styles.text17}>支付方式</p>
              <div className={styles.container23}>
                <div className={styles.background6} />
                <p className={styles.text28}>微信支付</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
