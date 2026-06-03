export const COMPANY = {
  legalNameKo: "야기워크숍 주식회사",
  legalNameEn: "YAGI WORKSHOP",
  bizRegNo: "519-81-04213",
  representative: "윤병삼",
  addressKo:
    "서울특별시 구로구 디지털로34길 55, B201-I3호(구로동, 코오롱싸이언스밸리2차)",
  bizType: "정보통신업",
  bizItem: "미디어콘텐츠창작업, 응용 소프트웨어 개발 및 공급업",
  // TODO: 070/유선전화 발급 후 실제 번호로 교체. 임의 생성 금지.
  phone: null as string | null,
  // 통신판매업 신고: 진행중. 발급되면 번호 문자열로 교체.
  mailOrderNo: null as string | null,
  email: "hello@yagiworkshop.xyz",
  hostingProvider: "Vercel Inc.",
} as const;
