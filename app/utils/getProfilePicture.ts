interface UserData {
  id: number;
  username: string;
  scratchteam: boolean;
  history: {
    joined: string;
  };
  profile: {
    id: number;
    images: {
      "90x90": string;
      "60x60": string;
      "55x55": string;
      "50x50": string;
      "32x32": string;
    };
    status: string;
    bio: string;
    country: string;
  };
}

export const getProfilePicture = async (username: string | undefined) => {
  if (!username) return null;

  const data = await $fetch<UserData>(
    `https://trampoline.turbowarp.org/api/users/${username}`,
  );

  return data.profile.images["90x90"];
};
