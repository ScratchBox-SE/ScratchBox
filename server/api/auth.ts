import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  const verification = await $fetch(
    `https://auth.itinerary.eu.org/api/auth/verifyToken?privateCode=${
      getQuery(event).privateCode
    }`,
  ) as unknown as {
    valid: true | false;
    username: string;
    type?: "instant";
    redirect: string;
    oneClickSignInToken?: string;
    instantPrivateCode?: string;
  };
  if (verification.valid === true) {
    setCookie(
      event,
      "SB_TOKEN",
      jwt.sign(
        { username: verification.username },
        useRuntimeConfig().jwtSecret,
        { expiresIn: "14d" },
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1209600, // 14 days
      },
    );
  }
  sendRedirect(event, "/postauth", 303);
});
