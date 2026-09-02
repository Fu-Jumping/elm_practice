import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.mainContentCanvas}>
      <div className={styles.welcomeMessageAvatar}>
        <div className={styles.margin}>
          <div className={styles.background}>
            <img src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-482q7q7.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>您好，有什么可以帮您？</p>
        <p className={styles.text2}>智能客服与人工客服随时为您服务</p>
      </div>
      <div className={styles.supportCategoriesGri}>
        <div className={styles.autoWrapper}>
          <div className={styles.buttonCategory1}>
            <div className={styles.margin2}>
              <div className={styles.background2}>
                <img
                  src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-pqysk8o.svg"
                  className={styles.container2}
                />
              </div>
            </div>
            <p className={styles.text3}>订单问题</p>
            <p className={styles.text4}>催单、修改订单、骑手位置</p>
          </div>
          <div className={styles.buttonCategory3}>
            <div className={styles.margin3}>
              <div className={styles.background3}>
                <img
                  src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-bjos2vb.svg"
                  className={styles.container3}
                />
              </div>
            </div>
            <p className={styles.text3}>退款咨询</p>
            <p className={styles.text4}>退款进度、餐品问题退款</p>
          </div>
        </div>
        <div className={styles.autoWrapper2}>
          <div className={styles.buttonCategory2}>
            <div className={styles.margin4}>
              <div className={styles.background4}>
                <img
                  src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-22oi6q6.svg"
                  className={styles.container4}
                />
              </div>
            </div>
            <p className={styles.text3}>支付问题</p>
            <p className={styles.text4}>支付失败、红包使用、发票</p>
          </div>
          <div className={styles.buttonCategory4}>
            <div className={styles.margin5}>
              <div className={styles.background5}>
                <img
                  src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-q20h5rk.svg"
                  className={styles.container5}
                />
              </div>
            </div>
            <p className={styles.text3}>其他问题</p>
            <p className={styles.text4}>账号设置、活动规则、投诉</p>
          </div>
        </div>
      </div>
      <div className={styles.recentOrdersHelp}>
        <div className={styles.horizontalBorder}>
          <p className={styles.text}>近期订单咨询</p>
          <div className={styles.button}>
            <p className={styles.text5}>查看全部</p>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-l3zofs8.svg"
              className={styles.container6}
            />
          </div>
        </div>
        <div className={styles.container8}>
          <div className={styles.margin6}>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1i-iv9vyj0.png"
              className={styles.imageBackground}
            />
          </div>
          <div className={styles.container7}>
            <p className={styles.text6}>麦当劳 (大学城店)</p>
            <p className={styles.text7}>已送达 · 2小时前</p>
          </div>
          <div className={styles.button2}>
            <p className={styles.text8}>咨询此单</p>
          </div>
        </div>
      </div>
      <div className={styles.bottomFixedActionsCa}>
        <div className={styles.button3}>
          <img src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-hquauuz.svg" className={styles.container9} />
          <p className={styles.text9}>电话客服</p>
        </div>
        <div className={styles.button4}>
          <img src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-pzmblrq.svg" className={styles.container10} />
          <p className={styles.text10}>在线客服</p>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.buttonMargin}>
          <div className={styles.button5}>
            <img
              src="../../../shared-assets/用户端/09-消息与客服/03-联系客服/mppd7z1g-pqr02gp.svg"
              className={styles.container11}
            />
          </div>
        </div>
        <p className={styles.text11}>联系客服</p>
      </div>
    </div>
  );
}

export default Component;
