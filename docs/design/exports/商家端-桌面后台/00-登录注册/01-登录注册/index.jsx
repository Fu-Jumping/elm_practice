import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div className={styles.background}>
            <img src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-8zttb5e.svg" className={styles.container} />
          </div>
          <p className={styles.text}>校园外卖商家版</p>
          <p className={styles.text2}>商家经营后台</p>
        </div>
        <div className={styles.tabHeaders}>
          <div className={styles.label}>
            <p className={styles.text3}>登录</p>
          </div>
          <p className={styles.text4}>注册</p>
        </div>
        <div className={styles.loginContent}>
          <div className={styles.form}>
            <div className={styles.input}>
              <div className={styles.container2}>
                <p className={styles.text5}>请输入商家账号</p>
              </div>
              <img
                src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-an11tbj.svg"
                className={styles.container3}
              />
            </div>
            <div className={styles.input2}>
              <div className={styles.container2}>
                <p className={styles.text5}>请输入密码</p>
              </div>
              <img
                src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-c31r9pz.svg"
                className={styles.container3}
              />
              <div className={styles.button}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-17ttiqh.svg"
                  className={styles.container4}
                />
              </div>
            </div>
            <div className={styles.loginButton}>
              <p className={styles.text6}>登 录</p>
            </div>
            <div className={styles.footerHint}>
              <p className={styles.text7}>演示账号：merchant-a / 123456</p>
              <p className={styles.text8}>一键填充</p>
            </div>
          </div>
          <div className={styles.horizontalBorder}>
            <p className={styles.text2}>状态演示 (同屏展示用)</p>
            <div className={styles.errorStateExample}>
              <div className={styles.input3}>
                <div className={styles.container5}>
                  <p className={styles.admin}>admin</p>
                </div>
                <img
                  src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-gu7752o.svg"
                  className={styles.container3}
                />
              </div>
              <p className={styles.text9}>账号已存在</p>
            </div>
            <div className={styles.loadingButtonExample}>
              <img
                src="../../../shared-assets/商家端-桌面后台/00-登录注册/01-登录注册/mtib1kh1-5dc9y81.svg"
                className={styles.container6}
              />
              <p className={styles.text10}>登录中</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
