import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentArea}>
        <div className={styles.mainPageContentDummy}>
          <div className={styles.container2}>
            <p className={styles.text}>商品列表</p>
            <div className={styles.button}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-hd11r1g.svg"
                className={styles.container}
              />
              <p className={styles.text2}>新建商品</p>
            </div>
          </div>
          <div className={styles.tableHeader}>
            <p className={styles.text3}>商品名称</p>
            <p className={styles.text4}>分类</p>
            <p className={styles.text4}>价格</p>
            <p className={styles.text4}>操作</p>
          </div>
          <div className={styles.tableRows}>
            <div className={styles.container3}>
              <div className={styles.background} />
              <p className={styles.text}>招牌黄焖鸡米饭</p>
            </div>
            <p className={styles.text5}>热销套餐</p>
            <p className={styles.text6}>¥18.90</p>
            <div className={styles.container6}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-86xmwah.svg"
                className={styles.container4}
              />
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-ttr5sfc.svg"
                className={styles.container5}
              />
            </div>
          </div>
          <div className={styles.tableRows}>
            <div className={styles.container3}>
              <div className={styles.background} />
              <p className={styles.text}>冰镇可乐</p>
            </div>
            <p className={styles.text5}>酒水饮料</p>
            <p className={styles.text6}>¥3.00</p>
            <div className={styles.container6}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-86xmwah.svg"
                className={styles.container4}
              />
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-ttr5sfc.svg"
                className={styles.container5}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text7}>校园外卖商家后台</p>
        <div className={styles.container9}>
          <div className={styles.container7}>
            <div className={styles.background2} />
            <p className={styles.text}>营业中</p>
          </div>
          <div className={styles.verticalBorder}>
            <p className={styles.text8}>账号名</p>
            <div className={styles.button2}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-v6lgijw.svg"
                className={styles.container8}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.container11}>
          <div className={styles.container10}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2dac-b6aaybb.png"
              className={styles.aB6AXuDqEfvtJodQwfcg}
            />
            <div className={styles.heading1}>
              <p className={styles.text9}>
                校园外卖商
                <br />
                家后台
              </p>
            </div>
          </div>
          <p className={styles.text10}>店铺管理端</p>
        </div>
        <div className={styles.list}>
          <div className={styles.itemLink}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-2wpgdq9.svg"
              className={styles.container12}
            />
            <p className={styles.text8}>订单</p>
          </div>
          <div className={styles.itemLink2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-w6tgcqw.svg"
              className={styles.container12}
            />
            <p className={styles.text11}>商品</p>
          </div>
          <div className={styles.itemLink3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-jexjvyp.svg"
              className={styles.container13}
            />
            <p className={styles.text8}>分类</p>
          </div>
          <div className={styles.itemLink}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-3icx1o1.svg"
              className={styles.container12}
            />
            <p className={styles.text8}>店铺设置</p>
          </div>
        </div>
        <div className={styles.list2}>
          <div className={styles.itemLink4}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-n1bp7oz.svg"
              className={styles.container8}
            />
            <p className={styles.text12}>概览 (二期)</p>
          </div>
          <div className={styles.itemLink5}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-d5h4cug.svg"
              className={styles.container14}
            />
            <p className={styles.text12}>消息 (二期)</p>
          </div>
          <div className={styles.itemLink4}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-itervjz.svg"
              className={styles.container8}
            />
            <p className={styles.text12}>统计 (二期)</p>
          </div>
        </div>
      </div>
      <div className={styles.toastNotificationsLa}>
        <div className={styles.errorToast}>
          <img src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-w3qw0rs.svg" className={styles.container12} />
          <p className={styles.text}>数据已变化，请刷新后重试</p>
        </div>
        <div className={styles.errorToast}>
          <img src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-y39zwan.svg" className={styles.container12} />
          <p className={styles.text}>保存成功</p>
        </div>
        <div className={styles.warningToast}>
          <img src="../../../shared-assets/商家端-桌面后台/02-商品/04-商品列表-Toast提示/mtib2da9-1nis7h0.svg" className={styles.container15} />
          <p className={styles.text}>登录已失效，请重新登录</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
