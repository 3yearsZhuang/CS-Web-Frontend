/**
 * @file i18n 消息模块 — events（自动拆分自 types.ts / languages/*.ts）
 * 包含该业务模块下的所有 namespace：类型 + 中英文语言包。
 */

export interface EventsMessages {
  events: {
    upcoming: string;
    ongoing: string;
    ended: string;
    register: string;
    registrations: string;
    tabTimeline: string;
    tabNext: string;
    tabAdmin: string;
    heroTitle1: string;
    heroTitle2: string;
    heroTitle3: string;
    heroTitleEn: string;
    heroDesc1: string;
    heroDesc2: string;
    sectionTitle1: string;
    sectionTitle2: string;
    timelineLabel: string;
    calendarLabel: string;
    nextTitle1: string;
    nextTitle2: string;
    nextDesc: string;
    joinUs: string;
    uncategorized: string;
    loadFailed: string;
    retry: string;
    notFound: string;
    backToList: string;
    back: string;
    publisher: string;
    detailPending: string;
    participateTitle: string;
    fullMsg: string;
    registeredMsg: string;
    clickToRegister: string;
    regInfo: string;
    loginToRegister: string;
    eventExpired: string;
    registered: string;
    cancelReg: string;
    full: string;
    registerNow: string;
    processing: string;
    detailEmpty: string;
    requiredField: string;
    registerFailed: string;
    cancelFailed: string;
    regStateFailed: string;
    publisherLine: string;
    officialEvent: string;
    detailTitle: string;
  },
  eventsAdmin: {
    pinned: string;
    filterAll: string;
    filterUpcoming: string;
    filterOngoing: string;
    filterEnded: string;
    weekdayMon: string;
    weekdayTue: string;
    weekdayWed: string;
    weekdayThu: string;
    weekdayFri: string;
    weekdaySat: string;
    weekdaySun: string;
    monthJan: string;
    monthFeb: string;
    monthMar: string;
    monthApr: string;
    monthMay: string;
    monthJun: string;
    monthJul: string;
    monthAug: string;
    monthSep: string;
    monthOct: string;
    monthNov: string;
    monthDec: string;
    prevMonthAria: string;
    nextMonthAria: string;
    selectedDateLabel: string;
    noEventsToday: string;
    unscheduledLabel: string;
    noEvents: string;
    eventsCountDesktop: string;
    eventsCountMobile: string;
  }
}

export const zhCN: EventsMessages = {
  events: {
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束',
    register: '报名',
    registrations: '报名列表',
    tabTimeline: '时间线 / Timeline',
    tabNext: '下一步 / Next',
    tabAdmin: '管理 / Admin',
    heroTitle1: '一年的',
    heroTitle2: '节奏',
    heroTitle3: '，由活动串联。',
    heroTitleEn: '/ Events',
    heroDesc1: '从招新到换届，从内部技术分享到对外黑客松，',
    heroDesc2: '每个节点都有它的意义',
    sectionTitle1: '活动',
    sectionTitle2: '时间轴',
    timelineLabel: 'Timeline',
    calendarLabel: 'Calendar',
    nextTitle1: '想要',
    nextTitle2: '参与',
    nextDesc: '我们欢迎每一位对技术充满热情的同学加入。无论你是编程新手还是资深开发者，在这里都能找到属于你的位置。',
    joinUs: '加入我们',
    uncategorized: '未分类',
    loadFailed: '加载失败，请稍后再试',
    retry: '重试',
    notFound: '活动不存在或已下架。',
    backToList: '返回活动列表',
    back: '返回',
    publisher: '主办方',
    detailPending: '加载中...',
    participateTitle: '参与信息',
    fullMsg: '名额已满',
    registeredMsg: '你已报名，活动当天见！',
    clickToRegister: '点击下方按钮完成报名',
    eventExpired: '活动报名已结束',
    regInfo: '报名信息',
    loginToRegister: '登录后报名',
    registered: '已报名',
    cancelReg: '取消报名',
    full: '已满',
    registerNow: '立即报名',
    processing: '处理中...',
    detailEmpty: '暂无该活动详情。',
    requiredField: '请填写必填项（姓名 / 学号 / 联系方式）',
    registerFailed: '报名失败',
    cancelFailed: '取消报名失败',
    regStateFailed: '获取报名状态失败',
    publisherLine: '由「{publisher}」主办',
    officialEvent: '协会官方活动，敬请期待',
    detailTitle: '活动详情',
  },
  eventsAdmin: {
    pinned: '置顶',
    filterAll: '全部',
    filterUpcoming: '即将开始',
    filterOngoing: '进行中',
    filterEnded: '已结束',
    weekdayMon: '一',
    weekdayTue: '二',
    weekdayWed: '三',
    weekdayThu: '四',
    weekdayFri: '五',
    weekdaySat: '六',
    weekdaySun: '日',
    monthJan: '一月',
    monthFeb: '二月',
    monthMar: '三月',
    monthApr: '四月',
    monthMay: '五月',
    monthJun: '六月',
    monthJul: '七月',
    monthAug: '八月',
    monthSep: '九月',
    monthOct: '十月',
    monthNov: '十一月',
    monthDec: '十二月',
    prevMonthAria: '上一月',
    nextMonthAria: '下一月',
    selectedDateLabel: '{year} 年 {month} 月 {day} 日',
    noEventsToday: '当日无活动',
    unscheduledLabel: '未排期',
    noEvents: '暂无活动',
    eventsCountDesktop: '{count} 个活动',
    eventsCountMobile: '{count} 活动',
  }
};

