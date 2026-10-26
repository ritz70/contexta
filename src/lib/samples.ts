// Sample drafts for the "Load sample draft" feature
// Each deliberately triggers a realistic mix of hard, soft and AI flags

export interface SampleDraft {
  title: string;
  channelSlug: string;
  content: string;
}

export const sampleDrafts: SampleDraft[] = [
  {
    title: 'NimbusPay Smart Pots Launch',
    channelSlug: 'press-release',
    content: `FOR IMMEDIATE RELEASE

Nimbus Pay launches world-class savings pots with guaranteed returns

MUMBAI — Nimbus Pay today announced Smart Pots, a revolutionary way for users to grow their money. We're super excited to share that early customers are already seeing great results!! With Smart Pots there is zero risk, and every user gets the best rates in the industry.

"We're gonna change how India saves," said the CEO. For more information, contact press@nimbuspay.com.`,
  },
  {
    title: 'Important Information — NimbusPay',
    channelSlug: 'legal-disclosure',
    content: `Important information

Nimbus Pay Ltd is authorised and regulated to provide payment services. Investments can go up and down in value, so you could get back less than you put in. We guarantee that your money is safe with us. Our users are protected by industry-leading security.`,
  },
  {
    title: '5 Ways to Make Your Savings Work Harder',
    channelSlug: 'blog',
    content: `5 ways to make your savings work harder

Let's be real: most of us don't think about our savings until something goes wrong. At Nimbus Pay we think that's backwards. Our users tell us Smart Pots are the easiest way to set money aside, and honestly it's the #1 savings tool out there! 😍🚀✨

Here are our top tips: automate a small transfer every payday, name your pots after real goals, and review monthly. Stuff like this adds up. Start today and watch your money grow with no risk.`,
  },
  {
    title: 'Smart Pots promo',
    channelSlug: 'social-post',
    content: `Gonna be honest, Smart Pots are literally the best savings feature in the world 🔥🔥🔥 users love it!!! Try it free today! It's totally risk-free. #NimbusPay #savings`,
  },
];
