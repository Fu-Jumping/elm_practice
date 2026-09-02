import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentCanvas}>
        <div className={styles.header}>
          <p className={styles.text}>订单管理</p>
          <p className={styles.text2}>处理顾客订单，接单后按状态推进</p>
        </div>
        <div className={styles.statusTabs}>
          <div className={styles.button}>
            <p className={styles.text3}>全部</p>
          </div>
          <div className={styles.button2}>
            <p className={styles.text4}>待接单</p>
            <div className={styles.background}>
              <p className={styles.text5}>3</p>
            </div>
          </div>
          <p className={styles.text6}>制作中</p>
          <p className={styles.text6}>配送中</p>
          <p className={styles.text6}>已完成</p>
        </div>
        <div className={styles.dataTableCard}>
          <div className={styles.table}>
            <div className={styles.row}>
              <div className={styles.cell}>
                <p className={styles.text7}>订单号</p>
              </div>
              <div className={styles.cell2}>
                <p className={styles.text7}>顾客</p>
              </div>
              <div className={styles.cell3}>
                <p className={styles.text7}>商品摘要</p>
              </div>
              <div className={styles.cell4}>
                <p className={styles.text7}>金额</p>
              </div>
              <div className={styles.cell5}>
                <p className={styles.text7}>状态</p>
              </div>
              <div className={styles.cell6}>
                <p className={styles.text7}>下单时间</p>
              </div>
              <div className={styles.cell7}>
                <p className={styles.text7}>操作</p>
              </div>
            </div>
            <div className={styles.body}>
              <div className={styles.row1Pending}>
                <p className={styles.text8}>20260915143012001</p>
                <p className={styles.text9}>张同学</p>
                <p className={styles.text10}>香辣鸡腿堡 ×2, 可乐 (中杯) ×1</p>
                <p className={styles.text11}>¥42.00</p>
                <div className={styles.data}>
                  <div className={styles.background2}>
                    <p className={styles.text12}>待接单</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 12:30</p>
                <p className={styles.text14}>接单</p>
              </div>
              <div className={styles.row2Pending}>
                <p className={styles.text8}>20260915143012002</p>
                <p className={styles.text9}>李同学</p>
                <p className={styles.text10}>原味鸡块(6块) ×1, 薯条(大) ×1</p>
                <p className={styles.text11}>¥28.50</p>
                <div className={styles.data}>
                  <div className={styles.background2}>
                    <p className={styles.text12}>待接单</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 12:32</p>
                <p className={styles.text14}>接单</p>
              </div>
              <div className={styles.row3Pending}>
                <p className={styles.text8}>20260915143012003</p>
                <p className={styles.text9}>王同学</p>
                <p className={styles.text15}>蜜汁全鸡 ×1</p>
                <p className={styles.text11}>¥39.90</p>
                <div className={styles.data}>
                  <div className={styles.background2}>
                    <p className={styles.text12}>待接单</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 12:35</p>
                <p className={styles.text14}>接单</p>
              </div>
              <div className={styles.row4Cooking}>
                <p className={styles.text8}>20260915143012004</p>
                <p className={styles.text9}>赵同学</p>
                <p className={styles.text15}>巨无霸套餐 ×1</p>
                <p className={styles.text11}>¥35.00</p>
                <div className={styles.data2}>
                  <div className={styles.background3}>
                    <p className={styles.text12}>制作中</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 12:15</p>
                <p className={styles.text16}>出餐</p>
              </div>
              <div className={styles.row5Cooking}>
                <p className={styles.text8}>20260915143012005</p>
                <p className={styles.text9}>孙同学</p>
                <p className={styles.text10}>珍珠奶茶(大) ×2</p>
                <p className={styles.text11}>¥24.00</p>
                <div className={styles.data2}>
                  <div className={styles.background3}>
                    <p className={styles.text12}>制作中</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 12:18</p>
                <p className={styles.text16}>出餐</p>
              </div>
              <div className={styles.row6Delivering}>
                <p className={styles.text8}>20260915143012006</p>
                <p className={styles.text9}>周同学</p>
                <p className={styles.text10}>麻辣香锅(微辣) ×1, 米饭 ×1</p>
                <p className={styles.text11}>¥45.00</p>
                <div className={styles.data3}>
                  <div className={styles.background4}>
                    <p className={styles.text12}>配送中</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 11:50</p>
                <p className={styles.text16}>查看</p>
              </div>
              <div className={styles.row7Completed}>
                <p className={styles.text8}>20260915143012007</p>
                <p className={styles.text9}>吴同学</p>
                <p className={styles.text10}>牛肉拉面 ×1, 卤蛋 ×1</p>
                <p className={styles.text11}>¥18.00</p>
                <div className={styles.data4}>
                  <div className={styles.background5}>
                    <p className={styles.text12}>已完成</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 11:10</p>
                <p className={styles.text16}>详情</p>
              </div>
              <div className={styles.row8Completed}>
                <p className={styles.text17}>20260915143012008</p>
                <p className={styles.text18}>郑同学</p>
                <p className={styles.text19}>冰鲜柠檬水 ×3</p>
                <p className={styles.text20}>¥12.00</p>
                <div className={styles.data5}>
                  <div className={styles.background5}>
                    <p className={styles.text12}>已完成</p>
                  </div>
                </div>
                <p className={styles.text13}>2026-09-15 10:45</p>
                <p className={styles.text21}>详情</p>
              </div>
            </div>
          </div>
          <div className={styles.container3}>
            <p className={styles.text22}>共 86 条记录</p>
            <div className={styles.container2}>
              <div className={styles.button3}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-3tool3x.svg"
                  className={styles.container}
                />
              </div>
              <div className={styles.button4}>
                <p className={styles.text23}>1</p>
              </div>
              <div className={styles.button5}>
                <p className={styles.text22}>2</p>
              </div>
              <div className={styles.button5}>
                <p className={styles.text22}>3</p>
              </div>
              <p className={styles.text24}>...</p>
              <img src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-j15aiwo.svg" className={styles.button6} />
              <div className={styles.button7}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-kms50nh.svg"
                  className={styles.container}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.topNavBar}>
        <p className={styles.text25}>校园外卖商家后台</p>
        <div className={styles.container5}>
          <div className={styles.background7}>
            <div className={styles.background6} />
            <p className={styles.text12}>营业中</p>
          </div>
          <p className={styles.text26}>账号名</p>
          <div className={styles.button8}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-4etocs0.svg"
              className={styles.container4}
            />
          </div>
        </div>
      </div>
      <div className={styles.asideSideNavBar}>
        <div className={styles.container7}>
          <div className={styles.background8}>
            <p className={styles.text27}>ML</p>
          </div>
          <div className={styles.container6}>
            <p className={styles.text28}>
              校园外卖商
              <br />
              家后台
            </p>
            <p className={styles.text29}>店铺管理端</p>
          </div>
        </div>
        <div className={styles.nav}>
          <div className={styles.linkActive}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-oji8qah.svg"
              className={styles.container8}
            />
            <p className={styles.text3}>订单</p>
          </div>
          <div className={styles.linkInactive}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-lwegepy.svg"
              className={styles.container8}
            />
            <p className={styles.text4}>商品</p>
          </div>
          <div className={styles.linkInactive2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-8owjqt6.svg"
              className={styles.container9}
            />
            <p className={styles.text4}>分类</p>
          </div>
          <div className={styles.linkInactive}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-d1cjdmw.svg"
              className={styles.container8}
            />
            <p className={styles.text4}>店铺设置</p>
          </div>
        </div>
        <div className={styles.horizontalBorder}>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-alhb3a9.svg"
              className={styles.container10}
            />
            <p className={styles.text30}>概览 (二期)</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-89rktmd.svg"
              className={styles.container11}
            />
            <p className={styles.text30}>消息 (二期)</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/01-订单/01-订单管理列表/mtib1y4a-ngk0r5n.svg"
              className={styles.container10}
            />
            <p className={styles.text30}>统计 (二期)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