export const en: EventsMessages = {
  events: {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    ended: 'Ended',
    register: 'Register',
    registrations: 'Registrations',
    tabTimeline: 'Timeline / 时间线',
    tabNext: 'Next / 下一步',
    tabAdmin: 'Admin / 管理',
    heroTitle1: 'The rhythm',
    heroTitle2: 'of the year',
    heroTitle3: ', told through events.',
    heroTitleEn: '/ Events',
    heroDesc1: 'From recruitment to handover, from internal tech talks to external hackathons,',
    heroDesc2: 'every milestone matters',
    sectionTitle1: 'Events',
    sectionTitle2: 'Timeline',
    timelineLabel: 'Timeline',
    calendarLabel: 'Calendar',
    nextTitle1: 'Want to',
    nextTitle2: 'join',
    nextDesc: 'We welcome every student passionate about technology. Whether you are a beginner or an experienced developer, there is a place for you here.',
    joinUs: 'Join us',
    uncategorized: 'Uncategorized',
    loadFailed: 'Failed to load, please try again later',
    retry: 'Retry',
    notFound: 'Event not found or removed.',
    backToList: 'Back to Events',
    back: 'Back',
    publisher: 'Organizer',
    detailPending: 'Loading...',
    participateTitle: 'Participation',
    fullMsg: 'Fully booked',
    registeredMsg: 'You are registered. See you there!',
    eventExpired: 'Registration has closed',
    clickToRegister: 'Click below to complete registration',
    regInfo: 'Registration info',
    loginToRegister: 'Sign in to register',
    registered: 'Registered',
    cancelReg: 'Cancel registration',
    full: 'Full',
    registerNow: 'Register now',
    processing: 'Processing...',
    detailEmpty: 'No details for this event.',
    requiredField: 'Please fill required fields (name / student ID / contact)',
    registerFailed: 'Registration failed',
    cancelFailed: 'Cancel registration failed',
    regStateFailed: 'Failed to load registration status',
    publisherLine: 'Hosted by “{publisher}”',
    officialEvent: 'Official association event — stay tuned',
    detailTitle: 'Event Details',
  },
  eventsAdmin: {
    pinned: 'Pinned',
    filterAll: 'All',
    filterUpcoming: 'Upcoming',
    filterOngoing: 'Ongoing',
    filterEnded: 'Ended',
    weekdayMon: 'Mon',
    weekdayTue: 'Tue',
    weekdayWed: 'Wed',
    weekdayThu: 'Thu',
    weekdayFri: 'Fri',
    weekdaySat: 'Sat',
    weekdaySun: 'Sun',
    monthJan: 'January',
    monthFeb: 'February',
    monthMar: 'March',
    monthApr: 'April',
    monthMay: 'May',
    monthJun: 'June',
    monthJul: 'July',
    monthAug: 'August',
    monthSep: 'September',
    monthOct: 'October',
    monthNov: 'November',
    monthDec: 'December',
    prevMonthAria: 'Previous month',
    nextMonthAria: 'Next month',
    selectedDateLabel: '{month}/{day}/{year}',
    noEventsToday: 'No events today',
    unscheduledLabel: 'Unscheduled',
    noEvents: 'No events',
    eventsCountDesktop: '{count} events',
    eventsCountMobile: '{count} events',
  }
};
