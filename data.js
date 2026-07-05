// data.js — 动作库 + 训练模板
// Phase 切换只改这个文件：更新 PHASE、SCHEDULE、TMPLS、EX_INFO

const PHASE = {
  num: 1,
  label: "Phase 1 试运行",
  startDate: "2026-06-22",
  endDate: "2026-07-15",
  testEndDate: "2026-07-15",
  officialStartDate: "2026-09-01",
  focus: "数据中心底座、可衡量目标、训练模板稳定性",
};

const SCHEDULE = [
  { d: "2026-06-22", rec: "L" },
  { d: "2026-06-23", rec: null },
  { d: "2026-06-24", rec: "B" },   // 背部（原 U）
  { d: "2026-06-25", rec: null },
  { d: "2026-06-26", rec: "L" },
  { d: "2026-06-27", rec: "AR" },
  { d: "2026-06-28", rec: null },
  { d: "2026-06-29", rec: "C" },   // 胸部
  { d: "2026-06-30", rec: null },
  { d: "2026-07-01", rec: "L" },
  { d: "2026-07-02", rec: null },
  { d: "2026-07-03", rec: "S" },   // 肩部
  { d: "2026-07-04", rec: "AR" },
  { d: "2026-07-05", rec: null },
  { d: "2026-07-06", rec: "L" },
  { d: "2026-07-07", rec: "B" },   // 背部（第二轮）
  { d: "2026-07-08", rec: "L" },
  { d: "2026-07-09", rec: null },
  { d: "2026-07-10", rec: "C" },
  { d: "2026-07-11", rec: "AR" },
  { d: "2026-07-12", rec: null },
  { d: "2026-07-13", rec: "L" },
  { d: "2026-07-14", rec: "S" },
  { d: "2026-07-15", rec: "L" },
];

const DEFAULT_GOALS = [
  { id: "body", name: "体重 / 体脂", metric: "体重、体脂、腰围每周记录", target: "先建立稳定趋势，不做极端减脂", cadence: "每周 1 次" },
  { id: "aerobic", name: "有氧能力", metric: "Zone 2 时长、平均心率、同心率体感", target: "每周 2 次低强度有氧或主动恢复", cadence: "每周汇总" },
  { id: "adherence", name: "训练完成度", metric: "计划训练完成率、核心/拉伸完成率", target: "Phase 1 测试期优先保证动作质量", cadence: "每日记录" },
  { id: "pain", name: "伤病维护", metric: "腰髋、右肩、右膝、右肘 1-10 分", target: "疼痛不升级，异常时降级模板", cadence: "训练后或每周" },
  { id: "sport", name: "运动表现", metric: "徒步、游泳、羽毛球、骑行的时长、心率、疲劳", target: "先记录基线，9月后作为正式指标", cadence: "每次运动后" },
];

const MODULE_LABELS = {
  warmup: "热身",
  main: "主训练",
  cardio: "有氧",
  core: "核心",
  stretch: "拉伸/收尾",
};

