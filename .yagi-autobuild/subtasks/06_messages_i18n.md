---
id: 06
name: Messages i18n update (ko + en)
status: pending
assigned_to: executor
---

# Subtask 06 — i18n Messages

## Goal
Rewrite `messages/ko.json` and `messages/en.json` to include all required translation keys for auth, onboarding, app shell nav, and dashboard.

## File 1: `messages/ko.json` (OVERWRITE)

```json
{
  "brand": {
    "name": "YAGI Workshop"
  },
  "home": {
    "eyebrow": "AI creative production studio",
    "headline_before": "캠페인부터 ",
    "headline_emphasis": "시네마틱",
    "headline_after": "까지.\nAI 비주얼 프로덕션.",
    "sub": "브랜드와 AI 크리에이터가 만나 이미지·필름·뮤직비디오까지 고도의 완성도로 만드는 스튜디오입니다.",
    "cta_client": "프로젝트 시작하기",
    "cta_creator": "크리에이터로 참여",
    "trusted_label": "Selected clients"
  },
  "common": {
    "signin": "로그인",
    "signup": "회원가입",
    "signout": "로그아웃",
    "continue": "계속",
    "back": "이전",
    "skip": "건너뛰기",
    "save": "저장",
    "cancel": "취소",
    "ko": "한국어",
    "en": "English"
  },
  "auth": {
    "signin_title": "로그인",
    "signin_sub": "이메일로 매직 링크를 보내드립니다",
    "signup_title": "계정 만들기",
    "signup_sub": "이메일만으로 시작하세요",
    "email": "이메일",
    "email_placeholder": "you@company.com",
    "send_link": "매직 링크 보내기",
    "sending": "보내는 중...",
    "link_sent": "메일함을 확인해 주세요",
    "no_account": "아직 계정이 없으신가요?",
    "have_account": "이미 계정이 있으신가요?"
  },
  "onboarding": {
    "role_title": "어떻게 YAGI Workshop을 사용하시나요?",
    "role_sub": "나중에 언제든 바꿀 수 있습니다",
    "role_client_title": "브랜드 · 에이전시",
    "role_client_desc": "AI 비주얼 프로덕션을 의뢰하고 팀과 협업합니다",
    "role_creator_title": "AI 크리에이터",
    "role_creator_desc": "공모전에 참여하고 포트폴리오·워크플로우를 공유합니다",
    "profile_title": "프로필을 설정해 주세요",
    "handle": "핸들",
    "handle_help": "영문 소문자·숫자·- _ 만 가능. 3–30자",
    "display_name": "표시 이름",
    "bio": "소개",
    "bio_placeholder": "간단하게 소개해 주세요",
    "avatar": "프로필 이미지",
    "workspace_title": "워크스페이스를 만들어 주세요",
    "workspace_sub": "회사 단위로 팀을 초대하고 프로젝트를 관리합니다",
    "workspace_name": "워크스페이스 이름",
    "workspace_name_ph": "예: 콘크리트웍스",
    "workspace_slug": "URL",
    "workspace_slug_help": "studio.yagiworkshop.xyz/w/",
    "workspace_logo": "로고 · 선택",
    "brand_title": "첫 브랜드를 추가하시겠어요?",
    "brand_sub": "여러 브랜드를 운영하는 경우에만 추가하세요",
    "brand_name": "브랜드 이름",
    "brand_name_ph": "예: CGP",
    "invite_title": "팀원을 초대하세요",
    "invite_sub": "지금 초대하거나 나중에 설정에서 추가할 수 있습니다",
    "invite_email": "이메일 주소",
    "invite_add": "추가",
    "invite_send": "초대장 보내기",
    "done": "시작하기"
  },
  "nav": {
    "projects": "프로젝트",
    "storyboards": "스토리보드",
    "brands": "브랜드",
    "team": "팀",
    "billing": "청구",
    "settings": "설정",
    "admin": "YAGI 관리"
  },
  "dashboard": {
    "empty_title": "아직 진행 중인 프로젝트가 없습니다",
    "empty_sub": "새 프로젝트를 시작해 보세요",
    "new_project": "새 프로젝트",
    "direct_tab": "직접 의뢰",
    "contest_tab": "공모전 개설",
    "coming_soon": "다음 단계에서 제공됩니다"
  },
  "workspace": {
    "current": "현재 워크스페이스",
    "switch": "워크스페이스 전환",
    "no_workspace": "워크스페이스 없음"
  },
  "invite": {
    "pending": "대기중인 초대",
    "accepted": "수락됨",
    "expired": "만료됨"
  }
}
```

