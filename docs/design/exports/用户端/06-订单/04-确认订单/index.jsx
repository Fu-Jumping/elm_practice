import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.bottomActionBarCheck}>
        <div className={styles.button}>
          <div className={styles.buttonShadow}>
            <p className={styles.text}>去支付 ￥50.00</p>
          </div>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.button2}>
          <img src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-l4k8203.svg" className={styles.container} />
        </div>
        <p className={styles.text2}>确认订单</p>
        <div className={styles.button3}>
          <img src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-ic9yh1g.svg" className={styles.container2} />
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.container7}>
          <div className={styles.container6}>
            <div className={styles.overlay}>
              <img
                src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-p3v2yef.svg"
                className={styles.container3}
              />
            </div>
            <div className={styles.container5}>
              <div className={styles.container4}>
                <p className={styles.text3}>12号楼 304室</p>
                <div className={styles.overlay2}>
                  <p className={styles.text4}>学校</p>
                </div>
              </div>
              <p className={styles.text5}>张同学 (先生) 138****5678</p>
            </div>
          </div>
          <img src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-chfrkkd.svg" className={styles.container} />
        </div>
        <div className={styles.container10}>
          <p className={styles.text6}>送达时间</p>
          <div className={styles.container9}>
            <p className={styles.text7}>尽快送达 (预计 12:30)</p>
            <img
              src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-yi7jgtk.svg"
              className={styles.container8}
            />
          </div>
        </div>
        <div className={styles.sectionOrderItems}>
          <div className={styles.container12}>
            <img
              src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-ecjqpdn.svg"
              className={styles.container11}
            />
            <p className={styles.text8}>麦当劳 (校园店)</p>
          </div>
          <div className={styles.item1}>
            <img src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7cj2-s2i0d1p.png" className={styles.frame} />
            <div className={styles.container14}>
              <div className={styles.container13}>
                <p className={styles.text9}>巨无霸汉堡套餐</p>
                <p className={styles.text10}>¥ 38.00</p>
              </div>
              <p className={styles.text11}>包含: 中杯可乐 x1, 中薯条 x1</p>
              <p className={styles.x1}>x1</p>
            </div>
          </div>
          <div className={styles.item2}>
            <img src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7cj2-w9bt7br.png" className={styles.frame} />
            <div className={styles.container15}>
              <div className={styles.container13}>
                <p className={styles.text9}>麦乐鸡块 (5块装)</p>
                <p className={styles.text10}>¥ 12.00</p>
              </div>
              <p className={styles.text12}>甜酸酱</p>
              <p className={styles.x1}>x1</p>
            </div>
          </div>
          <div className={styles.feesDiscounts}>
            <div className={styles.container16}>
              <p className={styles.text13}>包装费</p>
              <p className={styles.text7}>¥ 2.00</p>
            </div>
            <div className={styles.container16}>
              <p className={styles.text13}>配送费</p>
              <p className={styles.text7}>¥ 3.00</p>
            </div>
            <div className={styles.container18}>
              <div className={styles.container17}>
                <img
                  src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-ze47yqe.svg"
                  className={styles.overlayBorder}
                />
                <p className={styles.text14}>店铺满减</p>
              </div>
              <p className={styles.text15}>- ¥ 5.00</p>
            </div>
          </div>
          <div className={styles.subtotal}>
            <div className={styles.paragraph}>
              <p className={styles.text16}>合计</p>
              <p className={styles.text17}>共 2 件商品</p>
            </div>
            <p className={styles.text18}>¥ 50.00</p>
          </div>
        </div>
        <div className={styles.section}>
          <p className={styles.text19}>支付方式</p>
          <div className={styles.container25}>
            <div className={styles.container21}>
              <div className={styles.container20}>
                <img
                  src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-zm3m1lv.svg"
                  className={styles.container19}
                />
                <p className={styles.text6}>微信支付</p>
              </div>
              <div className={styles.border}>
                <div className={styles.background} />
              </div>
            </div>
            <div className={styles.container24}>
              <div className={styles.container23}>
                <img
                  src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-0c3osnv.svg"
                  className={styles.container22}
                />
                <p className={styles.text6}>支付宝</p>
              </div>
              <div className={styles.border2} />
            </div>
          </div>
        </div>
        <div className={styles.container27}>
          <p className={styles.text6}>订单备注</p>
          <div className={styles.container26}>
            <p className={styles.text20}>口味、偏好等</p>
            <img
              src="../../../shared-assets/用户端/06-订单/04-确认订单/mppd7ciy-pp8rsfb.svg"
              className={styles.container8}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
