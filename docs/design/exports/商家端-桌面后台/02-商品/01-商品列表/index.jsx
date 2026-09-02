import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.container6}>
        <div className={styles.headerSection}>
          <p className={styles.text}>商品列表</p>
          <p className={styles.text2}>管理本店铺在售商品与库存。</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.container2}>
            <p className={styles.text3}>所属分类:</p>
            <div className={styles.imageClip}>
              <img src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-keukew6.svg" className={styles.image} />
              <p className={styles.text4}>全部分类</p>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-kbi3h9n.svg"
                className={styles.container}
              />
            </div>
          </div>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-mtnk75e.svg"
              className={styles.container3}
            />
            <p className={styles.text5}>新增商品</p>
          </div>
        </div>
        <div className={styles.tableCard}>
          <div className={styles.table}>
            <div className={styles.row}>
              <div className={styles.cell}>
                <p className={styles.text6}>商品名称</p>
              </div>
              <div className={styles.cell2}>
                <p className={styles.text6}>分类</p>
              </div>
              <div className={styles.cell3}>
                <p className={styles.text6}>价格</p>
              </div>
              <div className={styles.cell4}>
                <p className={styles.text6}>库存</p>
              </div>
              <div className={styles.cell2}>
                <p className={styles.text6}>状态</p>
              </div>
              <div className={styles.cell5}>
                <p className={styles.text6}>上架</p>
              </div>
              <div className={styles.cell5}>
                <p className={styles.text6}>操作</p>
              </div>
            </div>
            <div className={styles.body}>
              <div className={styles.row1}>
                <div className={styles.data}>
                  <div className={styles.imageBorder} />
                  <p className={styles.text7}>香酥鸡腿堡套餐</p>
                </div>
                <p className={styles.text8}>单人套餐</p>
                <p className={styles.text9}>¥ 28.50</p>
                <p className={styles.text10}>150</p>
                <div className={styles.data2}>
                  <div className={styles.overlay}>
                    <p className={styles.text11}>在售</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row2}>
                <div className={styles.data4}>
                  <div className={styles.imageBorder2} />
                  <p className={styles.text7}>招牌手打柠檬茶</p>
                </div>
                <p className={styles.text8}>饮品</p>
                <p className={styles.text9}>¥ 12.00</p>
                <p className={styles.text10}>99+</p>
                <div className={styles.data2}>
                  <div className={styles.overlay}>
                    <p className={styles.text11}>在售</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row3SoldOut}>
                <div className={styles.data5}>
                  <div className={styles.imageBorder3} />
                  <p className={styles.text13}>大份黄金薯条</p>
                </div>
                <p className={styles.text8}>小食</p>
                <p className={styles.text9}>¥ 15.00</p>
                <p className={styles.text14}>0</p>
                <div className={styles.data6}>
                  <div className={styles.overlay2}>
                    <p className={styles.text15}>售罄</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row4}>
                <div className={styles.data7}>
                  <div className={styles.imageBorder4} />
                  <p className={styles.text7}>豚骨拉面</p>
                </div>
                <p className={styles.text8}>热销爆款</p>
                <p className={styles.text9}>¥ 32.00</p>
                <img src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-w3hsgb8.svg" className={styles.data8} />
                <div className={styles.data2}>
                  <div className={styles.overlay}>
                    <p className={styles.text11}>在售</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row5OffShelf}>
                <div className={styles.data9}>
                  <div className={styles.backgroundImageBorde} />
                  <p className={styles.text16}>草莓芝士蛋糕 (季节限定)</p>
                </div>
                <p className={styles.text17}>甜点</p>
                <p className={styles.text18}>¥ 22.00</p>
                <p className={styles.text19}>0</p>
                <div className={styles.data10}>
                  <div className={styles.background2}>
                    <p className={styles.text20}>已下架</p>
                  </div>
                </div>
                <div className={styles.data11}>
                  <div className={styles.input2}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row6}>
                <div className={styles.data12}>
                  <div className={styles.imageBorder5} />
                  <p className={styles.text7}>劲辣鸡米花</p>
                </div>
                <p className={styles.text8}>小食</p>
                <p className={styles.text9}>¥ 18.00</p>
                <p className={styles.text10}>120</p>
                <div className={styles.data2}>
                  <div className={styles.overlay}>
                    <p className={styles.text11}>在售</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row7}>
                <div className={styles.data13}>
                  <div className={styles.imageBorder6} />
                  <p className={styles.text7}>冰摇鲜奶抹茶</p>
                </div>
                <p className={styles.text8}>饮品</p>
                <p className={styles.text9}>¥ 16.00</p>
                <img
                  src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-0lvmm3w.svg"
                  className={styles.data14}
                />
                <div className={styles.data2}>
                  <div className={styles.overlay}>
                    <p className={styles.text11}>在售</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
              <div className={styles.row8SoldOut}>
                <div className={styles.data15}>
                  <div className={styles.imageBorder7} />
                  <p className={styles.text13}>招牌肥牛便当</p>
                </div>
                <p className={styles.text8}>热销爆款</p>
                <p className={styles.text9}>¥ 26.00</p>
                <p className={styles.text14}>0</p>
                <div className={styles.data6}>
                  <div className={styles.overlay2}>
                    <p className={styles.text15}>售罄</p>
                  </div>
                </div>
                <div className={styles.data3}>
                  <div className={styles.input}>
                    <div className={styles.background} />
                  </div>
                </div>
                <p className={styles.text12}>编辑</p>
              </div>
            </div>
          </div>
          <div className={styles.pagination}>
            <p className={styles.text21}>共 12 条，每页 10 条</p>
            <div className={styles.container5}>
              <div className={styles.button2}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-7l3cqyf.svg"
                  className={styles.container4}
                />
              </div>
              <div className={styles.button3}>
                <p className={styles.text22}>1</p>
              </div>
              <p className={styles.text23}>2</p>
              <div className={styles.button2}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-vubmeu8.svg"
                  className={styles.container4}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text24}>校园外卖商家后台</p>
        <div className={styles.container10}>
          <div className={styles.overlayBorder}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-k960wkr.svg"
              className={styles.container7}
            />
            <p className={styles.text25}>营业中</p>
          </div>
          <div className={styles.container8}>
            <div className={styles.backgroundBorder}>
              <img src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vg0-qv0lbh7.png" className={styles.avatar} />
            </div>
            <p className={styles.text26}>账号名</p>
          </div>
          <div className={styles.button4}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-wli0i8l.svg"
              className={styles.container9}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.container12}>
          <div className={styles.heading1}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-0rsai3r.svg"
              className={styles.container11}
            />
            <p className={styles.text27}>
              校园外卖商
              <br />
              家后台
            </p>
          </div>
          <p className={styles.text28}>店铺管理端</p>
        </div>
        <div className={styles.container15}>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-f7owh69.svg"
              className={styles.container13}
            />
            <p className={styles.text29}>订单</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-bv6ln0i.svg"
              className={styles.container13}
            />
            <p className={styles.text30}>商品</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-e8hjop8.svg"
              className={styles.container14}
            />
            <p className={styles.text29}>分类</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-thkirqp.svg"
              className={styles.container13}
            />
            <p className={styles.text29}>店铺设置</p>
          </div>
        </div>
        <div className={styles.margin}>
          <div className={styles.horizontalBorder}>
            <div className={styles.link4}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-g10gp1q.svg"
                className={styles.container16}
              />
              <p className={styles.text31}>概览 (二期)</p>
            </div>
            <div className={styles.link5}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfr-1ttexem.svg"
                className={styles.container17}
              />
              <p className={styles.text31}>消息 (二期)</p>
            </div>
            <div className={styles.link4}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/01-商品列表/mtib1vfs-kisjlno.svg"
                className={styles.container16}
              />
              <p className={styles.text31}>统计 (二期)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
