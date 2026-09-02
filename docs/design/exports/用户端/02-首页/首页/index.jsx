import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.bottomNavBar}>
        <div className={styles.linkHomeActive}>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bwr-ima8nb9.svg" className={styles.container} />
          <p className={styles.text}>首页</p>
        </div>
        <div className={styles.linkMessages}>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-mhmlhnt.svg" className={styles.container2} />
          <p className={styles.text2}>消息</p>
          <div className={styles.backgroundBorder} />
        </div>
        <div className={styles.linkOrders}>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-0nh4ic5.svg" className={styles.container3} />
          <p className={styles.text2}>订单</p>
        </div>
        <div className={styles.linkProfile}>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-v2rs30q.svg" className={styles.container4} />
          <p className={styles.text2}>个人中心</p>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.container7}>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-jyaw6me.svg" className={styles.container5} />
          <p className={styles.text3}>天津大学软件园校区</p>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-s70mmrx.svg" className={styles.container6} />
        </div>
        <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-t59czj3.svg" className={styles.container8} />
      </div>
      <div className={styles.main}>
        <div className={styles.input}>
          <div className={styles.container9}>
            <p className={styles.text4}>搜索附近美食、商家</p>
          </div>
          <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-r339mz9.svg" className={styles.icon} />
          <div className={styles.button}>
            <p className={styles.text5}>搜索</p>
          </div>
        </div>
        <div className={styles.kingKongGridCategori}>
          <div className={styles.autoWrapper}>
            <div className={styles.container11}>
              <div className={styles.background}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-gzi52e9.svg"
                  className={styles.container10}
                />
              </div>
              <p className={styles.text6}>川菜</p>
            </div>
            <div className={styles.container13}>
              <div className={styles.background2}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-mwri667.svg"
                  className={styles.container12}
                />
              </div>
              <p className={styles.text6}>快餐</p>
            </div>
          </div>
          <div className={styles.autoWrapper2}>
            <div className={styles.container15}>
              <div className={styles.background3}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-eped4m1.svg"
                  className={styles.container14}
                />
              </div>
              <p className={styles.text6}>鲁菜</p>
            </div>
            <div className={styles.container17}>
              <div className={styles.background4}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-icbf7xt.svg"
                  className={styles.container16}
                />
              </div>
              <p className={styles.text6}>汉堡炸鸡</p>
              <div className={styles.background5}>
                <p className={styles.text7}>特价</p>
              </div>
            </div>
          </div>
          <div className={styles.autoWrapper3}>
            <div className={styles.container19}>
              <div className={styles.background6}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-z50fpkr.svg"
                  className={styles.container18}
                />
              </div>
              <p className={styles.text6}>东北菜</p>
            </div>
            <div className={styles.container21}>
              <div className={styles.background7}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-oyx5dlc.svg"
                  className={styles.container20}
                />
              </div>
              <p className={styles.text6}>烧烤</p>
            </div>
          </div>
          <div className={styles.autoWrapper4}>
            <div className={styles.container23}>
              <div className={styles.background8}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-i6v6xiy.svg"
                  className={styles.container22}
                />
              </div>
              <p className={styles.text6}>粤菜</p>
            </div>
            <div className={styles.container25}>
              <div className={styles.background9}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-ae0nk61.svg"
                  className={styles.container24}
                />
              </div>
              <p className={styles.text6}>火锅</p>
            </div>
          </div>
          <div className={styles.autoWrapper5}>
            <div className={styles.container27}>
              <div className={styles.background10}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-74tllnu.svg"
                  className={styles.container26}
                />
              </div>
              <p className={styles.text6}>湘菜</p>
            </div>
            <div className={styles.container28}>
              <div className={styles.background11}>
                <img
                  src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-3zkr7ld.svg"
                  className={styles.container20}
                />
              </div>
              <p className={styles.text6}>甜品饮品</p>
            </div>
          </div>
        </div>
        <div className={styles.promotionalBentoGrid}>
          <div className={styles.backgroundOverlayBlu}>
            <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bx1-zkkfqlv.png" className={styles.image} />
            <p className={styles.text8}>天天特价</p>
            <p className={styles.text9}>低至5折起</p>
            <div className={styles.buttonMargin}>
              <div className={styles.button2}>
                <p className={styles.text10}>立即抢</p>
              </div>
            </div>
          </div>
          <div className={styles.backgroundOverlayBlu2}>
            <div className={styles.container29}>
              <p className={styles.text11}>新店尝鲜</p>
              <p className={styles.text12}>大牌入驻 免费配送</p>
            </div>
            <div className={styles.buttonMargin2}>
              <div className={styles.button3}>
                <p className={styles.text13}>去看</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.sectionTitle}>
          <div className={styles.container30}>
            <div className={styles.background12} />
            <p className={styles.text14}>附近优选商家</p>
          </div>
          <div className={styles.container32}>
            <p className={styles.text15}>筛选</p>
            <img
              src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-4tlzf5m.svg"
              className={styles.container31}
            />
          </div>
        </div>
        <div className={styles.merchantList}>
          <div className={styles.merchantCard1}>
            <div className={styles.background14}>
              <div className={styles.background13}>
                <p className={styles.text16}>老店</p>
              </div>
            </div>
            <div className={styles.container38}>
              <p className={styles.text17}>老王小店 (软件园店)</p>
              <div className={styles.container35}>
                <div className={styles.container34}>
                  <img
                    src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-tjzifn6.svg"
                    className={styles.container33}
                  />
                  <p className={styles.text18}>4.7</p>
                </div>
                <p className={styles.text19}>月售 2000+</p>
              </div>
              <div className={styles.container36}>
                <p className={styles.text20}>起送 ¥15</p>
                <div className={styles.verticalDivider} />
                <p className={styles.text20}>配送 ¥0</p>
                <div className={styles.verticalDivider} />
                <p className={styles.text20}>25分钟</p>
              </div>
              <div className={styles.container37}>
                <div className={styles.border}>
                  <p className={styles.text21}>满20减5</p>
                </div>
                <div className={styles.border2}>
                  <p className={styles.text22}>支持自取</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.merchantCard2}>
            <div className={styles.background16}>
              <div className={styles.background15}>
                <p className={styles.text16}>品牌</p>
              </div>
            </div>
            <div className={styles.container42}>
              <p className={styles.text17}>肯德基宅急送 (大学城店)</p>
              <div className={styles.container35}>
                <div className={styles.container34}>
                  <img
                    src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-tjzifn6.svg"
                    className={styles.container33}
                  />
                  <p className={styles.text18}>4.9</p>
                </div>
                <p className={styles.text19}>月售 5000+</p>
              </div>
              <div className={styles.container40}>
                <div className={styles.container39}>
                  <p className={styles.text20}>起送 ¥20</p>
                  <div className={styles.verticalDivider} />
                  <p className={styles.text20}>配送 ¥6</p>
                </div>
                <p className={styles.text20}>30分钟 800m</p>
              </div>
              <div className={styles.container41}>
                <div className={styles.border3}>
                  <p className={styles.text23}>0元起送</p>
                </div>
                <div className={styles.border2}>
                  <p className={styles.text22}>会员特权</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.merchantCard3}>
            <div className={styles.background17}>
              <div className={styles.background15}>
                <p className={styles.text16}>品牌</p>
              </div>
            </div>
            <div className={styles.container43}>
              <p className={styles.text17}>麦当劳 (大学城店)</p>
              <div className={styles.container35}>
                <div className={styles.container34}>
                  <img
                    src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-tjzifn6.svg"
                    className={styles.container33}
                  />
                  <p className={styles.text18}>4.8</p>
                </div>
                <p className={styles.text19}>月售 8000+</p>
              </div>
              <div className={styles.container40}>
                <div className={styles.container39}>
                  <p className={styles.text20}>起送 ¥20</p>
                  <div className={styles.verticalDivider} />
                  <p className={styles.text20}>配送 ¥0</p>
                </div>
                <p className={styles.text20}>30分钟</p>
              </div>
              <div className={styles.container37}>
                <div className={styles.border}>
                  <p className={styles.text21}>满30减15</p>
                </div>
                <div className={styles.border2}>
                  <p className={styles.text22}>首单立减</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.merchantCard4}>
            <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bx1-e7ejhxg.png" className={styles.image2} />
            <div className={styles.container44}>
              <p className={styles.text17}>老胖烧烤 (夜市街)</p>
              <div className={styles.container35}>
                <div className={styles.container34}>
                  <img
                    src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-tjzifn6.svg"
                    className={styles.container33}
                  />
                  <p className={styles.text18}>4.6</p>
                </div>
                <p className={styles.text19}>月售 3000+</p>
              </div>
              <div className={styles.container36}>
                <p className={styles.text20}>起送 ¥30</p>
                <div className={styles.verticalDivider} />
                <p className={styles.text20}>配送 ¥3</p>
                <div className={styles.verticalDivider} />
                <p className={styles.text20}>40分钟</p>
              </div>
              <div className={styles.container41}>
                <div className={styles.border3}>
                  <p className={styles.text23}>夜宵首选</p>
                </div>
                <div className={styles.border2}>
                  <p className={styles.text22}>支持预订</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.merchantCard5Margin}>
            <div className={styles.merchantCard4}>
              <img src="../../../shared-assets/用户端/02-首页/首页/mppd3bx1-eatnjuz.png" className={styles.image2} />
              <div className={styles.container44}>
                <p className={styles.text17}>元盛居火锅 (科创园店)</p>
                <div className={styles.container35}>
                  <div className={styles.container34}>
                    <img
                      src="../../../shared-assets/用户端/02-首页/首页/mppd3bws-tjzifn6.svg"
                      className={styles.container33}
                    />
                    <p className={styles.text18}>4.9</p>
                  </div>
                  <p className={styles.text19}>月售 1500+</p>
                </div>
                <div className={styles.container36}>
                  <p className={styles.text20}>起送 ¥50</p>
                  <div className={styles.verticalDivider} />
                  <p className={styles.text20}>配送 ¥5</p>
                  <div className={styles.verticalDivider} />
                  <p className={styles.text20}>45分钟</p>
                </div>
                <div className={styles.container41}>
                  <div className={styles.border3}>
                    <p className={styles.text23}>聚餐推荐</p>
                  </div>
                  <div className={styles.border2}>
                    <p className={styles.text22}>全城送</p>
                  </div>
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
