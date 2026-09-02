import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.bottomNavBarMobileOn}>
        <div className={styles.link}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-kkhwe8n.svg" className={styles.margin} />
          <p className={styles.text}>首页</p>
        </div>
        <div className={styles.link2}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-mndiezr.svg" className={styles.margin2} />
          <p className={styles.text2}>消息</p>
        </div>
        <div className={styles.link3}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-bnqppsi.svg" className={styles.margin3} />
          <p className={styles.text}>订单</p>
        </div>
        <div className={styles.link4}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-o23blfi.svg" className={styles.margin4} />
          <p className={styles.text}>我的</p>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.button}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-vyi4er5.svg" className={styles.container} />
        </div>
        <p className={styles.text3}>消息</p>
        <div className={styles.button2}>
          <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-7dso6bi.svg" className={styles.container2} />
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.notificationSection}>
          <div className={styles.horizontalBorder}>
            <div className={styles.overlay}>
              <img
                src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-lnqkre1.svg"
                className={styles.container3}
              />
            </div>
            <div className={styles.container5}>
              <div className={styles.container4}>
                <p className={styles.text4}>订单状态</p>
                <p className={styles.text5}>刚刚</p>
              </div>
              <p className={styles.text6}>您的订单正在配送中</p>
            </div>
          </div>
          <div className={styles.horizontalBorder2}>
            <div className={styles.overlay2}>
              <img
                src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-fhftbde.svg"
                className={styles.container6}
              />
            </div>
            <div className={styles.container5}>
              <div className={styles.container4}>
                <p className={styles.text4}>优惠活动</p>
                <p className={styles.text5}>1小时前</p>
              </div>
              <p className={styles.text6}>您收到一张5元优惠券</p>
            </div>
          </div>
          <div className={styles.container7}>
            <div className={styles.background}>
              <img src="../../../shared-assets/用户端/09-消息与客服/01-消息中心/mppd4vnr-m583scz.svg" className={styles.margin4} />
            </div>
            <div className={styles.container5}>
              <div className={styles.container4}>
                <p className={styles.text4}>系统通知</p>
                <p className={styles.text5}>2小时前</p>
              </div>
              <p className={styles.text6}>会员权益已激活</p>
            </div>
          </div>
        </div>
        <div className={styles.merchantConversation}>
          <p className={styles.text7}>商家会话</p>
          <div className={styles.border}>
            <div className={styles.conversationItem1}>
              <div className={styles.container8}>
                <div className={styles.kFcLogoPlaceholder} />
                <div className={styles.backgroundBorder}>
                  <p className={styles.text8}>1</p>
                </div>
              </div>
              <div className={styles.container10}>
                <div className={styles.container9}>
                  <p className={styles.text9}>KFC</p>
                  <p className={styles.text10}>2分钟前</p>
                </div>
                <p className={styles.text11}>您的汉堡已准备好</p>
              </div>
            </div>
            <div className={styles.conversationItem2}>
              <div className={styles.oldWangSShopLogoPlac} />
              <div className={styles.container12}>
                <div className={styles.container11}>
                  <p className={styles.text12}>Old Wang's Shop</p>
                  <p className={styles.text5}>15分钟前</p>
                </div>
                <p className={styles.text6}>好的，已按要求加酱</p>
              </div>
            </div>
            <div className={styles.conversationItem3}>
              <div className={styles.mcDonaldSLogoPlaceho} />
              <div className={styles.container13}>
                <div className={styles.container11}>
                  <p className={styles.text12}>McDonald's</p>
                  <p className={styles.text5}>昨天</p>
                </div>
                <p className={styles.text13}>感谢您的订购</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
