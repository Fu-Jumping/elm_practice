import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.sideNavBarPermanent}>
        <div className={styles.container3}>
          <div className={styles.background}>
            <img src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-6wuupkg.svg" className={styles.container} />
          </div>
          <div className={styles.container2}>
            <p className={styles.text}>
              校园外卖商
              <br />
              家后台
            </p>
            <p className={styles.text2}>店铺管理端</p>
          </div>
        </div>
        <div className={styles.container6}>
          <div className={styles.linkActiveTab}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-m8ywxaw.svg"
              className={styles.container4}
            />
            <p className={styles.text3}>订单</p>
          </div>
          <div className={styles.linkInactiveTabs}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-bpqdwz5.svg"
              className={styles.container4}
            />
            <p className={styles.text4}>商品</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-4ab7mn5.svg"
              className={styles.container5}
            />
            <p className={styles.text4}>分类</p>
          </div>
          <div className={styles.linkInactiveTabs}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-apanllk.svg"
              className={styles.container4}
            />
            <p className={styles.text4}>店铺设置</p>
          </div>
        </div>
        <div className={styles.horizontalBorder}>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-kt4oa2m.svg"
              className={styles.container7}
            />
            <p className={styles.text5}>概览 (二期)</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-phz8915.svg"
              className={styles.container8}
            />
            <p className={styles.text5}>消息 (二期)</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-ju1f6nu.svg"
              className={styles.container7}
            />
            <p className={styles.text5}>统计 (二期)</p>
          </div>
        </div>
      </div>
      <div className={styles.mainContentArea}>
        <div className={styles.asideOrderDetailDraw}>
          <div className={styles.container9}>
            <p className={styles.text6}>订单号: 20260915143012001</p>
          </div>
        </div>
        <div className={styles.overlay}>
          <div className={styles.headerTopNavBar}>
            <div className={styles.container10}>
              <div className={styles.link4}>
                <p className={styles.text7}>新订单 (12)</p>
              </div>
              <p className={styles.text8}>处理中</p>
              <p className={styles.text8}>已完成</p>
              <p className={styles.text8}>已取消</p>
            </div>
            <div className={styles.container13}>
              <div className={styles.container11}>
                <div className={styles.background2} />
                <p className={styles.text9}>营业中</p>
              </div>
              <div className={styles.verticalDivider} />
              <p className={styles.text10}>张老板</p>
              <div className={styles.button}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-iwjg0aw.svg"
                  className={styles.container12}
                />
              </div>
            </div>
          </div>
          <div className={styles.mainPageContentBackg}>
            <div className={styles.filtersActions}>
              <div className={styles.container15}>
                <div className={styles.container14}>
                  <p className={styles.text11}>搜索订单号/手机号</p>
                </div>
                <div className={styles.button2}>
                  <p className={styles.text12}>筛选</p>
                </div>
              </div>
              <div className={styles.button3}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/01-订单/02-订单详情抽屉/mtib1tc8-urf34fi.svg"
                  className={styles.container16}
                />
                <p className={styles.text12}>刷新</p>
              </div>
            </div>
            <div className={styles.table}>
              <div className={styles.headerRow}>
                <p className={styles.text13}>订单编号</p>
                <p className={styles.text14}>下单时间</p>
                <p className={styles.text15}>顾客信息</p>
                <p className={styles.text16}>商品摘要</p>
                <p className={styles.text17}>金额</p>
                <p className={styles.text18}>状态</p>
                <p className={styles.text19}>操作</p>
              </div>
              <div className={styles.body}>
                <div className={styles.row1TheSelectedOne}>
                  <p className={styles.text20}>20260915143012001</p>
                  <p className={styles.text21}>14:30:12</p>
                  <div className={styles.data}>
                    <p className={styles.text12}>张同学</p>
                    <p className={styles.text5}>138****1234</p>
                  </div>
                  <p className={styles.text22}>香辣鸡腿堡 等 2 件商品</p>
                  <p className={styles.text23}>¥35.00</p>
                  <div className={styles.data2}>
                    <div className={styles.background3}>
                      <p className={styles.text24}>待接单</p>
                    </div>
                  </div>
                  <p className={styles.text25}>查看详情</p>
                </div>
                <div className={styles.rowMoreFakeRows}>
                  <p className={styles.text20}>20260915142805022</p>
                  <p className={styles.text21}>14:28:05</p>
                  <div className={styles.data}>
                    <p className={styles.text12}>李同学</p>
                    <p className={styles.text5}>159****5678</p>
                  </div>
                  <p className={styles.text22}>牛肉炒饭 等 1 件商品</p>
                  <p className={styles.text23}>¥18.00</p>
                  <div className={styles.data3}>
                    <div className={styles.background4}>
                      <p className={styles.text5}>制作中</p>
                    </div>
                  </div>
                  <p className={styles.text25}>查看详情</p>
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