## File 2: `messages/en.json` (OVERWRITE)

```json
{
  "brand": {
    "name": "YAGI Workshop"
  },
  "home": {
    "eyebrow": "AI creative production studio",
    "headline_before": "Campaigns, films, and ",
    "headline_emphasis": "cinematic",
    "headline_after": ".\nProduction-grade AI.",
    "sub": "A studio where brands meet AI creators for end-to-end, high-end visual production — imagery, film, and music videos.",
    "cta_client": "Start a project",
    "cta_creator": "Join as a creator",
    "trusted_label": "Selected clients"
  },
  "common": {
    "signin": "Sign in",
    "signup": "Sign up",
    "signout": "Sign out",
    "continue": "Continue",
    "back": "Back",
    "skip": "Skip",
    "save": "Save",
    "cancel": "Cancel",
    "ko": "한국어",
    "en": "English"
  },
  "auth": {
    "signin_title": "Sign in",
    "signin_sub": "We'll email you a magic link",
    "signup_title": "Create account",
    "signup_sub": "Get started with just your email",
    "email": "Email",
    "email_placeholder": "you@company.com",
    "send_link": "Send magic link",
    "sending": "Sending...",
    "link_sent": "Check your email",
    "no_account": "Don't have an account?",
    "have_account": "Already have an account?"
  },
  "onboarding": {
    "role_title": "How will you use YAGI Workshop?",
    "role_sub": "You can change this anytime",
    "role_client_title": "Brand or Agency",
    "role_client_desc": "Commission AI visual production and collaborate with your team",
    "role_creator_title": "AI Creator",
    "role_creator_desc": "Enter contests, share portfolio and workflows",
    "profile_title": "Set up your profile",
    "handle": "Handle",
    "handle_help": "Lowercase letters, numbers, - _ only. 3–30 chars.",
    "display_name": "Display name",
    "bio": "Bio",
    "bio_placeholder": "A short intro",
    "avatar": "Profile image",
    "workspace_title": "Create your workspace",
    "workspace_sub": "Invite your team and manage projects",
    "workspace_name": "Workspace name",
    "workspace_name_ph": "e.g., Concrete Works",
    "workspace_slug": "URL",
    "workspace_slug_help": "studio.yagiworkshop.xyz/w/",
    "workspace_logo": "Logo (optional)",
    "brand_title": "Add your first brand?",
    "brand_sub": "Only if you run multiple brands",
    "brand_name": "Brand name",
    "brand_name_ph": "e.g., CGP",
    "invite_title": "Invite your team",
    "invite_sub": "Now or later in settings",
    "invite_email": "Email address",
    "invite_add": "Add",
    "invite_send": "Send invitations",
    "done": "Get started"
  },
  "nav": {
    "projects": "Projects",
    "storyboards": "Storyboards",
    "brands": "Brands",
    "team": "Team",
    "billing": "Billing",
    "settings": "Settings",
    "admin": "YAGI Admin"
  },
  "dashboard": {
    "empty_title": "No active projects yet",
    "empty_sub": "Start your first project",
    "new_project": "New project",
    "direct_tab": "Direct commission",
    "contest_tab": "Contest brief",
    "coming_soon": "Coming in next phase"
  },
  "workspace": {
    "current": "Current workspace",
    "switch": "Switch workspace",
    "no_workspace": "No workspace"
  },
  "invite": {
    "pending": "Pending",
    "accepted": "Accepted",
    "expired": "Expired"
  }
}
```

## Acceptance criteria

- [ ] `messages/ko.json` is valid JSON with the exact content above
- [ ] `messages/en.json` is valid JSON with the exact content above
- [ ] Both files contain top-level keys: brand, home, common, auth, onboarding, nav, dashboard, workspace, invite
- [ ] `jq . messages/ko.json > /dev/null` succeeds (no parse error)
- [ ] `jq . messages/en.json > /dev/null` succeeds
- [ ] `npx tsc --noEmit` still passes

## Write result to `.yagi-autobuild/results/06_messages_i18n.md`

Standard format.

## Notes for executor
- Use Write tool (these are full overwrites).
- Preserve the literal Korean characters (UTF-8) in ko.json.
- Do not touch any other files.
