(function () {
  'use strict';
  var species = {
    staph:{name:'金黄色葡萄球菌',tag:'聚团 · 二分裂',color:'#ffb703',hp:12,r:10,speed:17,info:'金色菌团存活五秒就会分裂。优先吞下落单个体，给消化槽留一点余量。'},
    pneumo:{name:'荚膜肺炎链球菌',tag:'荚膜 · 抗吞噬',color:'#ff6288',hp:28,r:13,speed:22,info:'多糖荚膜让吞噬细胞难以抓牢。等 Y 形 IgG 附着，或借酸化消化产生的酸蚀波破盾，再贴近吞噬。'},
    rod:{name:'绿脓杆菌',tag:'冲刺 · 减速',color:'#70e000',hp:17,r:11,speed:52,info:'绿脓杆菌也叫铜绿假单胞菌。留意鞭毛转向，绕开冲刺留下的绿色减速区。'},
    latent:{name:'潜伏感染细胞',tag:'裂解 · 散射',color:'#ed6bae',hp:28,r:17,speed:10,info:'游戏把再激活后的裂解压缩为倒计时。它无法被整颗吞下，CTL 会优先攻击它。'},
    boss:{name:'MRSA 耐药菌王',tag:'首领 · 群体护盾',color:'#d2a1ea',hp:520,r:32,speed:18,info:'留意红色冲撞预警。菌王血量低于三成时，先拆两侧供能菌，或用破盾火力击穿双层外壳。'}
  };
  var upgrades = {
    acid:{name:'溶酶体酸化',effect:'槽位 +2，基础消化耗时 −20%，消化时释放酸蚀波。',science:'吞噬溶酶体的酸性环境有利于水解酶分解货物。'},
    actin:{name:'肌动蛋白重构',effect:'基础移速 +10%。扩大吞噬范围，远程职业提升射程与拾取距离。',science:'膜下肌动蛋白重排，推动伪足包围颗粒。'},
    ros:{name:'呼吸爆发（ROS）',effect:'每次消化释放活性氧环，升级增加半径和灼伤。',science:'吞噬细胞在呼吸爆发中生成活性氧。'},
    igg:{name:'IgG 抗体弹幕',effect:'自动发射 Y 型弹，优先标记荚膜菌；升级提高火力。',science:'IgG 的 Fc 段可被吞噬细胞的 Fc 受体识别。'},
    c3:{name:'补体 C3b 级联',effect:'每次清除产生 3 颗追踪电球，升级增强弹射伤害。',science:'C3b 沉积在微生物表面，促进调理吞噬。'},
    ctl:{name:'细胞毒性 T 细胞',effect:'召唤环绕巡逻的 CTL，优先点杀感染细胞。',science:'CTL 通过穿孔素与颗粒酶促使靶细胞凋亡。'},
    ifn:{name:'γ-干扰素增敏',effect:'增强光束与弹幕火力。命中后标记目标 3 秒，队友也能利用易伤。',science:'γ-干扰素是免疫细胞传递活化信号的一种细胞因子。'},
    mhc:{name:'抗原呈递加速',effect:'缩短主动技能与自动武器冷却。每清除 12 个敌人，额外掉落一颗金色记忆抗原。',science:'抗原呈递细胞将抗原肽展示给 T 细胞，帮助启动特异性免疫应答。'}
  };
  var supers = {
    mac:{name:'攻膜复合物 MAC',needs:['igg','c3'],effect:'锁定高生命目标破膜'},
    storm:{name:'细胞因子风暴',needs:['acid','ros'],effect:'积满四格释放范围冲击'},
    synapse:{name:'免疫突触猎杀阵',needs:['actin','ctl'],effect:'优先狙击供能菌与感染细胞'},
    matrix:{name:'单克隆精准制导矩阵',needs:['ifn','igg'],alternate:'ctl',effect:'三枚制导抗体集中追击易伤目标'}
  };
  function vulnerability(level){return level?10+10*level:0;}
  function cooldownScale(levels){return 1-.08*(levels.mhc||0);}
  var tips = {
    staph:['葡萄串又长大了？金黄色葡萄球菌在多个平面分裂，聚团是它的招牌。','吞噬体也要周转。溶酶体和它融合之后，分解才真正加速。'],
    pneumo:['又滑了一跤？多糖荚膜妨碍吞噬，IgG 调理能帮你抓稳目标。','Y 字不是小叉子。吞噬细胞识别抗体露在外面的 Fc 段。'],
    rod:['追尾了吧？铜绿假单胞菌能借鞭毛运动，生物被膜则有助于群体黏附。','绿地不好走。真实生物被膜的细胞外基质为微生物群落提供支撑。'],
    latent:['盯紧倒计时。CTL 识别感染细胞呈递的抗原肽，清除的是宿主靶细胞。','穿孔素负责开路，颗粒酶随后入场。这次该让 CTL 打头阵。'],
    virus:['颗粒已经散开了。下回让 CTL 在裂解前赶到，收拾一个靶子省事多了。'],
    boss:['菌王的金甲是游戏特效。MRSA 的耐药表型与低亲和力青霉素结合蛋白有关。'],
    clear:['你的伪足收工了。巨噬细胞还能处理并呈递抗原，把线索交给适应性免疫。']
  };
  function clock(seconds) { var n = Math.floor(seconds); var m=Math.floor(n/60);return (m<10?'0':'')+m+':'+('0'+n%60).slice(-2); }
  var heroes={
    macrophage:{name:'巨噬细胞',trait:'吞噬与消化',hp:100,speed:104,mode:'cargo',cost:0},
    neutrophil:{name:'中性粒细胞',trait:'触杀蓄网，持续耗血',hp:90,speed:128,mode:'nets',cost:150},
    nk:{name:'NK 细胞',trait:'自动光束，专攻感染',hp:85,speed:112,mode:'laser',cost:250},
    dc:{name:'树突状细胞',trait:'触手采集，召唤军团',hp:75,speed:92,mode:'summon',cost:350}
  };
  var maps={
    skin:{name:'皮肤毛细血管破口',short:'皮肤',info:'金色纤维蛋白网会减缓大型敌人与玩家。',unlock:'初始开放'},
    lung:{name:'肺泡黏液前线',short:'肺泡',info:'周期性呼吸推动单位，底部纤毛将单位向上推。',unlock:'完成第 3 关开放肺泡战场'},
    gut:{name:'肠道黏膜丛林',short:'肠道',info:'双歧杆菌会撞击敌人并掉落回血球，小心误吞。',unlock:'完成第 5 关开放无尽选图'},
    brain:{name:'血脑屏障禁区',short:'血脑屏障',info:'手动释放活性氧聚爆会消耗 8% 屏障。',unlock:'完成第 5 关开放无尽选图'}
  };
  var events={
    coffee:{label:'冰美式 · 肾上腺素飙升',info:'移速提升 30%，范围扩大 20%，消化耗时减半',duration:15,speedMult:1.3,radiusMult:1.2,digestMult:.5},
    stayup:{label:'熬夜刷手机 · 皮质醇升高',info:'增援加密，武器节奏变慢，抗原经验增加 40%',duration:15,cooldownMult:1.25,spawnMult:1.4,xpMult:1.4},
    antibiotic:{label:'广谱抗生素空投',info:'普通菌群消退，5 秒后耐药波次抵达',duration:0},
    vaccine:{label:'疫苗记忆唤醒',info:'克制技能 +1，15 秒克制伤害 +35%',duration:0}
  };
  var memorySkills={pneumo:'igg',latent:'ctl',virus:'ctl',tb:'acid',rod:'actin',staph:'ros',boss:'c3',candida:'ctl',ecoli:'igg',pylori:'ctl'};
  var achievements={overeat:'胃口太好也是病',waterloo:'滑铁卢',poison:'以毒攻毒',enemy_of_enemy:'敌人的敌人',sterile:'无菌肠道'};
  Object.assign(achievements,{precision:'精准微创外科',coffee:'早八咖啡因成瘾',night:'熬夜冠军',cutter:'断线钳工',sweep:'一发清屏',icu:'重症监护奇迹',grand:'免疫大满贯',watch:'深渊守夜人'});
  var stampHints={overeat:'满舱硬撞十五次，或在满载时阵亡。',waterloo:'不带抗体啃荚膜，连滑十跤。',poison:'扛住抗生素后的紫环反扑并通关。',enemy_of_enemy:'引导长腿 T4，裂解一次精英或首领。',sterile:'肠道通关，一口益生菌也别误吃。',precision:'脑屏障保住至少 92%，带它通关。',coffee:'喝完两杯冰美式，再活着下班。',night:'同一次熬夜，十五秒内连升两级。',cutter:'在绿线接合完成前拆散五次。',sweep:'一次主动或超武，在半秒内清掉十二只。',icu:'生命跌破 12%，再撑二十秒并获胜。',grand:'集齐四种细胞，各赢下一场战役。',watch:'深渊巡逻超过六分钟。'};
  Object.assign(achievements,{spore_breaker:'破壳消杀',true_eye:'火眼金睛',abyss_lord:'四王巡礼'});
  Object.assign(stampHints,{spore_breaker:'在倒计时内拆掉芽孢巨兽的三颗子核。',true_eye:'保留镜像，击破隐球菌真身并通关。',abyss_lord:'在同一局无尽深渊击败四种领主。'});
  Object.assign(memorySkills,{strepto:'ros',salmonella:'actin',meningo:'igg',clostrid:'acid',cmv:'ctl',acineto:'c3',boss_cdiff:'ros',boss_crypto:'igg',boss_biofilm:'ctl'});
  var bossKinds=['boss','boss_cdiff','boss_crypto','boss_biofilm'];
  function infected(k){return k==='latent'||k==='cmv';}
  function capsule(k){return k==='pneumo'||k==='meningo';}
  function cargoSlots(k){return k==='tb'||k==='clostrid'?2:1;}
  var actives={
    dash:{name:'伪足猛扑',hero:'macrophage',cd:8.5,effect:'向前突进并短暂免伤，沿路吞入最多两只，推进消化 40%。'},
    net:{name:'胞外诱捕网',hero:'neutrophil',cd:0,effect:'蓄满后定身全场约 5 秒，每秒绞杀 18 点，期间停止耗血。无尽 4 分钟后，首领约 2 秒脱困，网内触杀暂停蓄能。'},
    salvo:{name:'穿孔素过载',hero:'nk',cd:10,effect:'连续射出六道穿透光束，末段引发范围爆裂。'},
    rally:{name:'趋化集结令',hero:'dc',cd:11,effect:'召回军团守卫身边光环，四秒内攻速翻倍并牵引全场抗原。'},
    mist:{name:'高压酸雾排空',cd:14,cdStep:2,power:45,gain:20,effect:'排空消化或过载充能；扇形破荚膜、腐蚀并减速 40%。',science:'游戏将溶酶体的酸性降解改编为定向酸雾。'},
    pulse:{name:'活性氧聚爆',cd:13,cdStep:2,power:60,gain:30,effect:'击退近敌、蒸发黏液；脑图手动引爆消耗 8% 屏障。',science:'游戏将局部活性氧反应放大为战术冲击环。'},
    veil:{name:'白介素护膜',cd:18,cdStep:2.5,power:30,gain:15,effect:'四秒护盾，立即回血 15 并解除减速。',science:'游戏将细胞因子信号改编为保护膜。'}
  };
  ['mist','pulse','veil'].forEach(function(k){upgrades[k]=actives[k];});
  var entries={
    tb:['结核分枝杆菌','蜡质壳 · 慢消化','#e63946',36,12,15,'占两格，基础消化 6 秒。未酸化时可能休眠后被吐出一次；酸化可将耗时降到 2 秒。'],
    pylori:['幽门螺杆菌','氨云 · 范围庇护','#cc90ff',24,11,24,'紫色云圈保护圈内单位免受酸蚀与 ROS。近身吞噬或用单体武器清除。'],
    ecoli:['大肠杆菌','接合 · 耐药精英','#95dafa',24,11,28,'绿色接合管持续 2.5 秒会强化目标。打断连线可以阻止这轮强化。'],
    candida:['白色念珠菌','孢子 · 菌丝变形','#f9c4df',28,9,20,'孢子 8 秒后伸长为菌丝体，贴身穿刺。尽早吞噬，或交给 CTL、NETs 和 NK。'],
    strepto:['化脓性链球菌','珠链 · 断尾','#ff947c',10,10,24,'移动中的橙色珠链会在被击碎时脱下一颗尾珠，整条吞入能一次清除。'],
    salmonella:['沙门氏菌','双游 · 突袭','#eeb86b',16,10,43,'常有第二只紧跟在旁。观察短鞭毛转向，横移避开两次交错冲刺。'],
    meningo:['脑膜炎奈瑟菌','荚膜 · 微雾','#acb8ff',30,13,23,'用 IgG 或酸雾拆掉双球外的荚膜。击碎后绕开暂时留下的蓝雾。'],
    clostrid:['产气荚膜梭菌','双槽 · 气浪','#bc95ba',34,13,18,'吞入时预留两格消化舱。武器击碎它会将附近单位推开。'],
    cmv:['巨细胞感染母体','宿主细胞 · 双环裂解','#a5a0ff',48,20,11,'双环倒计时结束后散出两圈颗粒。用 NK 或 CTL 优先处理。'],
    acineto:['鲍曼不动杆菌','盾卫 · 天生耐药','#a6c9d7',34,12,14,'钢蓝盾卫出现时有短时护甲，外围紫环持续减伤。穿透或吞噬能绕过护甲。'],
    boss_cdiff:['艰难梭菌 · 芽孢巨兽','首领 · 芽孢再生','#d5bb79',520,31,22,'绕开琥珀色酸滩，准备连续两次侧移。休眠期在八秒内拆掉三颗子核，巨兽会陷入虚弱。'],
    boss_crypto:['新型隐球菌 · 巨荚膜母体','首领 · 潮汐镜像','#d3a4ee',520,32,18,'击穿荚膜，沿着缺口穿过潮汐弹环。末阶段认准发出金光的真身。'],
    boss_biofilm:['超级铜绿 · 生物被膜母巢','首领 · 菌膜共鸣','#75dfbd',520,33,20,'绿色菌膜加速敌军。横移避开四面交叉的援军，切断共鸣线以削弱母巢护甲。'],
    phage:['T4 噬菌体','友军 · 贴附裂解','#91ffda',1,10,22,'触碰即可引导它锁定高血量敌人。游戏把 T4 的宿主范围扩展为彩蛋打击效果。'],
    bifido:['双歧杆菌','益生菌 · 回血','#bbef97',1,9,34,'留它在肠道巡游，它会协助清除敌人。误吞将占用消化舱 3 秒。']
  };
  Object.keys(entries).forEach(function(k){var a=entries[k];species[k]={name:a[0],tag:a[1],color:a[2],hp:a[3],r:a[4],speed:a[5],info:a[6]};});
  var atlasInfo={
    staph:['Staphylococcus aureus','B','抱团出镜','金色一串看着好吃，空槽不够就该松口。'],
    pneumo:['Streptococcus pneumoniae','A','荚膜滑手','它的多糖外衣很滑，调理抗体才是你的防滑手套。'],
    rod:['Pseudomonas aeruginosa','A','鞭毛飙车','旗杆一甩就转弯。穿过它的黏液，追尾的多半是你。'],
    latent:['Virus-infected host cell','A','倒计时警报','裂解环跑完一圈，现场就从一个靶子变成八个。'],
    boss:['Methicillin-resistant S. aureus','S','首领护盾','紫环加成是这局菌王的招牌，清掉小怪再追核心。'],
    tb:['Mycobacterium tuberculosis','S','消化钉子户','一位客人占两张桌，酸化以后才能加快翻台。'],
    pylori:['Helicobacter pylori','A','氨云保护伞','一团紫云撑起小区保护伞，先拆伞心。'],
    ecoli:['Escherichia coli','A','质粒交换生','绿线不是友谊线，读条完毕，邻居就穿上了护甲。'],
    candida:['Candida albicans','A','八秒变身','刚才还是一颗孢子，转眼已经长出了穿刺长矛。'],
    strepto:['Streptococcus pyogenes','B','珠链断尾','击碎前排，留意背后脱落的短链。'],
    salmonella:['Salmonella enterica','B','成对突袭','躲过第一只，再看第二只从哪边来。'],
    meningo:['Neisseria meningitidis','A','双球微雾','蓝色微雾散去后再回头拾取抗原。'],
    clostrid:['Clostridium perfringens','A','气浪鼓手','预留两格，或者借一阵气浪挪开菌群。'],
    cmv:['CMV-infected host cell','S','双层倒计时','盯住猫头鹰眼，在两个光环合拢前动手。'],
    acineto:['Acinetobacter baumannii','A','天生盾卫','紫环后面，往往还藏着更脆弱的靶子。'],
    boss_cdiff:['Clostridioides difficile','S','三核倒计时','八秒之内打碎三颗琥珀核，迎接破壳窗口。'],
    boss_crypto:['Cryptococcus neoformans','S','潮汐镜像','锁定闪金核，别让半透明的影子带走火力。'],
    boss_biofilm:['Pseudomonas aeruginosa','S','共鸣网络','追着青色连线找护卫，拆光它们再打母巢。'],
    phage:['Escherichia phage T4','B','敌人的敌人','长腿小卫星报到。碰一下，给它派个靶子。'],
    bifido:['Bifidobacterium spp.','B','肠道好邻居','别把队友塞进消化舱。留着它巡逻，回血球更划算。']
  };
  Object.keys(species).forEach(function(k){
    var a=atlasInfo[k];species[k].latin=a[0];species[k].danger=a[1];species[k].tags=['#'+a[2],'#'+species[k].tag.split(' · ')[0]];
    species[k].roast=a[3];species[k].milestones=[10,50,200];
    if(!tips[k])tips[k]=[a[3]];
  });
  tips.timeout=['实训时间已到。盯住关底标记，优先处理首领，再把火力留给周围的菌群。'];
  tips.barrier=['屏障先一步失守。换用 IgG、补体和 CTL，把伤害集中在单个目标。'];
  tips.bleed=['中性粒细胞巡逻时持续耗血。及时接触小怪补充生命，才能等到下一张网。'];
  upgrades.turret={name:'B 细胞抗体炮台',effect:'部署自动发射抗体的友军，升级增加召唤数量。',science:'B 细胞可分化为分泌抗体的浆细胞。'};
  var thresholds=[5,8,12,18,25,34,45,58,73,92,108,136,172,194];
  function nextXP(level){return level<=thresholds.length?thresholds[level-1]:194+(level-14)*45+7*Math.pow(level-14,2);}
  function antigenValue(e,digested){
    if(bossKinds.indexOf(e.kind)>=0)return 9;
    if(e.cloned)return .5;
    if(['tb','pylori','ecoli','candida','latent','cmv','clostrid','meningo'].indexOf(e.kind)>=0||e.resistant)return digested?3:2.5;
    return digested?1.5:1;
  }
  // Display ranks describe an upgrade at rest. The pause instruments map the live
  // simulation values separately, so event buffs never change a skill's level.
  function upperTier(value,edges){
    for(var i=0;i<edges.length;i++)if(value<=edges[i])return i+1;
    return edges.length+1;
  }
  function speedTier(speed){return upperTier(speed,[96,108,120,131,144,158,172]);}
  function reachTier(radius){return upperTier(radius,[13.5,16,18.5,21.5]);}
  function digestTier(seconds){return upperTier(-seconds,[-1.70,-1.35,-1.00,-.75]);}
  var growth={ros:['威力','范围',0,1],igg:['威力','射速',0,1],ctl:['威力','攻速',1,1]};
  function attributes(k,level,hero){
    var h=(typeof hero==='string'?heroes[hero]:hero)||heroes.macrophage;
    var a=actives[k],pair=growth[k];
    if(pair)return [[pair[0],level+pair[2],'档'],[pair[1],level+pair[3],'档']];
    if(k==='actin')return [['移速',Math.min(8,speedTier(h.speed)+level),'档'],[h.mode==='cargo'?'吞噬':'射程',Math.min(5,1+level),'档']];
    if(k==='acid')return h.mode==='nets'?[['每',4,'次触杀'],['酸伤',level,'档']]:
      [['容量',5+level*2,'槽'],['消化',Math.min(5,1+level),'档']];
    if(k==='c3')return [['',3,'颗追踪球'],['威力',level,'档']];
    if(k==='ifn')return [['火力',5*level,'%'],['易伤',vulnerability(level),'%']];
    if(k==='mhc')return [['冷却缩短',8*level,'%'],['记忆抗原',1,'颗/12次']];
    if(k==='turret')return [['',Math.floor((1+level)*2.5),'座哨卫'],['威力',level,'档']];
    if(a&&!a.hero)return [[k==='veil'?'护盾':'威力',level,'档'],['冷却',Math.ceil(a.cd-a.cdStep*(level-1)),'秒']];
    return [];
  }
  function metricText(m){
    return (m[0]?m[0]+' ':'')+m[1]+m[2];
  }
  function tierDesc(k,level,hero){
    var a=actives[k];
    if(a&&a.hero)return k==='net'?'触杀蓄能 100%':'冷却 '+Math.ceil(a.cd)+'秒';
    if(!level&&k!=='actin'&&k!=='acid'&&k!=='turret')return '待解锁';
    return attributes(k,level,hero).map(metricText).join(' · ');
  }
  function upgradeDelta(k,from,to,hero){
    var base=attributes(k,from,hero),next=attributes(k,to,hero);
    if(!from&&k!=='actin'&&k!=='acid'&&k!=='turret')return '解锁：'+tierDesc(k,to,hero);
    return next.map(function(m,i){
      var old=base[i][1];
      if(old===m[1]||(!from&&old===0))return metricText(m);
      if(k==='turret'&&!i)return '哨卫 '+old+'▸'+m[1]+'座';
      return (m[0]&&m[0]!=='容量'?m[0]+' ':'')+old+m[2]+'▸'+m[1]+m[2];
    }).join(' · ');
  }
  window.DisplayTier={speedTier:speedTier,reachTier:reachTier,digestTier:digestTier,tierDesc:tierDesc,upgradeDelta:upgradeDelta};
  window.ImmuneData = {bossKinds:bossKinds,capsule:capsule,cargoSlots:cargoSlots,infected:infected,vulnerability:vulnerability,cooldownScale:cooldownScale,actives:actives,stampHints:stampHints,nextXP:nextXP,antigenValue:antigenValue,heroes:heroes,maps:maps,events:events,achievements:achievements,memorySkills:memorySkills,species:species,upgrades:upgrades,supers:supers,tips:tips,clock:clock};
}());