// 训练模板
const TMPLS = {
  // ── L 类：腰椎激活 + Zone 2 有氧 ──────────────────
  L: {
    label: "L 类", sub: "腰椎 + Zone 2", icon: "🌿", color: "gn",
    warn: "任何腰部不适 → 立即停止，切换为步行",
    sections: [
      { module: "warmup", title: "腰椎激活热身", dot: "gn", exs: [
        { id: "cat_cow",   sets: 2, reps: 10, ru: "次",    type: "mob", note: "缓慢，感受每一节段" },
        { id: "bird_dog",  sets: 2, reps: 10, ru: "次/边", type: "mob", note: "保持中立位，不过度伸展" },
        { id: "dead_bug",  sets: 2, reps: 8,  ru: "次/边", type: "mob", note: "腰部贴地，不憋气" },
        { id: "clamshell", sets: 2, reps: 15, ru: "次/边", type: "mob", note: "激活臀中肌" },
        { id: "hip_90_90", sets: 1, reps: 8, ru: "次/边", type: "mob", note: "髋关节温和活动，不追求幅度" },
        { id: "terminal_knee_ext", sets: 1, reps: 12, ru: "次/边", type: "mob", note: "右膝内侧无痛范围内做" },
      ]},
      { module: "cardio", title: "Zone 2 有氧（三选一）", dot: "gn", exs: [
        { id: "zone2_run", type: "cardio", durLabel: "30–35分钟", hrLabel: "目标 130–150bpm", note: "跑步 / 椭圆机 / 游泳三选一；前5分钟热身<140bpm；腰不适即改步行" },
      ]},
      { module: "stretch", title: "收尾拉伸", dot: "gn", exs: [
        { id: "hip_flex_str", type: "mob", sets: 1, dur: "1分钟/边" },
        { id: "piriform_str", type: "mob", sets: 1, dur: "45秒/边" },
        { id: "adductor_rockback", type: "mob", sets: 1, reps: 10, ru: "次/边" },
      ]},
    ],
  },

  // ── B 类：背部力量 ──────────────────────────────────
  B: {
    label: "B 类", sub: "背部厚度", icon: "🔵", color: "bl",
    warn: "背厚度优先：划船类动作不借腰；杠铃划船当天腰髋不适即改坐姿划船",
    sections: [
      { module: "warmup", title: "背部热身", dot: "bl", exs: [
        { id: "cat_cow",      sets: 1, reps: 10, ru: "次",  type: "mob", note: "唤醒脊柱" },
        { id: "thoracic_ext", type: "mob", sets: 1, dur: "2分钟", note: "泡沫轴，重点打开胸椎" },
        { id: "face_pull",    sets: 2, reps: 15, ru: "次",  type: "mob", note: "激活后束 + 外旋肌群" },
        { id: "forearm_pronation", sets: 1, reps: 12, ru: "次/边", type: "mob", note: "右肘热身，轻重量或徒手" },
      ]},
      { module: "main", title: "主训练：背部厚度四动作", dot: "bl", exs: [
        { id: "pullup_assisted", sets: 3, reps: 8, ru: "次", type: "str", note: "可用辅助引体；右肘不适时降级为高位下拉" },
        { id: "lat_pulldown",    sets: 4, reps: 10, ru: "次", type: "str", note: "保留背阔和背宽刺激，不大幅后仰" },
        { id: "cable_row", sets: 4, reps: 10, ru: "次", type: "str", note: "背厚度主力，肩胛后收，顶峰停1秒" },
        { id: "barbell_row", sets: 3, reps: 8, ru: "次", type: "str", note: "谨慎动作：腰髋状态不好时改坐姿划船或器械划船" },
      ]},
      { module: "core", title: "核心收尾", dot: "bl", exs: [
        { id: "plank",      type: "mob", sets: 2, dur: "30秒" },
        { id: "bird_dog_f", sets: 2, reps: 8, ru: "次/边", type: "mob" },
      ]},
      { module: "stretch", title: "拉伸/收尾", dot: "bl", exs: [
        { id: "lat_str", type: "mob", sets: 1, dur: "45秒/边" },
        { id: "pec_door_str", type: "mob", sets: 1, dur: "45秒/边" },
        { id: "wrist_extensor_str", type: "mob", sets: 1, dur: "30秒/边" },
      ]},
    ],
  },

  // ── C 类：胸部力量 ──────────────────────────────────
  C: {
    label: "C 类", sub: "胸部力量", icon: "🔴", color: "rd",
    warn: "全程中立握（掌心相对），保护右肘；杠铃卧推本阶段禁止",
    sections: [
      { module: "warmup", title: "胸部热身", dot: "rd", exs: [
        { id: "thoracic_ext", type: "mob", sets: 1, dur: "2分钟", note: "泡沫轴开胸，为推胸做准备" },
        { id: "face_pull",    sets: 2, reps: 15, ru: "次", type: "mob", note: "稳定肩关节后侧" },
        { id: "ytw",          sets: 1, reps: 10, ru: "次", type: "mob", note: "哑铃 2–3kg，激活肩胛" },
        { id: "wrist_extensor_str", type: "mob", sets: 1, dur: "30秒/边", note: "右肘紧时必做，力度轻" },
      ]},
      { module: "main", title: "主训练：胸部四动作", dot: "rd", exs: [
        { id: "incline_db", sets: 4, reps: 10, ru: "次", type: "str", note: "凳角30°，中立握，离心控制2–3秒" },
        { id: "machine_chest_press", sets: 4, reps: 10, ru: "次", type: "str", note: "优先中立握，右肘无感再加重量" },
        { id: "cable_fly", sets: 3, reps: 15, ru: "次", type: "str", note: "高位绳索，顶峰夹紧1秒" },
        { id: "incline_pushup", sets: 3, reps: 10, ru: "次", type: "str", note: "可用史密斯杆/高箱，保持核心稳定" },
      ]},
      { module: "core", title: "核心收尾", dot: "rd", exs: [
        { id: "plank",    type: "mob", sets: 2, dur: "30秒" },
        { id: "dead_bug", sets: 2, reps: 8, ru: "次/边", type: "mob", note: "腰背贴地，稳定核心" },
      ]},
      { module: "stretch", title: "拉伸/收尾", dot: "rd", exs: [
        { id: "pec_door_str", type: "mob", sets: 1, dur: "60秒/边" },
        { id: "child_pose", type: "mob", sets: 1, dur: "60秒" },
        { id: "wrist_flexor_str", type: "mob", sets: 1, dur: "30秒/边" },
      ]},
    ],
  },

  // ── S 类：肩部训练 ──────────────────────────────────
  S: {
    label: "S 类", sub: "肩部训练", icon: "🟠", color: "am",
    warn: "Phase 1 不做推举（右肩 + 腰椎）；右肩不适立即降重或停止",
    sections: [
      { module: "warmup", title: "肩部热身（充分）", dot: "am", exs: [
        { id: "thoracic_ext", type: "mob", sets: 1, dur: "2分钟", note: "胸椎打开是肩部动作的前提" },
        { id: "face_pull",    sets: 3, reps: 15, ru: "次", type: "mob", note: "3组，比平时多一组，充分激活" },
        { id: "ytw",          sets: 2, reps: 10, ru: "次", type: "mob", note: "哑铃 2–5kg，肩胛骨全参与" },
        { id: "scap_wall_slide", sets: 1, reps: 10, ru: "次", type: "mob", note: "肩胛上旋，避免耸肩" },
      ]},
      { module: "main", title: "主训练：肩部四动作", dot: "am", exs: [
        { id: "lat_raise", sets: 4, reps: 12, ru: "次", type: "str", note: "轻重量！肘微屈，不超肩高，右肩优先感受" },
        { id: "cable_lat_raise", sets: 3, reps: 12, ru: "次/边", type: "str", note: "更稳定，右肩不适时优先用它" },
        { id: "rear_delt_fly", sets: 4, reps: 15, ru: "次", type: "str", note: "后束是肩关节保护的关键，不省这个" },
        { id: "cable_external_rotation", sets: 3, reps: 12, ru: "次/边", type: "str", note: "小重量，肩袖控制，不追求力竭" },
      ]},
      { module: "core", title: "核心收尾", dot: "am", exs: [
        { id: "plank",      type: "mob", sets: 2, dur: "30秒" },
        { id: "bird_dog_f", sets: 2, reps: 8, ru: "次/边", type: "mob" },
      ]},
      { module: "stretch", title: "拉伸/收尾", dot: "am", exs: [
        { id: "cross_body_str", type: "mob", sets: 1, dur: "45秒/边" },
        { id: "pec_door_str", type: "mob", sets: 1, dur: "45秒/边" },
        { id: "wrist_extensor_str", type: "mob", sets: 1, dur: "30秒/边" },
      ]},
    ],
  },

  // ── AR 类：主动恢复 ─────────────────────────────────
  AR: {
    label: "主动恢复", sub: "轻松活动", icon: "🚶", color: "br",
    warn: null,
    sections: [
      { module: "cardio", title: "活动内容", dot: "br", exs: [
        { id: "walk",     type: "cardio", durLabel: "30–40分钟", note: "随意节奏，户外优先" },
        { id: "cat_cow",  sets: 2, reps: 10, ru: "次", type: "mob" },
        { id: "terminal_knee_ext", sets: 1, reps: 12, ru: "次/边", type: "mob", note: "膝盖状态好时加入" },
      ]},
      { module: "stretch", title: "拉伸/收尾", dot: "br", exs: [
        { id: "full_str", type: "mob", sets: 1, dur: "10分钟", note: "髋屈肌、梨状肌、胸椎" },
      ]},
    ],
  },
};

