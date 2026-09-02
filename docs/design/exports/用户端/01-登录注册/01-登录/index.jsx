import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerBrandSection}>
        <div className={styles.margin}>
          <div className={styles.background}>
            <img src="../../../shared-assets/用户端/01-登录注册/01-登录/mppd3wd4-9kytjmy.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>饿了么</p>
        <p className={styles.text2}>欢迎加入饿了么，发现校园美食</p>
      </div>
      <div className={styles.loginForm}>
        <div className={styles.accountInput}>
          <p className={styles.text3}>账号/手机号</p>
          <div className={styles.input}>
            <div className={styles.container2}>
              <p className={styles.text4}>请输入账号或手机号</p>
            </div>
            <img src="../../../shared-assets/用户端/01-登录注册/01-登录/mppd3wd4-czx6fca.svg" className={styles.icon} />
          </div>
        </div>
        <div className={styles.passwordInput}>
          <p className={styles.text3}>密码</p>
          <div className={styles.input2}>
            <div className={styles.container2}>
              <p className={styles.text4}>请输入密码</p>
            </div>
            <img src="../../../shared-assets/用户端/01-登录注册/01-登录/mppd3wd4-hz9f9ij.svg" className={styles.icon2} />
          </div>
        </div>
        <div className={styles.submitButtonMargin}>
          <div className={styles.submitButton}>
            <p className={styles.text5}>登录</p>
          </div>
        </div>
      </div>
      <div className={styles.secondarySectionDemo}>
        <div className={styles.divider}>
          <div className={styles.horizontalDivider} />
          <p className={styles.text6}>使用演示账号登录</p>
          <div className={styles.horizontalDivider} />
        </div>
        <div className={styles.demoButtons}>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/用户端/01-登录注册/01-登录/mppd3wd4-8b8p02l.svg"
              className={styles.container3}
            />
            <p className={styles.text7}>User A</p>
          </div>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/用户端/01-登录注册/01-登录/mppd3wd4-f4tsiey.svg"
              className={styles.container4}
            />
            <p className={styles.text7}>User B</p>
          </div>
        </div>
      </div>
      <div className={styles.footerBottomLinks}>
        <p className={styles.text2}>还没有账号？立即注册</p>
        <p className={styles.text8}>商家端入口</p>
      </div>
    </div>
  );
}

export default Component;
