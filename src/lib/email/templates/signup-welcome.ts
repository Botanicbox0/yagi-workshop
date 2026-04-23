// Signup welcome email template — Phase 2.5 G2 onboarding.
//
// Plain-HTML format (no MJML/React Email assumption). Builder substitutes
// {{handle}}, {{display_name}} at send time using the existing Resend
// dispatch layer (Phase 1.8).
//
// Tone: creator-centric per G3 Decision Package §0 vocabulary mapping.
// Subject + body in Korean only (Phase 2.5 §0 non-goals: Korean only).

export type WelcomeEmailContext = {
  handle: string;
  display_name: string;
  role: "creator" | "studio" | "observer";
};

export function welcomeEmailSubject(ctx: WelcomeEmailContext): string {
  switch (ctx.role) {
    case "creator":
      return `${ctx.display_name}님, AI 창작자 무대에 오신 것을 환영합니다`;
    case "studio":
      return `${ctx.display_name}님, YAGI 스튜디오 파트너로 등록되었습니다`;
    case "observer":
      return `YAGI 챌린지에 오신 것을 환영합니다`;
  }
}

export function welcomeEmailBody(ctx: WelcomeEmailContext): string {
  const profileLink = `https://yagiworkshop.xyz/u/${ctx.handle}`;

  switch (ctx.role) {
    case "creator":
      return `
<p>안녕하세요, ${ctx.display_name}님.</p>
<p>YAGI는 AI 창작자가 작품을 올리고 인정받는 무대입니다.</p>
<p>참여 가능한 챌린지를 둘러보거나, 본인의 프로필을 다듬어보세요.</p>
<p>
  <a href="${profileLink}">${profileLink}</a><br/>
  <a href="https://yagiworkshop.xyz/challenges">진행 중인 챌린지</a>
</p>
<p>
  궁금한 점이 있으면 hello@yagiworkshop.xyz로 답장해주세요.
</p>
<p>야기워크숍 드림</p>
`.trim();

    case "studio":
      return `
<p>안녕하세요, ${ctx.display_name}님.</p>
<p>YAGI 스튜디오 파트너로 등록되었습니다.</p>
<p>스튜디오 단위로 챌린지에 참여하거나, 클라이언트 프로젝트를 운영할 수 있습니다.</p>
<p>
  <a href="${profileLink}">스튜디오 프로필</a><br/>
  <a href="https://yagiworkshop.xyz/challenges">진행 중인 챌린지</a>
</p>
<p>
  비즈니스 협업 문의: hello@yagiworkshop.xyz
</p>
<p>야기워크숍 드림</p>
`.trim();

    case "observer":
      return `
<p>안녕하세요.</p>
<p>YAGI 챌린지를 둘러보고, 마음에 드는 작품에 응원을 보내실 수 있습니다.</p>
<p>
  <a href="https://yagiworkshop.xyz/challenges">진행 중인 챌린지</a>
</p>
<p>
  창작자로 참여하고 싶으시면 언제든 프로필 설정에서 역할을 변경할 수 있습니다.
</p>
<p>야기워크숍 드림</p>
`.trim();
  }
}