// 动作库 — 要领、常见错误、注意事项
const EX_INFO = {
  cat_cow: {
    name: "猫牛式", tl: "脊柱活动度", p: ["竖脊肌", "多裂肌"], s: ["腹横肌"],
    tech: ["四点跪姿，手腕在肩下，膝盖在髋下", "吸气→牛式：肚脐下沉，尾骨上翘", "呼气→猫式：腰椎向上圆起，低头收下巴", "速度 3–4秒/次，逐节感受"],
    err: ["只动脖子，腰椎没参与", "节奏太快，失去感觉"],
    warn: null, videos: [],
  },
  bird_dog: {
    name: "鸟狗式", tl: "腰椎稳定", p: ["竖脊肌", "多裂肌", "臀大肌"], s: ["腹横肌"],
    tech: ["四点跪姿，腰椎中立（不塌不圆）", "对侧手脚同时伸出，向远处延伸", "顶峰维持2秒，躯干不旋转，骨盆不倾", "缓慢回位，换另一边"],
    err: ["抬腿时腰椎塌下去", "躯干旋转，骨盆歪向一侧"],
    warn: "腰椎任何不适立即停止", videos: [],
  },
  dead_bug: {
    name: "死虫式", tl: "核心稳定", p: ["腹横肌", "腹直肌"], s: ["多裂肌"],
    tech: ["仰卧，腰部全程贴地（关键！）", "双臂垂直朝天，双腿屈膝90°悬空", "呼气同时缓慢下放对侧手臂和腿", "接近地面即回位，腰不离地"],
    err: ["下放时腰部离地（核心没参与）", "憋气而非呼气控制"],
    warn: null, videos: [],
  },
  clamshell: {
    name: "弹力带蚌式", tl: "臀中肌激活", p: ["臀中肌"], s: ["臀小肌", "梨状肌"],
    tech: ["侧躺，弹力带套在膝盖上方", "髋屈约45°，膝盖弯曲叠放", "保持骨盆不动，向上打开膝盖", "顶峰停1秒，感受臀侧发力"],
    err: ["打开时骨盆随之旋转", "幅度太小，臀中肌没充分参与"],
    warn: null, videos: [],
  },
  zone2_run: {
    name: "Zone 2 有氧", tl: "跑步 / 椭圆机 / 游泳 三选一", p: ["心肺系统", "股四头肌"], s: ["腘绳肌", "小腿", "臀肌"],
    tech: [
      "【通用】目标心率 130–150bpm，前5分钟<140bpm热身",
      "【跑步】身体微前倾，步幅不过大；腰不适即改步行",
      "【椭圆机】调至心率自然维持135–145的阻力，不要太轻",
      "【游泳】髋启动打腿，踝关节放松；腰感觉良好时可增加强度",
    ],
    err: ["开始就跑太快，心率超160（有氧变无氧）", "椭圆机阻力太轻，心率低于130无效"],
    warn: "腰部任何不适：立即改步行或停止", videos: [],
  },
  hip_flex_str: {
    name: "髋屈肌拉伸", tl: "拉伸", p: ["髂腰肌", "股直肌"], s: ["腰大肌"],
    tech: ["弓步：一脚向前，后膝落地", "重心前移，感受后侧腹股沟拉伸", "腰椎中立，不过度前凸", "维持60秒/边"],
    err: ["腰椎前凸代偿（拉的是腰而非髋屈肌）"],
    warn: null, videos: [],
  },
  piriform_str: {
    name: "梨状肌拉伸", tl: "拉伸", p: ["梨状肌", "外旋肌群"], s: ["臀大肌"],
    tech: ["仰卧，踝关节放对侧大腿（4字形）", "双手抱对侧大腿后侧向胸口拉", "感受放上去那侧臀深处被拉伸", "维持45秒，均匀呼吸"],
    err: ["拉伸不到位，没感受到臀深处"],
    warn: null, videos: [],
  },
  face_pull: {
    name: "弹力带面拉", tl: "肩部热身 / 后束激活", p: ["后三角肌", "外旋肌群"], s: ["中斜方肌"],
    tech: ["弹力带固定眼睛高度", "拉向面部，肘与肩同高或更高", "终点：拇指朝后（外旋到底），停1秒", "控制回程2秒"],
    err: ["肘部下垂，变成划船", "没有外旋，只是往后拉"],
    warn: "右肩不适减轻阻力", videos: [],
  },
  ytw: {
    name: "Y-T-W", tl: "肩胛稳定", p: ["中下斜方肌", "菱形肌"], s: ["后三角肌"],
    tech: ["俯卧凳上或站姿前倾，持轻哑铃（2–5kg）", "Y：斜上展开，拇指朝上", "T：水平展开，拇指朝上", "W：肘弯曲外旋至W，肩胛骨下沉内收"],
    err: ["重量太重，上斜方肌代偿", "肩胛骨没参与，只有手臂在动"],
    warn: null, videos: [],
  },
  thoracic_ext: {
    name: "胸椎伸展 / 旋转", tl: "胸椎活动度", p: ["胸段竖脊肌"], s: ["菱形肌", "胸大肌（拉伸）"],
    tech: ["泡沫轴横放于肩胛骨下缘", "双手抱头，向后伸展感受胸椎打开", "每位置停30秒，沿脊柱向上移动", "也可做胸椎旋转：四点跪姿一手扶头，向上旋转"],
    err: ["伸展变成腰椎（代偿最常见）", "动作太快没有停留"],
    warn: null, videos: [],
  },
  lat_pulldown: {
    name: "高位下拉（宽握）", tl: "背阔肌·拉", p: ["背阔肌"], s: ["二头肌", "大圆肌", "后三角肌"],
    tech: ["宽握（约肩宽1.5倍），正握", "身体微后倾10–15°，不过度仰躺", "下拉至胸骨上方，肘部向外下方运动", "控制回程2秒，充分伸展背阔肌"],
    err: ["大幅后仰借力", "二头肌主导，感觉不到背阔肌"],
    warn: null, videos: [],
  },
  pullup_assisted: {
    name: "引体向上 / 辅助引体", tl: "背阔肌·整体拉力", p: ["背阔肌", "大圆肌"], s: ["二头肌", "菱形肌", "中下斜方肌"],
    tech: ["优先使用辅助引体或弹力带，保证全程可控", "起始位肩胛轻微上提，发力时先下沉肩胛再拉肘", "胸口朝单杠方向靠近，不用下巴硬够杠", "下降控制2秒，底部不完全松垮肩关节"],
    err: ["耸肩硬拉，肩胛没有下沉", "身体大幅摆动借力", "右肘不适仍强行做正手宽握", "只追次数，动作下半程失控"],
    warn: "右肘或右肩不适时改辅助引体、窄中立握下拉，或当天跳过",
    videos: [],
    defaults: { type: "str", sets: 3, reps: 8, unit: "次" },
  },
  straight_arm_pd: {
    name: "直臂下压", tl: "背阔肌·孤立", p: ["背阔肌"], s: ["大圆肌", "后三角肌", "三头肌长头"],
    tech: ["绳索高位，站立面对滑轮", "手臂微屈（不完全锁肘），从头顶高度开始", "向下压至大腿前侧，感受背阔肌收缩", "控制回放，不让肩胛骨随之上耸"],
    err: ["手臂弯太多，变成下拉", "速度过快，没有感受到背阔肌"],
    warn: null, videos: [],
  },
  cable_row: {
    name: "坐姿绳索划船", tl: "中背厚度·水平拉", p: ["菱形肌", "中斜方肌", "背阔肌中下部"], s: ["后三角肌", "二头肌"],
    tech: ["坐姿背直，肋骨不过度外翻，脚踩稳", "起始允许肩胛前伸，拉动时先后收肩胛再拉肘", "拉至下胸到上腹之间，顶峰停1秒感受中背夹紧", "控制回程2秒，不用腰部前后甩动"],
    err: ["借腰大幅晃动（腰椎风险）", "肩胛骨没内收，只有手臂在动", "耸肩拉到脖子紧", "重量过大导致回程失控"],
    warn: "全程腰椎中立；腰髋疲劳时减重并缩小身体摆动",
    videos: [],
  },
  barbell_row: {
    name: "杠铃俯身划船 / 站姿划船", tl: "背厚度·复合划船", p: ["菱形肌", "中斜方肌", "背阔肌"], s: ["竖脊肌", "臀肌", "腘绳肌", "二头肌"],
    tech: ["髋关节折叠，躯干前倾约30–45°，腰椎保持中立", "杠铃从膝下或膝前起始，拉向下腹部", "肘向身体后方走，顶峰停半秒到1秒", "全程腹压稳定，重量先以RPE 6–7为准"],
    err: ["腰背圆起或塌腰", "用身体猛甩把杠铃甩上来", "拉到胸口导致斜方肌上束代偿", "重量太大，动作幅度越来越短"],
    warn: "左腰髋或腰椎不适时不要做；当天改坐姿划船、器械划船或胸部不受压的支撑划船",
    videos: [],
    defaults: { type: "str", sets: 3, reps: 8, unit: "次" },
  },
  chest_supported_row: {
    name: "胸托划船", tl: "中背·腰椎友好", p: ["菱形肌", "中斜方肌"], s: ["背阔肌", "后三角肌", "二头肌"],
    tech: ["胸部贴紧靠垫，脚踩稳", "先轻收肩胛，再把肘拉向身体后侧", "顶峰停1秒，控制回放2秒", "全程不抬胸、不借腰"],
    err: ["胸离开靠垫借力", "耸肩拉，斜方肌上束代偿", "手臂先发力，背部没感觉"],
    warn: "右肘胀感明显时减重或改宽握轻拉", videos: [],
  },
  rear_delt_fly: {
    name: "后束飞鸟", tl: "后三角·肩后侧辅助", p: ["后三角肌"], s: ["菱形肌", "中斜方肌", "肩袖"],
    tech: ["俯身或反向蝴蝶机，躯干稳定，轻重量开始", "手臂微屈向两侧展开至肩高附近", "顶峰停1秒，感受肩后侧发力而不是耸肩", "作为肩后侧和体态辅助，不作为背厚度主力"],
    err: ["重量太大，斜方肌代偿", "俯身角度不够，变成侧平举", "把它当成主要划船动作替代中背训练"],
    warn: "右肩夹挤或卡顿时减小幅度或改面拉",
    videos: [],
  },
  incline_db: {
    name: "哑铃上斜推胸", tl: "上胸·推", p: ["胸大肌（上部）"], s: ["前三角肌", "三头肌"],
    tech: ["凳角30°（非45°，否则变肩训练）", "全程中立握（掌心相对），保护右肘", "下降控制2–3秒至胸部高度", "推起不完全锁肘，维持胸肌张力"],
    err: ["换成正握（右肘压力增大）", "速度太快没有控制离心"],
    warn: "右肘不适立即停止，改绳索夹胸", videos: [],
  },
  cable_fly: {
    name: "绳索夹胸", tl: "胸部·推", p: ["胸大肌"], s: ["前三角肌"],
    tech: ["高位绳索（肩以上），站于两侧中间", "向下前方夹合，轨迹如抱树", "顶峰双手相触，停1秒感受挤压", "控制回放，感受胸肌拉伸"],
    err: ["手臂过直变前平举", "没有顶峰收缩，来回甩动"],
    warn: null, videos: [],
  },
  machine_chest_press: {
    name: "器械推胸（中立握）", tl: "胸部·稳定推", p: ["胸大肌"], s: ["前三角肌", "三头肌"],
    tech: ["座椅调到把手约在胸中线", "优先中立握或半中立握，肩胛轻收", "下降到胸部有拉伸即可，不追求过深", "推起不锁死肘，保持胸肌张力"],
    err: ["座椅太低导致耸肩", "肘打开过大", "重量过大压到右肘"],
    warn: "右肘不适时减重，或直接跳过", videos: [],
  },
  incline_pushup: {
    name: "上斜俯卧撑", tl: "胸部·低负荷推", p: ["胸大肌"], s: ["前三角肌", "三头肌", "核心"],
    tech: ["双手扶高箱或史密斯杆，身体成一直线", "肘约45°向后下，不外展成T字", "胸靠近支撑点后推起", "高度越高越轻，优先无痛范围"],
    err: ["塌腰", "肘外展太大", "下降过深导致肩前侧顶住"],
    warn: "右肘或腰部不适时升高支撑点或跳过", videos: [],
  },
  lat_raise: {
    name: "哑铃侧平举", tl: "肩侧束（中束）", p: ["三角肌中束"], s: ["三角肌前束", "上斜方肌"],
    tech: ["站立，持哑铃自然垂于体侧", "肘微屈（约15–20°），向两侧举起至肩高", "小拇指侧略高（倒水姿势），顶峰停1秒", "控制落下约3秒，不要甩"],
    err: ["借助身体惯性甩起来", "手臂过直或重量太大，斜方肌代偿", "举过肩高（增加肩峰撞击风险）"],
    warn: "右肩不适立即停，改绳索侧平举或降重量", videos: [],
  },
  cable_lat_raise: {
    name: "绳索侧平举", tl: "肩侧束·更稳定", p: ["三角肌中束"], s: ["冈上肌", "核心稳定"],
    tech: ["滑轮调到最低，单手握把，身体略侧向站立", "从身体前侧起始，肘微屈，拉到肩高即可", "全程慢速，不耸肩，顶峰停1秒", "右肩优先控制轨迹，宁轻勿重"],
    err: ["身体摆动借力", "拉过肩高", "斜方肌先紧起来"],
    warn: "右肩卡顿或夹挤感明显时停止", videos: [],
  },
  cable_external_rotation: {
    name: "绳索肩外旋", tl: "肩袖控制", p: ["冈下肌", "小圆肌"], s: ["后三角肌"],
    tech: ["滑轮调到肘高，肘夹毛巾贴身体侧面", "前臂从身体前方向外旋开", "上臂不离开身体，手腕保持中立", "轻重量慢速，顶峰停1秒"],
    err: ["肘离开身体", "身体旋转借力", "重量太大变成甩动"],
    warn: "右肩刺痛、卡住或夹挤感时停止", videos: [],
  },
  scap_wall_slide: {
    name: "墙面肩胛滑动", tl: "肩胛上旋热身", p: ["前锯肌", "下斜方肌"], s: ["肩袖"],
    tech: ["背靠墙或面对墙，前臂贴墙", "慢慢向上滑动，肩胛向上旋转", "全程不耸肩，不塌腰", "到舒适高度即可"],
    err: ["腰椎前凸代偿", "耸肩", "手臂强行贴墙导致肩前侧痛"],
    warn: "右肩卡顿时缩小幅度", videos: [],
  },
  wrist_extensor_str: {
    name: "腕伸肌拉伸", tl: "右肘/前臂放松", p: ["腕伸肌群"], s: ["肱骨外上髁周围"],
    tech: ["手臂伸直，掌心向下", "另一只手轻轻把手腕向下、向内拉", "感受前臂外侧轻拉伸", "维持30秒，力度温和"],
    err: ["拉到刺痛", "肩膀耸起", "为了幅度锁死肘关节"],
    warn: "肘外侧痛明显时只做轻柔范围", videos: [],
  },
  wrist_flexor_str: {
    name: "腕屈肌拉伸", tl: "右肘/前臂放松", p: ["腕屈肌群"], s: ["肱骨内上髁周围"],
    tech: ["手臂伸直，掌心向上", "另一只手轻轻把手指向下拉", "感受前臂内侧轻拉伸", "维持30秒，均匀呼吸"],
    err: ["拉到手腕刺痛", "肘关节过度锁死"],
    warn: "肘内侧不适时保持轻柔，不追求强拉", videos: [],
  },
  forearm_pronation: {
    name: "前臂旋前旋后", tl: "右肘热身", p: ["旋前圆肌", "旋后肌"], s: ["腕屈伸肌群"],
    tech: ["肘贴身体侧面，屈肘90°", "徒手或握很轻的小哑铃/锤柄", "掌心向上到向下缓慢旋转", "动作来自前臂，不甩手腕"],
    err: ["肩膀跟着转", "重量过大导致肘胀", "速度太快"],
    warn: "右肘胀感超过轻微范围就停止", videos: [],
  },
  hip_90_90: {
    name: "90/90 髋转换", tl: "髋关节活动度", p: ["髋外旋肌群", "髋内旋肌群"], s: ["臀中肌"],
    tech: ["坐姿双腿摆成90/90", "保持躯干尽量直立，左右缓慢转换", "先追求控制，不追求贴地", "每侧停1秒感受髋部"],
    err: ["用腰扭过去", "膝盖硬顶疼痛", "速度太快没有控制"],
    warn: "髋或膝刺痛时减小范围", videos: [],
  },
  adductor_rockback: {
    name: "内收肌后坐", tl: "髋/膝友好拉伸", p: ["大腿内收肌群"], s: ["髋关节"],
    tech: ["四点跪姿，一侧腿向外伸直", "臀部慢慢向后坐，感受大腿内侧拉伸", "腰背保持中立", "每次后坐停1秒再回到起始"],
    err: ["塌腰", "膝盖扭转", "为了幅度硬压"],
    warn: "膝内侧不适时减小幅度或跳过", videos: [],
  },
  terminal_knee_ext: {
    name: "弹力带终末伸膝", tl: "膝关节稳定", p: ["股四头肌内侧"], s: ["腘绳肌控制"],
    tech: ["弹力带固定在膝后，站姿微屈膝", "主动把膝盖伸直，感受大腿前侧收紧", "顶峰停1秒，再缓慢回到微屈", "脚掌踩稳，膝盖对准脚尖"],
    err: ["膝盖内扣", "身体前后晃动", "弹力太大导致动作变形"],
    warn: "右膝内侧痛明显时只做无痛范围", videos: [],
  },
  lat_str: {
    name: "背阔肌拉伸", tl: "背部拉伸", p: ["背阔肌"], s: ["胸腰筋膜"],
    tech: ["双手扶墙或高位固定点", "臀部向后坐，胸口向地面轻压", "保持腰椎中立，不为了幅度塌腰", "每侧45秒，均匀呼吸"],
    err: ["腰椎塌陷代偿", "耸肩导致颈部紧张"],
    warn: "腰部不适时减小幅度", videos: [],
  },
  pec_door_str: {
    name: "门框胸肌拉伸", tl: "胸大肌 / 胸小肌拉伸", p: ["胸大肌", "胸小肌"], s: ["前三角肌"],
    tech: ["前臂贴门框，肘略低于肩或与肩同高", "身体缓慢向前，感受胸前打开", "肩胛轻微后收下沉，不耸肩", "每侧45–60秒"],
    err: ["肘抬太高导致肩前侧顶住", "腰向前顶代偿"],
    warn: "右肩前侧刺痛或夹挤感时停止", videos: [],
  },
  cross_body_str: {
    name: "肩后侧跨胸拉伸", tl: "后肩 / 关节囊拉伸", p: ["后三角肌"], s: ["冈下肌", "小圆肌"],
    tech: ["一侧手臂横过胸前", "另一手托住上臂轻轻向身体拉近", "肩膀保持下沉，不耸肩", "每侧45秒，力度温和"],
    err: ["拉到肩前侧疼痛", "肩膀耸起"],
    warn: "冻肩残留不适时只做轻柔范围", videos: [],
  },
  child_pose: {
    name: "婴儿式呼吸放松", tl: "腰背放松", p: ["背阔肌", "竖脊肌"], s: ["呼吸肌"],
    tech: ["跪姿坐向脚跟，双手向前伸", "鼻吸口呼，感受背部随呼吸扩张", "腰部保持舒适，不强压", "维持60秒"],
    err: ["追求下压幅度导致腰不舒服", "憋气"],
    warn: "膝盖不适时垫毛巾或跳过", videos: [],
  },
  plank: {
    name: "平板支撑", tl: "核心稳定", p: ["腹横肌", "腹直肌"], s: ["竖脊肌", "臀肌"],
    tech: ["肘在肩正下方，身体成一直线", "收紧腹部，腰椎中立（不塌不翘臀）", "均匀呼吸，不憋气", "感觉腰椎塌陷时立即结束"],
    err: ["塌腰（腰椎过度后伸）", "翘臀（腹部没参与）"],
    warn: "腰部不适立即停止", videos: [],
  },
  bird_dog_f: {
    name: "鸟狗式（收尾）", tl: "核心收尾", p: ["竖脊肌", "多裂肌"], s: ["腹横肌"],
    tech: ["同热身鸟狗式，节奏更慢", "感受整堂课后的核心控制状态", "保持中立位，不追求幅度"],
    err: ["追速度失稳定"],
    warn: null, videos: [],
  },
  walk: {
    name: "散步", tl: "主动恢复", p: ["心肺恢复"], s: ["下肢循环"],
    tech: ["轻松节奏，无需计心率", "推荐户外，呼吸新鲜空气", "可配播客/音频"],
    err: [], warn: null, videos: [],
  },
  full_str: {
    name: "全身拉伸", tl: "恢复", p: ["全身筋膜链"], s: [],
    tech: ["髋屈肌（弓步1分钟/边）", "梨状肌（4字45秒/边）", "胸椎旋转（坐姿30次）", "肩部跨胸拉伸（30秒/边）"],
    err: [], warn: null, videos: [],
  },
};

