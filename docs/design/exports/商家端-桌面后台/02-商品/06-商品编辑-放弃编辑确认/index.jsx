import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.backgroundContentBlu}>
      <div className={styles.sideNavShellPlacehol}>
        <p className={styles.text}>
          校园外卖商家后
          <br />台
        </p>
        <div className={styles.container3}>
          <div className={styles.container2}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/06-商品编辑-放弃编辑确认/mtib2g10-ula8iep.svg" className={styles.container} />
            <p className={styles.text2}>订单</p>
          </div>
          <div className={styles.backgroundVerticalBo}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/06-商品编辑-放弃编辑确认/mtib2g10-tctdzf8.svg" className={styles.container} />
            <p className={styles.text3}>商品</p>
          </div>
        </div>
      </div>
      <div className={styles.blur}>
        <div className={styles.container4}>
          <p className={styles.text4}>编辑商品</p>
        </div>
        <div className={styles.contentAreaPlacehold}>
          <div className={styles.backgroundBorder}>
            <p className={styles.text5}>基本信息</p>
            <div className={styles.container5}>
              <div className={styles.background} />
              <div className={styles.background2} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.overlayModal}>
        <div className={styles.modalCard}>
          <div className={styles.header}>
            <p className={styles.text6}>放弃编辑</p>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/06-商品编辑-放弃编辑确认/mtib2g10-xnpjv43.svg"
              className={styles.container6}
            />
          </div>
          <p className={styles.text7}>当前有未保存的内容，确定要放弃本次编辑吗？</p>
          <div className={styles.footerActions}>
            <div className={styles.button}>
              <p className={styles.text8}>取 消</p>
            </div>
            <div className={styles.button2}>
              <p className={styles.text9}>确 定</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
