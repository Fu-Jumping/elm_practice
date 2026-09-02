import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.semiTransparentOverl}>
      <div className={styles.confirmationDialog}>
        <div className={styles.dialogHeader}>
          <div className={styles.warningIcon}>
            <img src="../../../shared-assets/商家端-桌面后台/90-组件与状态/01-放弃未保存修改确认弹窗/mtib2ll5-iq9ui7j.svg" className={styles.container} />
          </div>
          <div className={styles.container2}>
            <p className={styles.text}>放弃未保存的修改？</p>
            <p className={styles.text2}>
              当前商品编辑内容尚未保存，离开后将丢失这些
              <br />
              修改。
            </p>
          </div>
        </div>
        <div className={styles.dialogActionsBottomR}>
          <div className={styles.secondaryButtonLeft}>
            <p className={styles.text3}>放弃修改</p>
          </div>
          <div className={styles.primaryButtonRight}>
            <p className={styles.text4}>继续编辑</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
