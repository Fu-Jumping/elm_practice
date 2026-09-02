import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.simulatedAppBackgrou} />
      <div className={styles.backdropOverlayLevel}>
        <div className={styles.bottomSheetDrawerLev}>
          <div className={styles.dragHandleIndicatorO}>
            <div className={styles.background} />
          </div>
          <div className={styles.header}>
            <p className={styles.text}>订单备注</p>
            <div className={styles.frame}>
              <img
                src="../../../shared-assets/用户端/06-订单/05-订单备注/mppd79ow-rkgvooh.svg"
                className={styles.container}
              />
            </div>
          </div>
          <div className={styles.scrollableContentAre}>
            <div className={styles.quickTagsSection}>
              <p className={styles.text2}>快捷标签</p>
              <div className={styles.container2}>
                <div className={styles.autoWrapper2}>
                  <div className={styles.autoWrapper}>
                    <div className={styles.button}>
                      <p className={styles.text3}>不要辣</p>
                    </div>
                    <div className={styles.button}>
                      <p className={styles.text3}>多点辣</p>
                    </div>
                  </div>
                  <div className={styles.button2}>
                    <p className={styles.text4}>米饭多点</p>
                  </div>
                </div>
                <div className={styles.button}>
                  <p className={styles.text3}>不吃香菜</p>
                </div>
                <div className={styles.button}>
                  <p className={styles.text3}>多点葱</p>
                </div>
                <div className={styles.button}>
                  <p className={styles.text3}>放门口</p>
                </div>
              </div>
            </div>
            <div className={styles.textInputArea}>
              <p className={styles.text2}>自定义备注</p>
              <div className={styles.textarea}>
                <p className={styles.text5}>
                  请输入备注内容，我们将尽力满足您的需求...
                </p>
                <p className={styles.text6}>0/50</p>
              </div>
            </div>
          </div>
          <div className={styles.footerActionArea}>
            <div className={styles.button3}>
              <p className={styles.text7}>确定</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
