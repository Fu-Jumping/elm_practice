import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentArea}>
        <div className={styles.pageHeader}>
          <p className={styles.text}>店铺设置</p>
          <p className={styles.text2}>管理店铺基础信息与营业状态</p>
        </div>
        <div className={styles.container9}>
          <div className={styles.sectionCard1}>
            <div className={styles.heading3}>
              <p className={styles.text3}>基本资料</p>
            </div>
            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.label}>
                  <p className={styles.text4}>*</p>
                  <p className={styles.text5}>店铺名称</p>
                </div>
                <div className={styles.container}>
                  <p className={styles.text6}>肯德基宅急送（天津大学店）</p>
                </div>
              </div>
              <div className={styles.inputGroup2}>
                <p className={styles.text7}>联系电话</p>
                <div className={styles.container2}>
                  <p className={styles.a02260412345}>022-60412345</p>
                </div>
              </div>
              <div className={styles.inputGroup3}>
                <p className={styles.text7}>店铺说明</p>
                <div className={styles.container3}>
                  <p className={styles.text8}>主营炸鸡汉堡，校园二餐取餐</p>
                </div>
              </div>
              <div className={styles.actions}>
                <div className={styles.primaryButton}>
                  <p className={styles.text9}>保 存</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.sectionCard2}>
            <div className={styles.horizontalBorder}>
              <p className={styles.text10}>营业状态</p>
              <div className={styles.currentStatusTag}>
                <div className={styles.margin}>
                  <div className={styles.background} />
                </div>
                <p className={styles.text11}>当前营业中</p>
              </div>
            </div>
            <div className={styles.container8}>
              <div className={styles.optionA}>
                <div className={styles.container4}>
                  <div className={styles.margin2}>
                    <div className={styles.background2} />
                  </div>
                  <p className={styles.text12}>营业中&nbsp;</p>
                </div>
                <p className={styles.text13}>顾客可以浏览店铺并下单</p>
                <img
                  src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-ew6wcsx.svg"
                  className={styles.container5}
                />
              </div>
              <div className={styles.optionB}>
                <div className={styles.container6}>
                  <div className={styles.margin3}>
                    <div className={styles.background3} />
                  </div>
                  <p className={styles.text12}>已关店&nbsp;</p>
                </div>
                <p className={styles.text13}>店铺对顾客隐藏，不可下单</p>
              </div>
              <div className={styles.optionC}>
                <div className={styles.container7}>
                  <div className={styles.margin4}>
                    <div className={styles.background4} />
                  </div>
                  <p className={styles.text12}>临时闭店&nbsp;</p>
                </div>
                <p className={styles.text13}>店铺可见但暂停接单</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.container13}>
        <div className={styles.sideNavBar}>
          <div className={styles.header}>
            <p className={styles.text14}>校园外卖商家后台</p>
            <p className={styles.text15}>店铺管理端</p>
          </div>
          <div className={styles.list}>
            <div className={styles.itemLink}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-vde75ir.svg" className={styles.margin5} />
              <p className={styles.text16}>订单</p>
            </div>
            <div className={styles.itemLink}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-7bzwi1g.svg" className={styles.margin5} />
              <p className={styles.text16}>商品</p>
            </div>
            <div className={styles.itemLink2}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-ipf3510.svg" className={styles.margin6} />
              <p className={styles.text16}>分类</p>
            </div>
            <div className={styles.itemLink3}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-frqb30v.svg" className={styles.margin5} />
              <p className={styles.text17}>店铺设置</p>
            </div>
          </div>
          <div className={styles.list2}>
            <div className={styles.itemLink4}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-7u5kf48.svg" className={styles.margin7} />
              <p className={styles.text18}>概览 (二期)</p>
            </div>
            <div className={styles.itemLink5}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-4dcex24.svg" className={styles.margin8} />
              <p className={styles.text18}>消息 (二期)</p>
            </div>
            <div className={styles.itemLink4}>
              <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-95b262t.svg" className={styles.margin7} />
              <p className={styles.text18}>统计 (二期)</p>
            </div>
          </div>
        </div>
        <div className={styles.headerTopNavBar}>
          <p className={styles.text19}>店铺设置</p>
          <div className={styles.container12}>
            <div className={styles.trailingPrimaryActio}>
              <div className={styles.background} />
              <p className={styles.text20}>营业中</p>
            </div>
            <div className={styles.margin9}>
              <div className={styles.verticalDivider} />
            </div>
            <div className={styles.trailingSecondaryAct}>
              <div className={styles.margin10}>
                <div className={styles.background5}>
                  <img
                    src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-c33io2t.svg"
                    className={styles.container10}
                  />
                </div>
              </div>
              <p className={styles.text21}>账号名</p>
            </div>
            <div className={styles.button}>
              <img
                src="../../../shared-assets/商家端-桌面后台/04-店铺设置/02-切换营业状态确认/mtib2j60-socivvt.svg"
                className={styles.container11}
              />
            </div>
          </div>
        </div>
        <div className={styles.backdrop}>
          <div className={styles.modalContainer}>
            <div className={styles.heading32}>
              <p className={styles.text22}>切换营业状态</p>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.text25}>
                <span className={styles.text23}>确认将店铺状态切换为「</span>
                <span className={styles.text24}>营业中</span>
                <span className={styles.text23}>
                  」吗？切换成功后顾客端将
                  <br />
                  立即可见并可下单。
                </span>
              </p>
            </div>
            <div className={styles.modalFooter}>
              <div className={styles.button2}>
                <p className={styles.text26}>取 消</p>
              </div>
              <div className={styles.buttonMargin}>
                <div className={styles.button3}>
                  <p className={styles.text9}>确 认</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
