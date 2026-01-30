export interface TutorialStep {
  id: string;
  route?: string;
  targetSelector?: string;
  title: string;
  body: string | string[];
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  isTipsScreen?: boolean;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: "Welcome to Music Exclusive ✨",
    body: "Let's get you set up in 60 seconds—upload your first track, polish your profile, and learn how to earn.",
    placement: 'center',
  },
  {
    id: 'upload-button',
    route: '/artist/dashboard',
    targetSelector: '[data-tutorial="upload-button"]',
    title: "Upload a Track 🎵",
    body: "Tap Upload to add your cover art + full track. Tip: keep cover art under the max size so it saves instantly.",
    placement: 'bottom',
  },
  {
    id: 'songs-list',
    route: '/artist/dashboard',
    targetSelector: '[data-tutorial="songs-list"]',
    title: "Manage Your Releases",
    body: "Your uploaded tracks appear here. Use View to preview, Hook to upload a 15s preview, and Delete if needed.",
    placement: 'top',
  },
  {
    id: 'profile-tab',
    route: '/artist/dashboard',
    targetSelector: '[data-tutorial="profile-tab"]',
    title: "Edit Your Artist Profile",
    body: "Update your artist photo, bio, genre, and social links—fans will see this first.",
    placement: 'top',
  },
  {
    id: 'profile-photo',
    route: '/artist/profile/edit',
    targetSelector: '[data-tutorial="avatar-upload"]',
    title: "Upload Your Artist Photo 📸",
    body: "Choose a smaller JPG/PNG for fastest upload. This photo shows across your artist page.",
    placement: 'bottom',
  },
  {
    id: 'earnings-tab',
    route: '/artist/profile/edit',
    targetSelector: '[data-tutorial="earnings-tab"]',
    title: "Track Your Earnings 💰",
    body: "See payouts, weekly transparency reports, and your total earnings—updated as fans stream.",
    placement: 'top',
  },
  {
    id: 'earnings-overview',
    route: '/artist/earnings',
    targetSelector: '[data-tutorial="earnings-cards"]',
    title: "Total Payouts",
    body: "This is what you've earned overall. You'll also see Pending vs Paid and your payout history.",
    placement: 'bottom',
  },
  {
    id: 'weekly-report',
    route: '/artist/earnings',
    targetSelector: '[data-tutorial="weekly-report"]',
    title: "Weekly Transparency 📊",
    body: "Each week you'll see streams, credits earned, payout calculations, and platform fee breakdown.",
    placement: 'top',
  },
  {
    id: 'marketing-tips',
    title: "How to Convert Social Fans 🚀",
    body: [
      "Post a 10s hook preview + caption: 'Full song is exclusive on Music Exclusive.'",
      "Pin your Music Exclusive link to IG bio + TikTok profile.",
      "Use Story countdown: 'Exclusive drop in the Vault—first listeners get perks.'",
      "Go Live: Play 15 seconds, then tell them where to stream the full track.",
      "DM your top supporters: 'Want early access? I'm sending invites.'",
      "Create a weekly 'Vault Drop Friday' routine so fans expect it.",
    ],
    placement: 'center',
    isTipsScreen: true,
  },
  {
    id: 'invite-tips',
    title: "Invite Giveaway Ideas 🎁",
    body: [
      "First 25 commenters get a Vault invite",
      "Invite codes to email list subscribers",
      "'Share to story' giveaway: repost + tag you",
      "Superfan shoutouts + early access",
      "Street team: reward 5 fans who bring 3 friends",
      "QR code at shows: scan to join the Vault",
    ],
    placement: 'center',
    isTipsScreen: true,
  },
  {
    id: 'finish',
    title: "You're Ready! 🎧",
    body: "Upload your next track, keep your profile fresh, and use invites to grow your listener base.",
    placement: 'center',
  },
];
