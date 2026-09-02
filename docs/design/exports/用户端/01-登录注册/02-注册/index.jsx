import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopAppBarTrans}>
        <div className={styles.button}>
          <img src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymm-p3jspcs.svg" className={styles.container} />
        </div>
        <p className={styles.text}>注册账号</p>
      </div>
      <div className={styles.mainContentCanvas}>
        <div className={styles.container2}>
          <p className={styles.text2}>饿了么</p>
          <p className={styles.text3}>欢迎加入，发现校园美食</p>
        </div>
        <div className={styles.registrationForm}>
          <div className={styles.phoneNumber}>
            <p className={styles.text4}>手机号</p>
            <div className={styles.input}>
              <div className={styles.container3}>
                <p className={styles.text5}>请输入手机号</p>
              </div>
              <img src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymm-50prf8l.svg" className={styles.icon} />
            </div>
          </div>
          <div className={styles.nickname}>
            <p className={styles.text4}>昵称</p>
            <div className={styles.input2}>
              <div className={styles.container3}>
                <p className={styles.text5}>设置你的昵称</p>
              </div>
              <img src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymm-zme31cj.svg" className={styles.icon2} />
            </div>
          </div>
          <div className={styles.password}>
            <p className={styles.text4}>密码</p>
            <div className={styles.input3}>
              <div className={styles.container3}>
                <p className={styles.text5}>设置6-20位密码</p>
              </div>
              <img src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymn-gwvm8qk.svg" className={styles.icon3} />
              <img
                src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymn-2e0djcp.svg"
                className={styles.container4}
              />
            </div>
          </div>
          <div className={styles.confirmPassword}>
            <p className={styles.text4}>确认密码</p>
            <div className={styles.input4}>
              <div className={styles.container3}>
                <p className={styles.text5}>再次输入密码</p>
              </div>
              <img src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymn-sd98shh.svg" className={styles.icon4} />
              <img
                src="../../../shared-assets/用户端/01-登录注册/02-注册/mppd3ymn-2e0djcp.svg"
                className={styles.container4}
              />
            </div>
          </div>
          <div className={styles.termsCheckbox}>
            <div className={styles.inputMargin}>
              <div className={styles.input5} />
            </div>
            <p className={styles.text8}>
              <span className={styles.text6}>我已阅读并同意&nbsp;</span>
              <span className={styles.text7}>《用户服务协议》</span>
              <span className={styles.text6}>&nbsp;和&nbsp;</span>
              <span className={styles.text7}>《隐私政策》</span>
            </p>
          </div>
          <div className={styles.primaryActionButtonM}>
            <div className={styles.primaryActionButton}>
              <p className={styles.text9}>立即注册</p>
            </div>
          </div>
        </div>
        <p className={styles.text10}>已有账号？去登录</p>
      </div>
    </div>
  );
}

export default Component;