const EX_PURPOSE = {
  cat_cow: "给腰椎和胸椎做低负荷活动，减少久坐后的僵硬感，为腰椎稳定训练做准备。",
  bird_dog: "训练腰椎中立位下的抗旋转和对侧协调，服务于左腰髋稳定和日常起身、徒步负重。",
  dead_bug: "训练抗伸展核心和腹压控制，减少推举、跑步和深蹲类动作中腰椎代偿。",
  clamshell: "激活臀中肌和髋外旋控制，帮助左髋稳定和右膝轨迹控制。",
  zone2_run: "建立低强度有氧底盘，改善心肺恢复能力，同时控制腰膝冲击和心率漂移。",
  hip_flex_str: "放松髋屈肌，减少久坐造成的骨盆前侧紧张和腰椎前凸代偿。",
  piriform_str: "放松臀深层外旋肌群，改善髋部舒适度和坐姿后的紧绷感。",
  face_pull: "训练后束、肩袖和肩胛后缩外旋，抵消圆肩和推类训练带来的前侧优势。",
  ytw: "强化中下斜方肌、菱形肌和肩胛控制，让肩胛在推拉和游泳时更稳定。",
  thoracic_ext: "改善胸椎伸展和旋转，让肩部动作少从腰椎和肩前侧代偿。",
  lat_pulldown: "训练背阔肌宽度和垂直拉能力，用可控下拉替代引体等更刺激右肘的动作。",
  pullup_assisted: "建立垂直拉的整体能力，同时用辅助重量控制右肘和右肩压力；适合从背宽维持过渡到综合拉力提升。",
  straight_arm_pd: "孤立背阔肌下压和肩胛下沉，减少二头肌与右肘参与。",
  cable_row: "作为背厚度主力动作，训练肩胛后收、中背夹紧和水平拉能力，帮助背部从侧面和后面更饱满。",
  barbell_row: "用复合划船加强中背厚度、背阔下部和髋-核心稳定，但必须在腰髋状态允许时谨慎加载。",
  chest_supported_row: "在胸托支撑下训练中背厚度，降低腰椎和腰髋借力风险。",
  rear_delt_fly: "补强后三角和肩后侧稳定，服务于体态和肩关节平衡；它不是背厚度主训练动作。",
  incline_db: "以中立握训练上胸和推力，保留胸部刺激同时降低右肘和右肩底部压力。",
  cable_fly: "用较低关节压力训练胸肌收缩和控制，作为推胸后的辅助动作。",
  machine_chest_press: "用稳定轨迹维持胸部力量，便于控制幅度、握法和右肘负荷。",
  incline_pushup: "用可调难度的自重推练胸和核心，作为右肘或肩状态一般时的低风险替代。",
  lat_raise: "训练三角肌中束，改善肩部外观和肩宽，但以轻重量保护右肩。",
  cable_lat_raise: "用恒定张力训练侧束，轨迹更稳定，适合右肩需要更可控刺激时使用。",
  cable_external_rotation: "强化肩袖外旋肌群，提高肱骨头控制，服务于右肩卡顿和游泳/羽毛球负荷管理。",
  scap_wall_slide: "训练肩胛上旋、前锯肌和下斜方肌，改善上举和推拉前的肩胛节律。",
  wrist_extensor_str: "放松前臂外侧和肘外侧相关肌腱负荷，作为右肘过载后的维护动作。",
  wrist_flexor_str: "放松前臂内侧和肘内侧相关肌群，降低推拉和握拍后的紧张。",
  forearm_pronation: "训练前臂旋前旋后控制，帮助右肘适应握力、下拉和羽毛球负荷。",
  hip_90_90: "改善髋内旋和外旋控制，用于左髋稳定、深蹲控制和久坐后活动。",
  adductor_rockback: "温和打开内收肌，帮助右膝内侧和髋部在无痛范围内恢复活动度。",
  terminal_knee_ext: "激活股四头肌终末伸膝控制，帮助右膝轨迹和内侧不适管理。",
  lat_str: "放松背阔肌和胸腰筋膜，减少肩上举和腰背紧张时的牵拉感。",
  pec_door_str: "拉伸胸大肌和胸小肌，缓解圆肩、肩前侧紧张和卧推底部卡顿倾向。",
  cross_body_str: "温和拉伸肩后侧，改善右肩后侧紧张和水平内收活动度。",
  child_pose: "用低负荷呼吸放松腰背和背阔肌，作为训练后的降张力收尾。",
  plank: "训练抗伸展核心和躯干刚性，前提是腰椎不塌、不痛。",
  bird_dog_f: "在训练结束时复查核心控制和腰椎中立位，确认疲劳后仍能稳定。",
  walk: "低冲击恢复和基础有氧，适合恢复日、腰膝状态一般或旅行期使用。",
  full_str: "把髋、胸椎、肩和全身筋膜链做轻量整理，用于主动恢复日收尾。",
};

Object.entries(EX_INFO).forEach(([id, ex]) => {
  ex.purpose = ex.purpose || EX_PURPOSE[id] || "用于补充当前训练目标，具体负荷根据疼痛、疲劳和动作质量调整。";
  ex.links = ex.links || ex.videos || [];
  ex.defaults = ex.defaults || { type: "mob" };
  if (["lat_pulldown", "pullup_assisted", "straight_arm_pd", "cable_row", "barbell_row", "chest_supported_row", "rear_delt_fly", "incline_db", "machine_chest_press", "cable_fly", "incline_pushup", "lat_raise", "cable_lat_raise", "cable_external_rotation"].includes(id)) {
    ex.defaults = Object.assign({ type: "str", sets: 4, reps: id === "lat_raise" || id === "cable_lat_raise" ? 12 : 10, unit: "次" }, ex.defaults);
  }
  if (id === "zone2_run" || id === "walk") {
    ex.defaults = Object.assign({ type: "cardio", duration: id === "walk" ? 35 : 30, unit: "分钟" }, ex.defaults);
  }
});
