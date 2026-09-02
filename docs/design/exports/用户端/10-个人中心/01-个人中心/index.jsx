import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContent}>
        <div className={styles.autoWrapper}>
          <div className={styles.container4}>
            <div className={styles.userAvatar}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-di0elck.svg"
                className={styles.background}
              />
            </div>
            <div className={styles.container2}>
              <div className={styles.container}>
                <p className={styles.text}>张三同学</p>
                <div className={styles.overlayOverlayBlur}>
                  <p className={styles.text2}>Vip 会员</p>
                </div>
              </div>
              <p className={styles.a1381234}>138****1234</p>
            </div>
            <div className={styles.buttonMargin}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-fn2ku8f.svg"
                className={styles.container3}
              />
            </div>
          </div>
          <div className={styles.assetArea}>
            <div className={styles.overlayShadow}>
              <div className={styles.container7}>
                <div className={styles.container6}>
                  <img
                    src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-g54y5de.svg"
                    className={styles.container5}
                  />
                  <p className={styles.text3}>会员权益</p>
                </div>
                <p className={styles.text4}>下单领红包，预计年省￥1240</p>
              </div>
              <div className={styles.button}>
                <p className={styles.text5}>立即开通</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.backgroundBorderShad}>
          <div className={styles.container8}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-doihc6n.svg" className={styles.margin} />
            <p className={styles.text6}>24</p>
            <p className={styles.text7}>我的收藏</p>
          </div>
          <div className={styles.margin2}>
            <div className={styles.verticalDivider} />
          </div>
          <div className={styles.container9}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-1vh6b6o.svg" className={styles.margin3} />
            <p className={styles.text6}>3</p>
            <p className={styles.text7}>红包</p>
          </div>
          <div className={styles.margin2}>
            <div className={styles.verticalDivider} />
          </div>
          <div className={styles.container10}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-gohd9uy.svg" className={styles.margin4} />
            <p className={styles.text8}>5</p>
            <p className={styles.text7}>收货地址</p>
          </div>
        </div>
        <div className={styles.servicesArea}>
          <div className={styles.heading3}>
            <p className={styles.text9}>常用功能</p>
          </div>
          <div className={styles.link}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-fq402ah.svg" className={styles.margin5} />
            <p className={styles.text10}>联系客服</p>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-9i63rfc.svg"
              className={styles.container11}
            />
          </div>
          <div className={styles.link2}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-zeebj25.svg" className={styles.margin6} />
            <p className={styles.text11}>常见问题 (FAQ)</p>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-9i63rfc.svg"
              className={styles.container11}
            />
          </div>
          <div className={styles.link3}>
            <img src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-1gq50p8.svg" className={styles.margin7} />
            <p className={styles.text10}>系统设置</p>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-9i63rfc.svg"
              className={styles.container11}
            />
          </div>
        </div>
        <p className={styles.text12}>饿了么 v1.0.0</p>
      </div>
      <div className={styles.bottomNavigationBar}>
        <div className={styles.button2}>
          <div className={styles.margin8}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-5rj55tg.svg"
              className={styles.container12}
            />
          </div>
          <p className={styles.text13}>首页</p>
        </div>
        <div className={styles.button3}>
          <div className={styles.margin9}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-k2lhspd.svg"
              className={styles.container3}
            />
          </div>
          <p className={styles.text13}>消息</p>
        </div>
        <div className={styles.button4}>
          <div className={styles.margin10}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-6awo82c.svg"
              className={styles.container13}
            />
          </div>
          <p className={styles.text13}>订单</p>
        </div>
        <div className={styles.button5}>
          <div className={styles.margin11}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/01-个人中心/mppd7lbk-e4vih4i.svg"
              className={styles.container14}
            />
          </div>
          <p className={styles.text14}>我的</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
